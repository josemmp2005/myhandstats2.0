"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { ConvocatoriaPopup } from "@/components/convocatoria-popup";
import { GoalTargetSelector } from "@/components/goal-target-selector";
import { HandballCourtSelector, type CourtPoint } from "@/components/handball-court-selector";
import { CourtHeatmap, GoalHeatmap, type HeatPoint } from "@/components/mini-heatmap";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useClub } from "@/lib/club-context";
import type {
  ConvocatoriaItem,
  Equipo,
  EventoCreate,
  EventoLiveResponse,
  EventoPartido,
  FaseJuego,
  Partido,
  PeriodoPartido,
  SistemaDefensa,
  SituacionNumerica,
  ZonaCampo,
  ZonaPorteria,
} from "@/lib/types";

const COLOR = {
  purple: "#7c3aed",
  purpleSoft: "#ede9fe",
  lime: "#65a30d",
  coral: "#e11d48",
  slate: "#94a3b8",
  slateLight: "#e2e8f0",
};

const DOS_MINUTOS_MS = 2 * 60 * 1000;

/* --------------------------- Paneles tácticos (mockup) --------------------------- */

type Grupo = "Ataque" | "Defensa" | "Repliegue" | "Contraataque";

type Panel = {
  grupo: Grupo;
  origen: "EQUIPO_PROPIO" | "RIVAL";
  botones: string[];
};

const PANELES: Panel[] = [
  { grupo: "Ataque", origen: "EQUIPO_PROPIO", botones: ["6-0", "5-1", "Inferioridad", "Superioridad"] },
  { grupo: "Defensa", origen: "RIVAL", botones: ["6-0", "5-1", "Inferioridad", "Superioridad"] },
  { grupo: "Repliegue", origen: "RIVAL", botones: ["1ª Oleada", "2ª Oleada", "Saque Rápido"] },
  { grupo: "Contraataque", origen: "EQUIPO_PROPIO", botones: ["1ª Oleada", "2ª Oleada", "Saque Rápido"] },
];

/**
 * Traduce el botón táctico del mockup (6-0 / 5-1 / Inferioridad / Superioridad /
 * oleadas) a los enums reales del backend. Es una interpretación razonable, no
 * un mapeo oficial — los nombres de los botones no corresponden 1:1 a un único
 * enum, así que se combina fase_juego + sistema_defensa + situacion_numerica.
 */
function contextoTactico(grupo: Grupo, boton: string): Partial<EventoCreate> {
  const sistemaDefensa: Record<string, SistemaDefensa> = { "6-0": "SEIS_CERO", "5-1": "CINCO_UNO" };
  if (grupo === "Ataque") {
    if (boton in sistemaDefensa) {
      return { fase: "ATAQUE_POSICIONAL" as FaseJuego, sistema_defensa: sistemaDefensa[boton] };
    }
    if (boton === "Superioridad") {
      return { fase: "ATAQUE_SUPERIORIDAD" as FaseJuego, situacion_numerica: "SEIS_VS_CINCO" as SituacionNumerica };
    }
    return { fase: "ATAQUE_INFERIORIDAD" as FaseJuego, situacion_numerica: "CINCO_VS_SEIS" as SituacionNumerica };
  }
  if (grupo === "Defensa") {
    if (boton in sistemaDefensa) {
      return { fase: "DEFENSA_POSICIONAL" as FaseJuego, sistema_defensa: sistemaDefensa[boton] };
    }
    if (boton === "Superioridad") {
      return { fase: "DEFENSA_SUPERIORIDAD" as FaseJuego, situacion_numerica: "SEIS_VS_CINCO" as SituacionNumerica };
    }
    return { fase: "DEFENSA_INFERIORIDAD" as FaseJuego, situacion_numerica: "CINCO_VS_SEIS" as SituacionNumerica };
  }
  if (grupo === "Contraataque") {
    if (boton === "1ª Oleada") return { fase: "CONTRAATAQUE_PRIMERA_OLEADA" as FaseJuego };
    if (boton === "2ª Oleada") return { fase: "CONTRAATAQUE_SEGUNDA_OLEADA" as FaseJuego };
    return { fase: "SAQUE_CENTRO_RAPIDO" as FaseJuego };
  }
  // Repliegue: no hay un valor de fase específico para "recuperación defensiva
  // por oleadas" en el schema — se usa TRANSICION_DEFENSIVA y se guarda el
  // matiz (oleada 1/2/saque rápido) en subtipo.
  return { fase: "TRANSICION_DEFENSIVA" as FaseJuego, subtipo: boton };
}

type TipoAccion = "GOL" | "FALLO" | "PERDIDA" | "AMONESTACION";

const ACCIONES: { key: TipoAccion; label: string }[] = [
  { key: "GOL", label: "Gol" },
  { key: "FALLO", label: "Lanzamiento Fallado" },
  { key: "PERDIDA", label: "Pérdida De Balón" },
  { key: "AMONESTACION", label: "Amonestación" },
];

const DISTANCIAS: { key: string; label: string; zona: ZonaCampo }[] = [
  { key: "7m", label: "7m", zona: "SIETE_METROS" },
  { key: "6m", label: "6m", zona: "CENTRO_6M" },
  { key: "9m", label: "9m", zona: "CENTRAL_9M" },
  { key: "EXT_IZQ", label: "Ext. izq.", zona: "EXTREMO_IZQUIERDO" },
  { key: "EXT_DER", label: "Ext. der.", zona: "EXTREMO_DERECHO" },
  { key: "PIVOTE", label: "Pivote", zona: "ZONA_PIVOTE" },
];

const ZONA_CAMPO_LABEL: Partial<Record<ZonaCampo, string>> = {
  SIETE_METROS: "7m",
  CENTRO_6M: "6m",
  CENTRAL_9M: "9m",
  EXTREMO_IZQUIERDO: "Ext. izq.",
  EXTREMO_DERECHO: "Ext. der.",
  ZONA_PIVOTE: "Pivote",
};
const ORDEN_ZONA_CAMPO: ZonaCampo[] = [
  "SIETE_METROS",
  "CENTRO_6M",
  "CENTRAL_9M",
  "EXTREMO_IZQUIERDO",
  "EXTREMO_DERECHO",
  "ZONA_PIVOTE",
];

const ZONA_PORTERIA_PUNTO: Record<ZonaPorteria, CourtPoint> = {
  ALTA_IZQUIERDA: { x: 25, y: 20 },
  ALTA_CENTRO: { x: 50, y: 20 },
  ALTA_DERECHA: { x: 75, y: 20 },
  MEDIA_IZQUIERDA: { x: 25, y: 50 },
  MEDIA_CENTRO: { x: 50, y: 50 },
  MEDIA_DERECHA: { x: 75, y: 50 },
  BAJA_IZQUIERDA: { x: 25, y: 80 },
  BAJA_CENTRO: { x: 50, y: 80 },
  BAJA_DERECHA: { x: 75, y: 80 },
};

const SUBTIPOS_PERDIDA = ["Pase", "Recepción", "Pasos", "Dobles", "Otra"];

type TipoSancion = "DOS_MINUTOS" | "TARJETA_AMARILLA" | "TARJETA_ROJA" | "TARJETA_AZUL";

const SANCIONES: { key: TipoSancion; label: string; color: string }[] = [
  { key: "DOS_MINUTOS", label: "2 minutos", color: "bg-slate-400" },
  { key: "TARJETA_AMARILLA", label: "Amarilla", color: "bg-yellow-400" },
  { key: "TARJETA_ROJA", label: "Roja", color: "bg-red-600" },
  { key: "TARJETA_AZUL", label: "Azul", color: "bg-blue-600" },
];

/** Requiere seleccionar un jugador salvo la amonestación al rival (jugador rival no trackeado). */
function requiereJugador(panel: Panel, accion: TipoAccion): boolean {
  return !(accion === "AMONESTACION" && panel.origen === "RIVAL");
}

/** Si la acción representa a nuestro portero (gol recibido / parada), solo se listan porteros. */
function esAccionPortero(panel: Panel, accion: TipoAccion): boolean {
  return panel.origen === "RIVAL" && (accion === "GOL" || accion === "FALLO");
}

function candidatosJugador(
  panel: Panel,
  accion: TipoAccion,
  convocatoria: ConvocatoriaItem[],
): ConvocatoriaItem[] {
  const disponibles = convocatoria.filter((j) => j.disponible);
  if (esAccionPortero(panel, accion)) return disponibles.filter((j) => j.es_portero);
  // Las amonestaciones (2'/tarjetas) son sobre jugadores de campo: los porteros no se listan.
  if (accion === "AMONESTACION") return disponibles.filter((j) => !j.es_portero);
  return disponibles;
}

function construirPayload(params: {
  panel: Panel;
  boton: string;
  accion: TipoAccion;
  jugadorId: string | null;
  zonaPorteria: ZonaPorteria | null;
  zonaCampo: ZonaCampo | null;
  campoPoint: CourtPoint | null;
  subtipoPerdida: string | null;
  sancion: TipoSancion | null;
  periodo: PeriodoPartido;
  tiempoMs: number;
}): EventoCreate {
  const { panel, boton, accion, jugadorId, zonaPorteria, zonaCampo, campoPoint, subtipoPerdida, sancion, periodo, tiempoMs } = params;
  const ctx = contextoTactico(panel.grupo, boton);
  const base = { origen: panel.origen, periodo, tiempo_ms: tiempoMs, ...ctx };
  const campo = { campo_x: campoPoint?.x ?? null, campo_y: campoPoint?.y ?? null };

  if (accion === "GOL") {
    const detalle = { zona_porteria: zonaPorteria, zona_campo: zonaCampo, ...campo };
    if (panel.origen === "EQUIPO_PROPIO") {
      return { ...base, tipo: "LANZAMIENTO", resultado_lanzamiento: "GOL", resultado: "EXITO", jugador_id: jugadorId, ...detalle };
    }
    return { ...base, tipo: "LANZAMIENTO", resultado_lanzamiento: "GOL", resultado: "FALLO", portero_id: jugadorId, ...detalle };
  }
  if (accion === "FALLO") {
    const detalle = { zona_campo: zonaCampo, ...campo };
    if (panel.origen === "EQUIPO_PROPIO") {
      return { ...base, tipo: "LANZAMIENTO", resultado_lanzamiento: "FUERA", resultado: "FALLO", jugador_id: jugadorId, ...detalle };
    }
    return { ...base, tipo: "LANZAMIENTO", resultado_lanzamiento: "PARADA", resultado: "EXITO", portero_id: jugadorId, ...detalle };
  }
  if (accion === "PERDIDA") {
    if (panel.origen === "EQUIPO_PROPIO") {
      return { ...base, tipo: "PERDIDA", resultado: "FALLO", jugador_id: jugadorId, subtipo: subtipoPerdida };
    }
    // "Pérdida" con el panel de Defensa/Repliegue activo = robo nuestro.
    return { ...base, origen: "EQUIPO_PROPIO", tipo: "ROBO", resultado: "EXITO", jugador_id: jugadorId };
  }
  // AMONESTACION
  const tipoSancion = sancion ?? "DOS_MINUTOS";
  if (panel.origen === "EQUIPO_PROPIO") {
    return { ...base, tipo: tipoSancion, resultado: "NEUTRO", jugador_id: jugadorId };
  }
  return { ...base, tipo: tipoSancion, resultado: "NEUTRO" };
}

/* --------------------------------- Página --------------------------------- */

export default function LiveMatchPage() {
  const params = useParams<{ partidoId: string }>();
  const partidoId = params.partidoId;
  const { club, loading: clubLoading } = useClub();
  const clubId = club?.id;

  const [partido, setPartido] = useState<Partido | null>(null);
  const [equipoNombre, setEquipoNombre] = useState<string>("");
  const [convocatoria, setConvocatoria] = useState<ConvocatoriaItem[]>([]);
  const [eventos, setEventos] = useState<EventoPartido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [periodoActual, setPeriodoActual] = useState<PeriodoPartido>("PRIMERA_PARTE");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);

  const [modalCtx, setModalCtx] = useState<{ panel: Panel; boton: string } | null>(null);
  const [vista, setVista] = useState<"captura" | "estadisticas">("captura");
  const [showConvocatoria, setShowConvocatoria] = useState(false);

  const recargarEventos = useCallback(async () => {
    if (!clubId) return;
    const data = await apiFetch<EventoPartido[]>(`/clubes/${clubId}/partidos/${partidoId}/eventos`, {
      token: getToken(),
    });
    setEventos(data);
  }, [clubId, partidoId]);

  const recargarConvocatoria = useCallback(async () => {
    if (!clubId) return;
    const data = await apiFetch<ConvocatoriaItem[]>(
      `/clubes/${clubId}/partidos/${partidoId}/convocatoria`,
      { token: getToken() },
    );
    setConvocatoria(data);
  }, [clubId, partidoId]);

  const recargarPartido = useCallback(async () => {
    if (!clubId) return;
    const data = await apiFetch<Partido>(`/clubes/${clubId}/partidos/${partidoId}`, { token: getToken() });
    setPartido(data);
  }, [clubId, partidoId]);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [p, conv] = await Promise.all([
          apiFetch<Partido>(`/clubes/${clubId}/partidos/${partidoId}`, { token: getToken() }),
          apiFetch<ConvocatoriaItem[]>(`/clubes/${clubId}/partidos/${partidoId}/convocatoria`, {
            token: getToken(),
          }),
        ]);
        if (cancelled) return;
        setPartido(p);
        setConvocatoria(conv);
        apiFetch<Equipo>(`/clubes/${clubId}/equipos/${p.equipo_id}`, { token: getToken() })
          .then((eq) => {
            if (!cancelled) setEquipoNombre(eq.nombre);
          })
          .catch(() => {});
        await recargarEventos();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar el partido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, partidoId]);

  // Reloj: avanza cada segundo mientras "running" esté activo.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsedMs((v) => v + 1000), 1000);
    return () => clearInterval(id);
  }, [running]);

  const postEvento = useCallback(
    async (payload: EventoCreate) => {
      if (!clubId) return null;
      const res = await apiFetch<EventoLiveResponse>(
        `/clubes/${clubId}/partidos/${partidoId}/livematch/eventos`,
        { method: "POST", token: getToken(), body: payload },
      );
      setPartido((p) => (p ? { ...p, goles_equipo: res.goles_equipo, goles_rival: res.goles_rival } : p));
      await recargarEventos();
      return res;
    },
    [clubId, partidoId, recargarEventos],
  );

  async function iniciarPartido() {
    if (!clubId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/clubes/${clubId}/partidos/${partidoId}/livematch/estado`, {
        method: "PATCH",
        token: getToken(),
        body: { estado: "EN_DIRECTO" },
      });
      await postEvento({ origen: "EQUIPO_PROPIO", periodo: "PRIMERA_PARTE", tiempo_ms: 0, tipo: "INICIO_PARTIDO" });
      setPartido((p) => (p ? { ...p, estado: "EN_DIRECTO" } : p));
      setPeriodoActual("PRIMERA_PARTE");
      setElapsedMs(0);
      setRunning(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el partido");
    } finally {
      setBusy(false);
    }
  }

  async function cambiarPeriodo(nuevo: PeriodoPartido) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setRunning(false);
      await postEvento({ origen: "EQUIPO_PROPIO", periodo: periodoActual, tiempo_ms: elapsedMs, tipo: "FIN_PERIODO" });
      await postEvento({ origen: "EQUIPO_PROPIO", periodo: nuevo, tiempo_ms: 0, tipo: "INICIO_PERIODO" });
      setPeriodoActual(nuevo);
      setElapsedMs(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar de periodo");
    } finally {
      setBusy(false);
    }
  }

  async function finalizarPartido() {
    if (!clubId || busy) return;
    if (!window.confirm("¿Finalizar el partido?")) return;
    setBusy(true);
    setError(null);
    try {
      setRunning(false);
      await postEvento({ origen: "EQUIPO_PROPIO", periodo: periodoActual, tiempo_ms: elapsedMs, tipo: "FIN_PARTIDO" });
      await apiFetch(`/clubes/${clubId}/partidos/${partidoId}/livematch/estado`, {
        method: "PATCH",
        token: getToken(),
        body: { estado: "FINALIZADO" },
      });
      setPartido((p) => (p ? { ...p, estado: "FINALIZADO" } : p));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo finalizar el partido");
    } finally {
      setBusy(false);
    }
  }

  async function deshacerUltima() {
    if (!clubId || busy || eventos.length === 0) return;
    const ultimo = eventos[eventos.length - 1];
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/clubes/${clubId}/partidos/${partidoId}/livematch/eventos/${ultimo.id}`, {
        method: "DELETE",
        token: getToken(),
      });
      await Promise.all([recargarPartido(), recargarEventos()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo deshacer");
    } finally {
      setBusy(false);
    }
  }

  async function confirmarAccion(payload: EventoCreate) {
    setBusy(true);
    setError(null);
    try {
      await postEvento(payload);
      setModalCtx(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la acción");
    } finally {
      setBusy(false);
    }
  }

  const stats = useMemo(() => calcularQuickStats(eventos, periodoActual, elapsedMs), [eventos, periodoActual, elapsedMs]);
  const estadisticasCompletas = useMemo(() => calcularEstadisticasCompletas(eventos), [eventos]);

  if (clubLoading || loading || !partido) {
    return <div className="grid min-h-screen place-items-center text-slate-500">Cargando…</div>;
  }

  const nombreEquipoPropio = equipoNombre || "Nuestro equipo";
  const esVisitante = partido.tipo_localizacion === "VISITANTE";
  const nombreLocal = esVisitante ? partido.rival_nombre : nombreEquipoPropio;
  const nombreVisitante = esVisitante ? nombreEquipoPropio : partido.rival_nombre;
  const golesLocal = esVisitante ? partido.goles_rival : partido.goles_equipo;
  const golesVisitante = esVisitante ? partido.goles_equipo : partido.goles_rival;

  if (partido.estado === "PROGRAMADO") {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-slate-500">
            {nombreEquipoPropio} vs {partido.rival_nombre}
          </p>
          <h1 className="mt-1 text-2xl font-bold">Partido todavía no iniciado</h1>
          {convocatoria.length === 0 && (
            <p className="mt-2 text-sm text-red-600">
              Este partido no tiene convocatoria todavía.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowConvocatoria(true)}
              className="rounded-xl border border-purple-200 px-6 py-3 font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50"
            >
              Convocatoria
            </button>
            <button
              onClick={iniciarPartido}
              disabled={busy || convocatoria.length === 0}
              className="rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
            >
              {busy ? "Iniciando…" : "Iniciar partido"}
            </button>
          </div>
          <div className="mt-4">
            <Link href="/live" className="text-sm text-slate-500 hover:text-slate-700">
              ← Elegir otro partido
            </Link>
          </div>
        </div>

        {showConvocatoria && (
          <ConvocatoriaPopup
            partidoId={partidoId}
            onClose={() => setShowConvocatoria(false)}
            onSaved={recargarConvocatoria}
          />
        )}
      </main>
    );
  }

  if (partido.estado === "FINALIZADO" || partido.estado === "CANCELADO") {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">
            Partido {partido.estado === "FINALIZADO" ? "finalizado" : "cancelado"}
          </h1>
          <p className="mt-2 text-slate-500">
            {nombreLocal} {golesLocal} – {golesVisitante} {nombreVisitante}
          </p>
          <Link href="/live" className="mt-6 inline-block text-sm text-purple-600 hover:underline">
            ← Elegir otro partido
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Cabecera: marcador, periodo, reloj */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
        <div className="text-2xl font-bold">
          {nombreLocal} <span className="tabular-nums">{golesLocal}</span>
          {" - "}
          <span className="tabular-nums">{golesVisitante}</span> {nombreVisitante}
        </div>
        <div className="flex items-center gap-4">
          <select
            value={periodoActual}
            onChange={(e) => cambiarPeriodo(e.target.value as PeriodoPartido)}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium text-slate-700"
          >
            <option value="PRIMERA_PARTE">1ª Parte</option>
            <option value="SEGUNDA_PARTE">2ª Parte</option>
            <option value="PRORROGA_1">Prórroga 1</option>
            <option value="PRORROGA_2">Prórroga 2</option>
            <option value="PENALTIS">Penaltis</option>
          </select>
          <span className="w-16 text-center text-xl font-semibold tabular-nums">{formatMs(elapsedMs)}</span>
          <button
            onClick={() => setRunning((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full text-purple-600 hover:bg-purple-50"
            aria-label={running ? "Pausar" : "Reanudar"}
          >
            {running ? "⏸" : "▶"}
          </button>
          <button
            onClick={deshacerUltima}
            disabled={busy || eventos.length === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Deshacer
          </button>
          <button
            onClick={finalizarPartido}
            disabled={busy}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Finalizar
          </button>
        </div>
      </header>

      {error && (
        <p className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {vista === "captura" ? (
        <div className="grid flex-1 grid-cols-1 gap-4 p-4 pb-24 lg:grid-rows-1 lg:grid-cols-[3fr_2fr]">
          <section className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:h-full">
            <h2 className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Seleccionar acción
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex-1 lg:grid-rows-2">
              {PANELES.map((panel) => (
                <PanelCard
                  key={panel.grupo}
                  panel={panel}
                  onBoton={(boton) => setModalCtx({ panel, boton })}
                />
              ))}
            </div>
          </section>
          <QuickStatsPanel stats={stats} eventos={eventos} />
        </div>
      ) : (
        <div className="flex-1 p-4 pb-24">
          <EstadisticasLiveTab stats={estadisticasCompletas} />
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
        <TabButton
          active={vista === "captura"}
          onClick={() => setVista("captura")}
          icon="🎯"
          label="Toma de datos"
        />
        <TabButton
          active={vista === "estadisticas"}
          onClick={() => setVista("estadisticas")}
          icon="📊"
          label="Estadísticas"
        />
      </nav>

      {modalCtx && (
        <ActionModal
          panel={modalCtx.panel}
          boton={modalCtx.boton}
          convocatoria={convocatoria}
          periodo={periodoActual}
          tiempoMs={elapsedMs}
          saving={busy}
          onClose={() => setModalCtx(null)}
          onConfirm={confirmarAccion}
        />
      )}
    </main>
  );
}

/* --------------------------------- Navbar inferior --------------------------------- */

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-0.5 border-t-2 px-4 py-2.5 text-xs font-medium transition ${
        active
          ? "border-purple-600 text-purple-700"
          : "border-transparent text-slate-400 hover:text-slate-600"
      }`}
      style={{ minHeight: 56 }}
    >
      <span className="text-lg leading-none">{icon}</span>
      {label}
    </button>
  );
}

/* ------------------------------ Panel táctico ------------------------------ */

function PanelCard({ panel, onBoton }: { panel: Panel; onBoton: (boton: string) => void }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 shrink-0 text-lg font-semibold text-purple-700">{panel.grupo}</h2>
      <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-3">
        {panel.botones.map((boton) => (
          <button
            key={boton}
            onClick={() => onBoton(boton)}
            className="flex min-h-[3.5rem] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base font-medium text-slate-700 transition active:scale-[0.97] hover:border-purple-300 hover:bg-purple-50"
          >
            {boton}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- Modal de acción ---------------------------- */

function ActionModal({
  panel,
  boton,
  convocatoria,
  periodo,
  tiempoMs,
  saving,
  onClose,
  onConfirm,
}: {
  panel: Panel;
  boton: string;
  convocatoria: ConvocatoriaItem[];
  periodo: PeriodoPartido;
  tiempoMs: number;
  saving: boolean;
  onClose: () => void;
  onConfirm: (payload: EventoCreate) => void;
}) {
  const [accion, setAccion] = useState<TipoAccion | null>(null);
  const [distancia, setDistancia] = useState<string | null>(null);
  const [zonaPorteria, setZonaPorteria] = useState<ZonaPorteria | null>(null);
  const [campoPoint, setCampoPoint] = useState<CourtPoint | null>(null);
  const [subtipoPerdida, setSubtipoPerdida] = useState<string | null>(null);
  const [sancion, setSancion] = useState<TipoSancion | null>(null);
  const [jugadorId, setJugadorId] = useState<string | null>(null);

  const candidatos = accion ? candidatosJugador(panel, accion, convocatoria) : [];
  const necesitaJugador = accion ? requiereJugador(panel, accion) : false;

  const puedeConfirmar =
    accion !== null && (!necesitaJugador || jugadorId !== null) &&
    (accion !== "AMONESTACION" || sancion !== null) &&
    (accion !== "PERDIDA" || panel.origen === "RIVAL" || subtipoPerdida !== null || true);

  function confirmar() {
    if (!accion) return;
    const zonaCampo = DISTANCIAS.find((d) => d.key === distancia)?.zona ?? null;
    const payload = construirPayload({
      panel,
      boton,
      accion,
      jugadorId,
      zonaPorteria,
      zonaCampo,
      campoPoint,
      subtipoPerdida,
      sancion,
      periodo,
      tiempoMs,
    });
    onConfirm(payload);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-purple-700">
            {panel.grupo} {boton}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-11 w-11 place-items-center rounded-full text-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            {ACCIONES.map((a) => (
              <button
                key={a.key}
                onClick={() => setAccion(a.key)}
                className={`w-full min-h-[3.5rem] rounded-xl px-5 py-4 text-left text-base font-medium transition active:scale-[0.98] ${
                  accion === a.key
                    ? "bg-purple-600 text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div>
            {(accion === "GOL" || accion === "FALLO") && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-600">
                  {accion === "GOL" ? "Detalle Gol" : "Detalle Lanzamiento"}
                </p>
                <div className="mb-4 flex flex-wrap gap-2.5">
                  {DISTANCIAS.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => setDistancia(d.key)}
                      className={`min-h-[2.75rem] rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-[0.97] ${
                        distancia === d.key
                          ? "bg-purple-600 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <div className="mb-3 flex flex-wrap gap-4">
                  <div className="w-48">
                    <p className="mb-1.5 text-xs font-medium text-slate-400">Campo</p>
                    <HandballCourtSelector value={campoPoint} onChange={setCampoPoint} />
                  </div>
                  {accion === "GOL" && (
                    <div className="w-48">
                      <p className="mb-1.5 text-xs font-medium text-slate-400">Portería</p>
                      <GoalTargetSelector value={zonaPorteria} onChange={setZonaPorteria} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {accion === "PERDIDA" && panel.origen === "EQUIPO_PROPIO" && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-600">Tipo de pérdida</p>
                <div className="flex flex-wrap gap-2.5">
                  {SUBTIPOS_PERDIDA.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSubtipoPerdida(s)}
                      className={`min-h-[2.75rem] rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-[0.97] ${
                        subtipoPerdida === s
                          ? "bg-purple-600 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {accion === "AMONESTACION" && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-600">Tipo de sanción</p>
                <div className="grid grid-cols-2 gap-3">
                  {SANCIONES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSancion(s.key)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-3 transition active:scale-[0.97] ${
                        sancion === s.key
                          ? "border-purple-600 bg-purple-50"
                          : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <span className={`h-20 w-14 rounded-md shadow-sm ${s.color}`} />
                      <span className="text-sm font-semibold text-slate-700">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {accion && necesitaJugador && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-slate-600">Jugador</p>
            {candidatos.length === 0 ? (
              <p className="text-sm text-red-600">No hay jugadores disponibles para esta acción.</p>
            ) : (
              <div className="grid grid-cols-7 gap-2.5 sm:grid-cols-8">
                {candidatos
                  .slice()
                  .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999))
                  .map((j) => (
                    <button
                      key={j.jugador_id}
                      onClick={() => setJugadorId(j.jugador_id)}
                      title={`${j.nombre} ${j.apellidos}`}
                      className={`grid aspect-square min-h-[2.75rem] place-items-center rounded-full text-sm font-semibold transition active:scale-[0.95] ${
                        jugadorId === j.jugador_id
                          ? "bg-purple-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-purple-100"
                      }`}
                    >
                      {j.dorsal ?? "?"}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-7 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="min-h-[3rem] rounded-xl border border-slate-200 px-6 py-3 text-base text-slate-600 transition active:scale-[0.97] hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={!puedeConfirmar || saving}
            className="min-h-[3rem] rounded-xl bg-purple-600 px-8 py-3 text-base font-semibold text-white transition active:scale-[0.97] hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Quick Stats -------------------------------- */

type QuickStats = {
  tirosPropios: number;
  golesPropios: number;
  tirosPct: number;
  tirosRivalTotal: number;
  paradas: number;
  paradasPct: number;
  perdidasPorSubtipo: { nombre: string; valor: number }[];
  exclusionesActivas: { nombre: string; restanteMs: number }[];
};

function calcularQuickStats(eventos: EventoPartido[], periodoActual: PeriodoPartido, elapsedMs: number): QuickStats {
  const tirosPropios = eventos.filter((e) => e.origen === "EQUIPO_PROPIO" && e.tipo === "LANZAMIENTO");
  const golesPropios = tirosPropios.filter((e) => e.resultado_lanzamiento === "GOL").length;

  const tirosRival = eventos.filter((e) => e.origen === "RIVAL" && e.tipo === "LANZAMIENTO");
  const paradas = tirosRival.filter((e) => e.resultado_lanzamiento === "PARADA").length;

  const perdidasMap = new Map<string, number>();
  for (const p of eventos.filter((e) => e.tipo === "PERDIDA")) {
    const key = p.subtipo ?? "Otra";
    perdidasMap.set(key, (perdidasMap.get(key) ?? 0) + 1);
  }

  const exclusionesActivas = eventos
    .filter((e) => e.tipo === "DOS_MINUTOS" && e.origen === "EQUIPO_PROPIO" && e.periodo === periodoActual)
    .map((e) => ({
      nombre: e.jugador_nombre ?? "—",
      restanteMs: Math.max(DOS_MINUTOS_MS - (elapsedMs - e.tiempo_ms), 0),
    }))
    .filter((x) => x.restanteMs > 0);

  return {
    tirosPropios: tirosPropios.length,
    golesPropios,
    tirosPct: tirosPropios.length > 0 ? Math.round((golesPropios / tirosPropios.length) * 100) : 0,
    tirosRivalTotal: tirosRival.length,
    paradas,
    paradasPct: tirosRival.length > 0 ? Math.round((paradas / tirosRival.length) * 100) : 0,
    perdidasPorSubtipo: [...perdidasMap.entries()].map(([nombre, valor]) => ({ nombre, valor })),
    exclusionesActivas,
  };
}

function QuickStatsPanel({ stats, eventos }: { stats: QuickStats; eventos: EventoPartido[] }) {
  const ultimas = [...eventos].reverse().slice(0, 8);
  return (
    <div className="flex flex-col gap-4 lg:h-full">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-full">
        <div className="shrink-0 bg-purple-600 px-4 py-2 font-semibold text-white">Quick Stats</div>

        <div className="grid flex-1 grid-rows-2 divide-y divide-slate-100">
          {/* Fila superior: eficacia de tiros/paradas + exclusiones activas */}
          <div className="grid grid-cols-3 items-center gap-2 p-4">
            <Donut label="Tiros" pct={stats.tirosPct} fraccion={`${stats.golesPropios}/${stats.tirosPropios}`} />
            <Donut label="Paradas" pct={stats.paradasPct} fraccion={`${stats.paradas}/${stats.tirosRivalTotal}`} />
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Exclusiones activas
              </p>
              {stats.exclusionesActivas.length === 0 ? (
                <p className="text-xs text-slate-400">Ninguna</p>
              ) : (
                <ul className="space-y-1">
                  {stats.exclusionesActivas.map((ex, i) => (
                    <li key={i} className="flex items-center justify-between gap-1 text-xs">
                      <span className="truncate">{ex.nombre}</span>
                      <span className="shrink-0 tabular-nums text-red-600">{formatMs(ex.restanteMs)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Fila inferior: gráfica de pérdidas + últimas acciones */}
          <div className="grid min-h-0 grid-cols-2 gap-3 p-4">
            <div className="flex min-h-0 flex-col">
              <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Gráfica de pérdidas
              </p>
              {stats.perdidasPorSubtipo.length === 0 ? (
                <p className="text-xs text-slate-400">Sin pérdidas registradas</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minHeight={100}>
                  <BarChart data={stats.perdidasPorSubtipo}>
                    <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: COLOR.slate }} />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="valor" fill={COLOR.purple} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex min-h-0 flex-col">
              <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Últimas acciones
              </p>
              {ultimas.length === 0 ? (
                <p className="text-xs text-slate-400">Todavía no hay acciones</p>
              ) : (
                <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto text-xs">
                  {ultimas.map((e) => (
                    <li key={e.id} className="text-slate-600">
                      <span className="tabular-nums text-slate-400">{formatMs(e.tiempo_ms)}</span>{" "}
                      {describirAccion(e)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Estadísticas (pestaña) ------------------------ */

type ZonaBreakdown = { zona: string; intentos: number };
type JugadorIndividual = { nombre: string; goles: number; lanzamientos: number; eficaciaPct: number };
type SistemaBreakdown = { nombre: string; goles: number; lanzamientos: number; eficaciaPct: number };
type FaseBreakdown = { goles: number; lanzamientos: number; eficaciaPct: number; puntos: HeatPoint[] };
type PorteroSieteMetros = { nombre: string; paradas: number; recibidos: number; pct: number };

type EstadisticasCompletas = {
  goles: number;
  lanzamientos: number;
  eficaciaPct: number;
  zonasPropias: ZonaBreakdown[];
  puntosCampoPropios: HeatPoint[];
  goleadores: { nombre: string; goles: number }[];

  perdidas: number;
  perdidasPorSubtipo: { nombre: string; valor: number }[];

  paradas: number;
  tirosRivalTotal: number;
  paradasPct: number;
  golesRecibidos: number;
  zonasPorteria: ZonaBreakdown[];
  puntosPorteria: HeatPoint[];

  individual: JugadorIndividual[];
  amonestaciones: { nombre: string; dosMinutos: number; amarillas: number; rojas: number; azules: number }[];

  ataquePosicional: SistemaBreakdown[];
  defensaPosicional: SistemaBreakdown[];

  contraataque: FaseBreakdown;
  repliegue: FaseBreakdown;

  parcial: { t: number; diferencial: number }[];
  porterosSieteMetros: PorteroSieteMetros[];

  robos: number;
  blocajes: number;
  exclusiones: number;
  ultimasAcciones: EventoPartido[];
};

function calcularEstadisticasCompletas(eventos: EventoPartido[]): EstadisticasCompletas {
  const tirosPropios = eventos.filter((e) => e.origen === "EQUIPO_PROPIO" && e.tipo === "LANZAMIENTO");
  const goles = tirosPropios.filter((e) => e.resultado_lanzamiento === "GOL").length;

  const tirosRival = eventos.filter((e) => e.origen === "RIVAL" && e.tipo === "LANZAMIENTO");
  const paradas = tirosRival.filter((e) => e.resultado_lanzamiento === "PARADA").length;
  const golesRecibidos = tirosRival.filter((e) => e.resultado_lanzamiento === "GOL").length;

  const zonasPropias: ZonaBreakdown[] = ORDEN_ZONA_CAMPO.map((zona) => ({
    zona: ZONA_CAMPO_LABEL[zona] ?? zona,
    intentos: tirosPropios.filter((e) => e.zona_campo === zona).length,
  }));
  const puntosCampoPropios: HeatPoint[] = tirosPropios
    .filter((e) => e.campo_x != null && e.campo_y != null)
    .map((e) => ({ x: e.campo_x as number, y: e.campo_y as number }));

  const goleadoresMap = new Map<string, number>();
  for (const e of tirosPropios) {
    if (e.resultado_lanzamiento !== "GOL" || !e.jugador_nombre) continue;
    goleadoresMap.set(e.jugador_nombre, (goleadoresMap.get(e.jugador_nombre) ?? 0) + 1);
  }
  const goleadores = [...goleadoresMap.entries()]
    .map(([nombre, goles]) => ({ nombre, goles }))
    .sort((a, b) => b.goles - a.goles)
    .slice(0, 8);

  const perdidasEventos = eventos.filter((e) => e.tipo === "PERDIDA");
  const perdidasMap = new Map<string, number>();
  for (const p of perdidasEventos) {
    const key = p.subtipo ?? "Otra";
    perdidasMap.set(key, (perdidasMap.get(key) ?? 0) + 1);
  }

  const zonasPorteria: ZonaBreakdown[] = ORDEN_ZONA_CAMPO.map((zona) => ({
    zona: ZONA_CAMPO_LABEL[zona] ?? zona,
    intentos: tirosRival.filter((e) => e.zona_campo === zona).length,
  }));
  const puntosPorteria: HeatPoint[] = tirosRival
    .filter((e) => e.zona_porteria != null)
    .map((e) => ZONA_PORTERIA_PUNTO[e.zona_porteria as ZonaPorteria]);

  const individualMap = new Map<string, { goles: number; lanzamientos: number }>();
  for (const e of tirosPropios) {
    if (!e.jugador_nombre) continue;
    const acc = individualMap.get(e.jugador_nombre) ?? { goles: 0, lanzamientos: 0 };
    acc.lanzamientos += 1;
    if (e.resultado_lanzamiento === "GOL") acc.goles += 1;
    individualMap.set(e.jugador_nombre, acc);
  }
  const individual = [...individualMap.entries()]
    .map(([nombre, v]) => ({
      nombre,
      goles: v.goles,
      lanzamientos: v.lanzamientos,
      eficaciaPct: v.lanzamientos > 0 ? Math.round((v.goles / v.lanzamientos) * 100) : 0,
    }))
    .sort((a, b) => b.goles - a.goles);

  const TIPOS_SANCION = ["DOS_MINUTOS", "TARJETA_AMARILLA", "TARJETA_ROJA", "TARJETA_AZUL"] as const;
  const amonestacionesMap = new Map<string, { dosMinutos: number; amarillas: number; rojas: number; azules: number }>();
  for (const e of eventos) {
    if (!TIPOS_SANCION.includes(e.tipo as (typeof TIPOS_SANCION)[number])) continue;
    if (e.origen !== "EQUIPO_PROPIO" || !e.jugador_nombre) continue;
    const acc = amonestacionesMap.get(e.jugador_nombre) ?? { dosMinutos: 0, amarillas: 0, rojas: 0, azules: 0 };
    if (e.tipo === "DOS_MINUTOS") acc.dosMinutos += 1;
    if (e.tipo === "TARJETA_AMARILLA") acc.amarillas += 1;
    if (e.tipo === "TARJETA_ROJA") acc.rojas += 1;
    if (e.tipo === "TARJETA_AZUL") acc.azules += 1;
    amonestacionesMap.set(e.jugador_nombre, acc);
  }
  const amonestaciones = [...amonestacionesMap.entries()].map(([nombre, v]) => ({ nombre, ...v }));

  function bucketSistema(lista: EventoPartido[], nombre: string, filtro: (e: EventoPartido) => boolean): SistemaBreakdown {
    const en = lista.filter(filtro);
    const g = en.filter((e) => e.resultado_lanzamiento === "GOL").length;
    return {
      nombre,
      goles: g,
      lanzamientos: en.length,
      eficaciaPct: en.length > 0 ? Math.round((g / en.length) * 100) : 0,
    };
  }
  const ataquePosicional = [
    bucketSistema(tirosPropios, "6-0", (e) => e.sistema_defensa === "SEIS_CERO"),
    bucketSistema(tirosPropios, "5-1", (e) => e.sistema_defensa === "CINCO_UNO"),
    bucketSistema(tirosPropios, "Inferioridad", (e) => e.fase === "ATAQUE_INFERIORIDAD"),
    bucketSistema(tirosPropios, "Superioridad", (e) => e.fase === "ATAQUE_SUPERIORIDAD"),
  ];
  const defensaPosicional = [
    bucketSistema(tirosRival, "6-0", (e) => e.sistema_defensa === "SEIS_CERO"),
    bucketSistema(tirosRival, "5-1", (e) => e.sistema_defensa === "CINCO_UNO"),
    bucketSistema(tirosRival, "Inferioridad", (e) => e.fase === "DEFENSA_INFERIORIDAD"),
    bucketSistema(tirosRival, "Superioridad", (e) => e.fase === "DEFENSA_SUPERIORIDAD"),
  ];

  function bucketFase(lista: EventoPartido[], fases: FaseJuego[]): FaseBreakdown {
    const en = lista.filter((e) => e.fase && fases.includes(e.fase));
    const g = en.filter((e) => e.resultado_lanzamiento === "GOL").length;
    const puntos: HeatPoint[] = en
      .filter((e) => e.campo_x != null && e.campo_y != null)
      .map((e) => ({ x: e.campo_x as number, y: e.campo_y as number }));
    return {
      goles: g,
      lanzamientos: en.length,
      eficaciaPct: en.length > 0 ? Math.round((g / en.length) * 100) : 0,
      puntos,
    };
  }
  const contraataque = bucketFase(tirosPropios, [
    "CONTRAATAQUE_PRIMERA_OLEADA",
    "CONTRAATAQUE_SEGUNDA_OLEADA",
    "SAQUE_CENTRO_RAPIDO",
  ]);
  const repliegue = bucketFase(tirosRival, ["TRANSICION_DEFENSIVA"]);

  const cronologicos = [...eventos].sort(
    (a, b) => _PERIODO_ORDEN_LIVE[a.periodo] - _PERIODO_ORDEN_LIVE[b.periodo] || a.tiempo_ms - b.tiempo_ms,
  );
  const parcial = cronologicos.map((e, i) => ({ t: i, diferencial: e.goles_equipo - e.goles_rival }));

  const tirosRival7m = tirosRival.filter((e) => e.zona_campo === "SIETE_METROS" || e.fase === "SIETE_METROS");
  const porterosMap = new Map<string, { paradas: number; recibidos: number }>();
  for (const e of tirosRival7m) {
    const nombre = e.portero_nombre ?? "—";
    const acc = porterosMap.get(nombre) ?? { paradas: 0, recibidos: 0 };
    if (e.resultado_lanzamiento === "PARADA") acc.paradas += 1;
    else if (e.resultado_lanzamiento === "GOL") acc.recibidos += 1;
    porterosMap.set(nombre, acc);
  }
  const porterosSieteMetros = [...porterosMap.entries()].map(([nombre, v]) => ({
    nombre,
    paradas: v.paradas,
    recibidos: v.recibidos,
    pct: v.paradas + v.recibidos > 0 ? Math.round((v.paradas / (v.paradas + v.recibidos)) * 100) : 0,
  }));

  return {
    goles,
    lanzamientos: tirosPropios.length,
    eficaciaPct: tirosPropios.length > 0 ? Math.round((goles / tirosPropios.length) * 100) : 0,
    zonasPropias,
    puntosCampoPropios,
    goleadores,
    perdidas: perdidasEventos.length,
    perdidasPorSubtipo: [...perdidasMap.entries()].map(([nombre, valor]) => ({ nombre, valor })),
    paradas,
    tirosRivalTotal: tirosRival.length,
    paradasPct: tirosRival.length > 0 ? Math.round((paradas / tirosRival.length) * 100) : 0,
    golesRecibidos,
    zonasPorteria,
    puntosPorteria,
    individual,
    amonestaciones,
    ataquePosicional,
    defensaPosicional,
    contraataque,
    repliegue,
    parcial,
    porterosSieteMetros,
    robos: eventos.filter((e) => e.tipo === "ROBO").length,
    blocajes: eventos.filter((e) => e.tipo === "BLOCAJE").length,
    exclusiones: eventos.filter((e) => e.tipo === "DOS_MINUTOS" && e.origen === "EQUIPO_PROPIO").length,
    ultimasAcciones: [...eventos].reverse().slice(0, 10),
  };
}

const _PERIODO_ORDEN_LIVE: Record<PeriodoPartido, number> = {
  PRIMERA_PARTE: 1,
  SEGUNDA_PARTE: 2,
  PRORROGA_1: 3,
  PRORROGA_2: 4,
  PENALTIS: 5,
};

function EstadisticasLiveTab({ stats }: { stats: EstadisticasCompletas }) {
  const sinDatos = stats.lanzamientos === 0 && stats.tirosRivalTotal === 0;

  if (sinDatos) {
    return (
      <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
        Todavía no hay acciones registradas. Las estadísticas aparecerán aquí en cuanto empieces a
        anotar en &quot;Toma de datos&quot;.
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Eficacia Lanzamiento">
          <div className="flex items-center gap-3">
            <Donut label="" pct={stats.eficaciaPct} fraccion={`${stats.goles}/${stats.lanzamientos}`} />
            <CourtHeatmap puntos={stats.puntosCampoPropios} className="max-w-[130px]" />
          </div>
          <div className="mt-3">
            <BarList items={stats.zonasPropias.map((z) => ({ label: z.zona, valor: z.intentos }))} />
          </div>
        </StatCard>

        <StatCard title="Pérdidas">
          <p className="rounded-xl bg-purple-600 py-3 text-center text-2xl font-bold text-white">
            {stats.perdidas}
          </p>
          <div className="mt-3">
            <BarList items={stats.perdidasPorSubtipo.map((p) => ({ label: p.nombre, valor: p.valor }))} />
          </div>
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Goleadores</p>
            {stats.goleadores.length === 0 ? (
              <p className="text-xs text-slate-400">Sin goles todavía.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {stats.goleadores.map((g) => (
                  <li key={g.nombre} className="flex justify-between gap-2">
                    <span className="truncate">{g.nombre}</span>
                    <span className="shrink-0 tabular-nums font-medium">{g.goles}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </StatCard>

        <StatCard title="Eficacia Portería">
          <div className="flex items-center gap-3">
            <Donut label="" pct={stats.paradasPct} fraccion={`${stats.paradas}/${stats.tirosRivalTotal}`} />
            <GoalHeatmap puntos={stats.puntosPorteria} className="max-w-[150px]" />
          </div>
          <div className="mt-3">
            <BarList items={stats.zonasPorteria.map((z) => ({ label: z.zona, valor: z.intentos }))} />
          </div>
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Goleadores rival</p>
            <p className="text-xs text-slate-400">
              Pendiente — requiere identificar jugadores del equipo rival (todavía sin plantilla rival).
            </p>
          </div>
        </StatCard>

        <div className="flex flex-col gap-4">
          <StatCard title="Individual">
            {stats.individual.length === 0 ? (
              <p className="text-xs text-slate-400">Sin datos todavía.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {stats.individual.slice(0, 6).map((j) => (
                  <li key={j.nombre} className="flex items-center justify-between gap-2">
                    <span className="truncate">{j.nombre}</span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {j.goles}/{j.lanzamientos}
                    </span>
                    <span className="w-10 shrink-0 text-right tabular-nums font-medium text-purple-700">
                      {j.eficaciaPct}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </StatCard>
          <StatCard title="Amonestaciones">
            {stats.amonestaciones.length === 0 ? (
              <p className="text-xs text-slate-400">Ninguna.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {stats.amonestaciones.map((a) => (
                  <li key={a.nombre} className="flex items-center justify-between gap-2">
                    <span className="truncate">{a.nombre}</span>
                    <span className="flex shrink-0 gap-2 tabular-nums">
                      {a.dosMinutos > 0 && <span className="text-red-600">{a.dosMinutos * 2}&apos;</span>}
                      {a.amarillas > 0 && <span className="text-yellow-600">{a.amarillas}A</span>}
                      {a.rojas > 0 && <span className="text-red-700">{a.rojas}R</span>}
                      {a.azules > 0 && <span className="text-blue-600">{a.azules}Az</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </StatCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <StatCard title="Juego Posicional · Ataque">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.ataquePosicional.map((s) => (
              <Donut key={s.nombre} label={s.nombre} pct={s.eficaciaPct} fraccion={`${s.goles}/${s.lanzamientos}`} />
            ))}
          </div>
        </StatCard>

        <div className="flex flex-col gap-4">
          <StatCard title="Juego Posicional · Defensa">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.defensaPosicional.map((s) => (
                <Donut key={s.nombre} label={s.nombre} pct={s.eficaciaPct} fraccion={`${s.goles}/${s.lanzamientos}`} />
              ))}
            </div>
          </StatCard>
          <StatCard title="Últimas acciones">
            {stats.ultimasAcciones.length === 0 ? (
              <p className="text-xs text-slate-400">Todavía no hay acciones.</p>
            ) : (
              <ul className="max-h-40 space-y-1.5 overflow-y-auto text-xs">
                {stats.ultimasAcciones.map((e) => (
                  <li key={e.id} className="text-slate-600">
                    <span className="tabular-nums text-slate-400">{formatMs(e.tiempo_ms)}</span>{" "}
                    {describirAccion(e)}
                  </li>
                ))}
              </ul>
            )}
          </StatCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Contraataque">
          <Donut label="" pct={stats.contraataque.eficaciaPct} fraccion={`${stats.contraataque.goles}/${stats.contraataque.lanzamientos}`} />
          <CourtHeatmap puntos={stats.contraataque.puntos} className="mt-3" />
        </StatCard>

        <StatCard title="Parcial">
          {stats.parcial.length === 0 ? (
            <p className="text-xs text-slate-400">Sin datos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={stats.parcial}>
                <XAxis dataKey="t" hide />
                <YAxis tick={{ fontSize: 10, fill: COLOR.slate }} allowDecimals={false} />
                <Tooltip labelFormatter={() => "Diferencial"} />
                <Area type="monotone" dataKey="diferencial" stroke={COLOR.purple} fill={COLOR.purpleSoft} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </StatCard>

        <StatCard title="Eficacia porteros a 7m">
          {stats.porterosSieteMetros.length === 0 ? (
            <p className="text-xs text-slate-400">Sin lanzamientos de 7m todavía.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {stats.porterosSieteMetros.map((p) => (
                <li key={p.nombre} className="flex items-center justify-between gap-2">
                  <span className="truncate">{p.nombre}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">
                    {p.paradas}/{p.paradas + p.recibidos}
                  </span>
                  <span className="w-10 shrink-0 text-right tabular-nums font-medium text-purple-700">{p.pct}%</span>
                </li>
              ))}
            </ul>
          )}
        </StatCard>

        <StatCard title="Repliegue">
          <Donut label="" pct={stats.repliegue.eficaciaPct} fraccion={`${stats.repliegue.goles}/${stats.repliegue.lanzamientos}`} />
          <CourtHeatmap puntos={stats.repliegue.puntos} className="mt-3" />
        </StatCard>
      </div>
    </div>
  );
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

function BarList({ items }: { items: { label: string; valor: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.valor));
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 truncate text-slate-500">{it.label}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full bg-purple-500"
              style={{ width: `${(it.valor / max) * 100}%` }}
            />
          </span>
          <span className="w-5 shrink-0 text-right tabular-nums text-slate-600">{it.valor}</span>
        </li>
      ))}
    </ul>
  );
}

function Donut({ label, pct, fraccion }: { label: string; pct: number; fraccion: string }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto h-20 w-20">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[{ value: pct }, { value: 100 - pct }]}
              dataKey="value"
              innerRadius={26}
              outerRadius={38}
              startAngle={90}
              endAngle={-270}
            >
              <Cell fill={COLOR.purple} />
              <Cell fill={COLOR.slateLight} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span className="absolute inset-0 grid place-items-center text-sm font-bold">{pct}%</span>
      </div>
      <p className="mt-1 text-xs font-medium text-slate-600">{label}</p>
      <p className="text-[11px] text-slate-400">{fraccion}</p>
    </div>
  );
}

function describirAccion(e: EventoPartido): string {
  if (e.tipo === "LANZAMIENTO" && e.resultado_lanzamiento === "GOL") {
    return e.origen === "EQUIPO_PROPIO" ? `Gol de ${e.jugador_nombre ?? "?"}` : "Gol recibido";
  }
  if (e.tipo === "LANZAMIENTO" && e.resultado_lanzamiento === "PARADA") {
    return `Parada${e.portero_nombre ? ` de ${e.portero_nombre}` : ""}`;
  }
  if (e.tipo === "LANZAMIENTO") {
    return e.origen === "EQUIPO_PROPIO"
      ? `Lanzamiento fallado de ${e.jugador_nombre ?? "?"}`
      : "Lanzamiento fallado (rival)";
  }
  if (e.tipo === "PERDIDA") return `Pérdida de ${e.jugador_nombre ?? "?"}`;
  if (e.tipo === "ROBO") return `Robo de ${e.jugador_nombre ?? "?"}`;
  if (e.tipo === "DOS_MINUTOS") return e.jugador_nombre ? `2' a ${e.jugador_nombre}` : "2' al rival";
  if (e.tipo === "TARJETA_AMARILLA") return e.jugador_nombre ? `Amarilla a ${e.jugador_nombre}` : "Amarilla al rival";
  if (e.tipo === "TARJETA_ROJA") return e.jugador_nombre ? `Roja a ${e.jugador_nombre}` : "Roja al rival";
  if (e.tipo === "TARJETA_AZUL") return e.jugador_nombre ? `Azul a ${e.jugador_nombre}` : "Azul al rival";
  if (e.tipo === "INICIO_PARTIDO") return "Inicio del partido";
  if (e.tipo === "INICIO_PERIODO") return "Inicio de periodo";
  if (e.tipo === "FIN_PERIODO") return "Fin de periodo";
  if (e.tipo === "FIN_PARTIDO") return "Fin del partido";
  return e.tipo;
}

function formatMs(ms: number): string {
  const totalSeg = Math.max(Math.floor(ms / 1000), 0);
  const mm = String(Math.floor(totalSeg / 60)).padStart(2, "0");
  const ss = String(totalSeg % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
