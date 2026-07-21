"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch, ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useClub } from "@/lib/club-context";
import type { ConvocatoriaItem, Partido, PlantillaItem, PosicionJugador } from "@/lib/types";

export type FilaConvocatoria = {
  jugador_id: string;
  nombre: string;
  apellidos: string;
  foto_url: string | null;
  dorsal: number | null;
  posicion_principal: ConvocatoriaItem["posicion_principal"];
  disponible: boolean;
  es_portero: boolean;
  titular: boolean;
  disponible_para_jugar: boolean;
};

const ESTADOS_BLOQUEADOS = ["FINALIZADO", "CANCELADO"];

/**
 * Lógica de datos de la convocatoria, independiente de cómo se presente
 * (página completa en Club Manager o popup en Match Live) — evita duplicar
 * la carga/validación/guardado entre las dos superficies.
 */
export function useConvocatoria(partidoId: string) {
  const { club, role, loading: clubLoading } = useClub();
  const clubId = club?.id;
  const canManage = role === "GESTOR_CLUB" || role === "ENTRENADOR" || role === "AYUDANTE";

  const [partido, setPartido] = useState<Partido | null>(null);
  const [filas, setFilas] = useState<FilaConvocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroPosicion, setFiltroPosicion] = useState<PosicionJugador | "">("");

  const bloqueada = partido ? ESTADOS_BLOQUEADOS.includes(partido.estado) : false;
  const puedeEditar = canManage && !bloqueada;

  const load = useCallback(async () => {
    if (!clubId) return;
    const p = await apiFetch<Partido>(`/clubes/${clubId}/partidos/${partidoId}`, {
      token: getToken(),
    });
    const [plantilla, convocatoria] = await Promise.all([
      apiFetch<PlantillaItem[]>(`/clubes/${clubId}/equipos/${p.equipo_id}/jugadores`, {
        token: getToken(),
      }),
      apiFetch<ConvocatoriaItem[]>(`/clubes/${clubId}/partidos/${partidoId}/convocatoria`, {
        token: getToken(),
      }),
    ]);
    const porJugador = new Map(convocatoria.map((c) => [c.jugador_id, c]));
    const merged: FilaConvocatoria[] = plantilla.map(({ asignacion, jugador }) => {
      const existente = porJugador.get(jugador.id);
      return {
        jugador_id: jugador.id,
        nombre: jugador.nombre,
        apellidos: jugador.apellidos,
        foto_url: jugador.foto_url,
        dorsal: existente?.dorsal ?? asignacion.dorsal,
        posicion_principal: jugador.posicion_principal,
        // Una baja de larga duración nunca puede quedar convocada, aunque hubiera
        // una fila guardada previamente con disponible=true (se fuerza a false).
        disponible: asignacion.disponible_para_jugar ? (existente?.disponible ?? true) : false,
        es_portero: existente?.es_portero ?? false,
        titular: existente?.titular ?? false,
        disponible_para_jugar: asignacion.disponible_para_jugar,
      };
    });
    merged.sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
    setPartido(p);
    setFilas(merged);
  }, [clubId, partidoId]);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error al cargar la convocatoria");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId, load]);

  const resumen = useMemo(() => {
    const disponibles = filas.filter((f) => f.disponible);
    return {
      disponibles: disponibles.length,
      total: filas.length,
      porteros: disponibles.filter((f) => f.es_portero).length,
      titulares: disponibles.filter((f) => f.titular).length,
    };
  }, [filas]);

  const dorsalesDuplicados = useMemo(() => {
    const conteo = new Map<number, number>();
    for (const f of filas) {
      if (!f.disponible || f.dorsal == null) continue;
      conteo.set(f.dorsal, (conteo.get(f.dorsal) ?? 0) + 1);
    }
    return new Set([...conteo.entries()].filter(([, n]) => n > 1).map(([dorsal]) => dorsal));
  }, [filas]);

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      if (filtroPosicion && f.posicion_principal !== filtroPosicion) return false;
      if (!q) return true;
      const nombreCompleto = `${f.nombre} ${f.apellidos}`.toLowerCase();
      const dorsalTexto = f.dorsal != null ? String(f.dorsal) : "";
      return nombreCompleto.includes(q) || dorsalTexto === q;
    });
  }, [filas, busqueda, filtroPosicion]);

  function actualizarFila(jugadorId: string, cambios: Partial<FilaConvocatoria>) {
    setGuardado(false);
    setFilas((prev) => prev.map((f) => (f.jugador_id === jugadorId ? { ...f, ...cambios } : f)));
  }

  function toggleDisponible(f: FilaConvocatoria) {
    if (!f.disponible_para_jugar) return;
    actualizarFila(f.jugador_id, {
      disponible: !f.disponible,
      es_portero: !f.disponible ? f.es_portero : false,
      titular: !f.disponible ? f.titular : false,
    });
  }

  function togglePortero(f: FilaConvocatoria) {
    actualizarFila(f.jugador_id, { es_portero: !f.es_portero });
  }

  function toggleTitular(f: FilaConvocatoria) {
    actualizarFila(f.jugador_id, { titular: !f.titular });
  }

  function cambiarDorsal(jugadorId: string, valor: string) {
    const num = valor === "" ? null : Number(valor);
    actualizarFila(jugadorId, { dorsal: num != null && Number.isFinite(num) ? num : null });
  }

  async function guardar(): Promise<boolean> {
    if (!clubId || dorsalesDuplicados.size > 0) return false;
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/clubes/${clubId}/partidos/${partidoId}/convocatoria`, {
        method: "PUT",
        token: getToken(),
        body: filas.map((f) => ({
          jugador_id: f.jugador_id,
          disponible: f.disponible,
          es_portero: f.es_portero,
          titular: f.titular,
          dorsal: f.dorsal,
        })),
      });
      setGuardado(true);
      return true;
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : "No se pudo guardar la convocatoria",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  return {
    partido,
    filas,
    filasFiltradas,
    loading: clubLoading || loading,
    error,
    saving,
    guardado,
    busqueda,
    setBusqueda,
    filtroPosicion,
    setFiltroPosicion,
    resumen,
    dorsalesDuplicados,
    bloqueada,
    puedeEditar,
    toggleDisponible,
    togglePortero,
    toggleTitular,
    cambiarDorsal,
    guardar,
    reload: load,
  };
}
