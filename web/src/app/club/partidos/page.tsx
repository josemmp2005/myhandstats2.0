"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button, ErrorMessage } from "@/components/ui";
import { NuevoPartidoModal } from "@/components/nuevo-partido-modal";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useClub } from "@/lib/club-context";
import {
  ESTADO_PARTIDO_LABEL,
  LOCALIZACION_LABEL,
  type Competicion,
  type Equipo,
  type EstadoPartido,
  type Partido,
  type Temporada,
} from "@/lib/types";

type FiltroEstado = "TODOS" | EstadoPartido;

export default function PartidosPage() {
  const router = useRouter();
  const { club, role, loading: clubLoading } = useClub();
  const isAdmin = role === "GESTOR_CLUB";
  const canManage = isAdmin || role === "ENTRENADOR" || role === "AYUDANTE";

  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [temporadaId, setTemporadaId] = useState("");
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [rivales, setRivales] = useState<Equipo[]>([]);
  const [competiciones, setCompeticiones] = useState<Competicion[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroEquipo, setFiltroEquipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODOS");
  const [showModal, setShowModal] = useState(false);

  const clubId = club?.id;

  const loadTemporadas = useCallback(async () => {
    if (!clubId) return;
    const data = await apiFetch<Temporada[]>(`/clubes/${clubId}/temporadas`, {
      token: getToken(),
    });
    setTemporadas(data);
    setTemporadaId((prev) => {
      if (prev && data.some((t) => t.id === prev)) return prev;
      return data.find((t) => t.activa)?.id ?? data[0]?.id ?? "";
    });
  }, [clubId]);

  const loadEquipos = useCallback(async () => {
    if (!clubId || !temporadaId) {
      setEquipos([]);
      setRivales([]);
      return;
    }
    const soloMios = isAdmin ? "" : "&solo_mios=true";
    const [propios, rivalesData] = await Promise.all([
      apiFetch<Equipo[]>(
        `/clubes/${clubId}/equipos?temporada_id=${temporadaId}&tipo=PROPIO${soloMios}`,
        { token: getToken() },
      ),
      apiFetch<Equipo[]>(
        `/clubes/${clubId}/equipos?temporada_id=${temporadaId}&tipo=RIVAL`,
        { token: getToken() },
      ),
    ]);
    setEquipos(propios);
    setRivales(rivalesData);
  }, [clubId, temporadaId, isAdmin]);

  const loadCompeticiones = useCallback(async () => {
    if (!clubId || !temporadaId) {
      setCompeticiones([]);
      return;
    }
    const data = await apiFetch<Competicion[]>(
      `/clubes/${clubId}/competiciones?temporada_id=${temporadaId}`,
      { token: getToken() },
    );
    setCompeticiones(data);
  }, [clubId, temporadaId]);

  const loadPartidos = useCallback(async () => {
    if (!clubId || !temporadaId) {
      setPartidos([]);
      return;
    }
    const soloMios = isAdmin ? "" : "&solo_mios=true";
    const equipo = filtroEquipo ? `&equipo_id=${filtroEquipo}` : "";
    const estado = filtroEstado === "TODOS" ? "" : `&estado=${filtroEstado}`;
    const data = await apiFetch<Partido[]>(
      `/clubes/${clubId}/partidos?temporada_id=${temporadaId}${soloMios}${equipo}${estado}`,
      { token: getToken() },
    );
    setPartidos(data);
  }, [clubId, temporadaId, isAdmin, filtroEquipo, filtroEstado]);

  // Carga inicial de temporadas.
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await loadTemporadas();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId, loadTemporadas]);

  // Al cambiar de temporada: equipos, rivales y competiciones disponibles.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await Promise.all([loadEquipos(), loadCompeticiones()]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadEquipos, loadCompeticiones]);

  // Al cambiar temporada o filtros: recarga de partidos.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await loadPartidos();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error al cargar partidos");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPartidos]);

  async function cancelar(p: Partido) {
    if (!clubId) return;
    if (!window.confirm("¿Cancelar este partido?")) return;
    setError(null);
    try {
      await apiFetch(`/clubes/${clubId}/partidos/${p.id}`, {
        method: "DELETE",
        token: getToken(),
      });
      await loadPartidos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cancelar");
    }
  }

  if (clubLoading || loading) {
    return <CenteredHint text="Cargando partidos…" />;
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Partidos</h1>
          <p className="text-sm text-muted">{club?.nombre}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {temporadas.length > 0 && (
            <select
              value={temporadaId}
              onChange={(e) => setTemporadaId(e.target.value)}
              className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
            >
              {temporadas.map((t) => (
                <option key={t.id} value={t.id} className="bg-surface">
                  {t.nombre}
                  {t.activa ? " · activa" : ""}
                </option>
              ))}
            </select>
          )}
          {equipos.length > 0 && (
            <select
              value={filtroEquipo}
              onChange={(e) => setFiltroEquipo(e.target.value)}
              className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
            >
              <option value="" className="bg-surface">
                Todos los equipos
              </option>
              {equipos.map((eq) => (
                <option key={eq.id} value={eq.id} className="bg-surface">
                  {eq.nombre}
                </option>
              ))}
            </select>
          )}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
            className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
          >
            <option value="TODOS" className="bg-surface">
              Todos los estados
            </option>
            {(Object.keys(ESTADO_PARTIDO_LABEL) as EstadoPartido[]).map((e) => (
              <option key={e} value={e} className="bg-surface">
                {ESTADO_PARTIDO_LABEL[e]}
              </option>
            ))}
          </select>
          {canManage && equipos.length > 0 && (
            <Button onClick={() => setShowModal(true)}>+ Nuevo partido</Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-6">
        {error && <ErrorMessage message={error} />}

        {temporadas.length === 0 ? (
          <CenteredHint
            text="Necesitas una temporada antes de crear partidos."
            icon="📅"
          />
        ) : equipos.length === 0 ? (
          <CenteredHint
            text="No tienes equipos propios en esta temporada todavía."
            icon="🛡️"
          />
        ) : partidos.length === 0 ? (
          <CenteredHint text="No hay partidos con estos filtros." icon="🤾" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Equipo</th>
                  <th className="px-4 py-3 font-medium">Rival</th>
                  <th className="px-4 py-3 font-medium">Localización</th>
                  <th className="px-4 py-3 font-medium">Competición</th>
                  <th className="px-4 py-3 font-medium">Marcador</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  {canManage && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {partidos.map((p) => (
                  <PartidoRow
                    key={p.id}
                    partido={p}
                    equipoNombre={equipos.find((eq) => eq.id === p.equipo_id)?.nombre ?? "—"}
                    competicionNombre={
                      competiciones.find((c) => c.id === p.competicion_id)?.nombre ?? null
                    }
                    canManage={canManage}
                    onCancelar={isAdmin && p.estado !== "CANCELADO" ? () => cancelar(p) : undefined}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {clubId && temporadaId && (
        <NuevoPartidoModal
          open={showModal}
          onClose={() => setShowModal(false)}
          clubId={clubId}
          equipos={equipos}
          rivales={rivales}
          competiciones={competiciones}
          onCompeticionCreada={(c) => setCompeticiones((prev) => [...prev, c])}
          onCreated={(partido) => {
            setShowModal(false);
            router.push(`/club/partidos/${partido.id}/convocatoria`);
          }}
        />
      )}
    </>
  );
}

/* ----------------------------- Subcomponentes ----------------------------- */

function PartidoRow({
  partido,
  equipoNombre,
  competicionNombre,
  canManage,
  onCancelar,
}: {
  partido: Partido;
  equipoNombre: string;
  competicionNombre: string | null;
  canManage: boolean;
  onCancelar?: () => void;
}) {
  const estadoColor =
    partido.estado === "CANCELADO"
      ? "text-coral border-coral/40"
      : partido.estado === "FINALIZADO"
        ? "text-muted border-border"
        : partido.estado === "EN_DIRECTO"
          ? "text-lime border-lime/40"
          : "text-cyan border-cyan/40";
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="px-4 py-3 text-muted">{formatFecha(partido.fecha_partido)}</td>
      <td className="px-4 py-3 font-medium">
        <Link
          href={`/club/partidos/${partido.id}`}
          className="transition hover:text-cyan hover:underline"
        >
          {equipoNombre}
        </Link>
      </td>
      <td className="px-4 py-3">{partido.rival_nombre}</td>
      <td className="px-4 py-3 text-muted">
        {LOCALIZACION_LABEL[partido.tipo_localizacion]}
      </td>
      <td className="px-4 py-3 text-muted">{competicionNombre ?? "—"}</td>
      <td className="px-4 py-3 tabular-nums">
        {partido.goles_equipo} – {partido.goles_rival}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${estadoColor}`}>
          {ESTADO_PARTIDO_LABEL[partido.estado]}
        </span>
      </td>
      {canManage && (
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-3">
            <Link
              href={`/club/partidos/${partido.id}/convocatoria`}
              className="text-xs text-cyan transition hover:underline"
            >
              Convocatoria
            </Link>
            {onCancelar && (
              <button
                onClick={onCancelar}
                className="text-xs text-coral transition hover:underline"
              >
                Cancelar
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

function CenteredHint({ text, icon }: { text: string; icon?: string }) {
  return (
    <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center text-muted">
      <div>
        {icon && <div className="mb-3 text-3xl">{icon}</div>}
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
