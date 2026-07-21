"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ErrorMessage } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useClub } from "@/lib/club-context";
import {
  ESTADO_PARTIDO_LABEL,
  LOCALIZACION_LABEL,
  PERIODO_LABEL,
  type EventoPartido,
  type Partido,
  type PartidoEstadisticas,
  type PeriodoPartido,
} from "@/lib/types";

const COLOR = {
  cyan: "#22d3ee",
  lime: "#84cc16",
  coral: "#fb6b6b",
  orange: "#f97316",
  muted: "#8aa0b4",
  border: "#1d3a59",
};

const PERIODO_OFFSET_MS: Record<PeriodoPartido, number> = {
  PRIMERA_PARTE: 0,
  SEGUNDA_PARTE: 30 * 60 * 1000,
  PRORROGA_1: 60 * 60 * 1000,
  PRORROGA_2: 65 * 60 * 1000,
  PENALTIS: 70 * 60 * 1000,
};

export default function PartidoDetallePage() {
  const params = useParams<{ partidoId: string }>();
  const partidoId = params.partidoId;
  const { club, role, loading: clubLoading } = useClub();
  const canManage = role === "GESTOR_CLUB" || role === "ENTRENADOR";
  const clubId = club?.id;

  const [partido, setPartido] = useState<Partido | null>(null);
  const [stats, setStats] = useState<PartidoEstadisticas | null>(null);
  const [eventos, setEventos] = useState<EventoPartido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    const [p, s, e] = await Promise.all([
      apiFetch<Partido>(`/clubes/${clubId}/partidos/${partidoId}`, { token: getToken() }),
      apiFetch<PartidoEstadisticas>(`/clubes/${clubId}/partidos/${partidoId}/estadisticas`, {
        token: getToken(),
      }),
      apiFetch<EventoPartido[]>(`/clubes/${clubId}/partidos/${partidoId}/eventos`, {
        token: getToken(),
      }),
    ]);
    setPartido(p);
    setStats(s);
    setEventos(e);
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
          setError(e instanceof Error ? e.message : "Error al cargar el partido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId, load]);

  const marcadorData = useMemo(
    () =>
      eventos.map((e) => ({
        t: PERIODO_OFFSET_MS[e.periodo] + e.tiempo_ms,
        etiqueta: formatTiempo(e.periodo, e.tiempo_ms),
        equipo: e.goles_equipo,
        rival: e.goles_rival,
      })),
    [eventos],
  );

  const eventosPorPeriodo = useMemo(() => {
    const grupos = new Map<PeriodoPartido, EventoPartido[]>();
    for (const e of eventos) {
      if (!grupos.has(e.periodo)) grupos.set(e.periodo, []);
      grupos.get(e.periodo)!.push(e);
    }
    return grupos;
  }, [eventos]);

  if (clubLoading || loading || !partido) {
    return <CenteredHint text="Cargando partido…" />;
  }

  const sinDatos = !stats || stats.jugadores.length === 0;

  return (
    <>
      <header className="border-b border-border px-6 py-5">
        <Link href="/club/partidos" className="text-xs text-muted transition hover:text-ink">
          ← Partidos
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Nuestro equipo {partido.goles_equipo} – {partido.goles_rival} {partido.rival_nombre}
            </h1>
            <p className="text-sm text-muted">
              {new Date(partido.fecha_partido).toLocaleString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {LOCALIZACION_LABEL[partido.tipo_localizacion]}
              {partido.pabellon ? ` · ${partido.pabellon}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-cyan/40 px-3 py-1 text-xs text-cyan">
              {ESTADO_PARTIDO_LABEL[partido.estado]}
            </span>
            {canManage && (
              <Link
                href={`/club/partidos/${partido.id}/convocatoria`}
                className="rounded-xl border border-border px-4 py-2 text-sm text-ink transition hover:bg-surface-2"
              >
                Convocatoria
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        {error && <ErrorMessage message={error} />}

        {sinDatos ? (
          <CenteredHint
            icon="📊"
            text="Todavía no hay estadísticas registradas para este partido. Aparecerán aquí en cuanto se registren datos en Live Stats."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <KpiCard label="Goles" value={stats!.totales.goles} accent={COLOR.cyan} />
              <KpiCard label="Eficacia lanz." value={fmtPct(stats!.totales.eficacia_lanzamiento)} />
              <KpiCard label="Asistencias" value={stats!.totales.asistencias} />
              <KpiCard label="Paradas" value={stats!.totales.paradas} accent={COLOR.lime} />
              <KpiCard label="% Paradas" value={fmtPct(stats!.totales.porcentaje_paradas)} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="Marcador a lo largo del partido">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={marcadorData}>
                    <CartesianGrid stroke={COLOR.border} strokeDasharray="3 3" />
                    <XAxis dataKey="etiqueta" tick={{ fill: COLOR.muted, fontSize: 11 }} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fill: COLOR.muted, fontSize: 12 }} />
                    <Tooltip content={<MarcadorTooltip rival={partido.rival_nombre} />} />
                    <Legend wrapperStyle={{ color: COLOR.muted, fontSize: 12 }} />
                    <Line
                      type="stepAfter"
                      dataKey="equipo"
                      name="Nuestro equipo"
                      stroke={COLOR.cyan}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="stepAfter"
                      dataKey="rival"
                      name={partido.rival_nombre}
                      stroke={COLOR.coral}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Máximos goleadores">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[...stats!.jugadores]
                      .filter((j) => j.goles > 0 || j.lanzamientos > 0)
                      .slice(0, 8)
                      .map((j) => ({ nombre: j.nombre, goles: j.goles }))}
                    layout="vertical"
                  >
                    <CartesianGrid stroke={COLOR.border} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: COLOR.muted, fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      width={110}
                      tick={{ fill: COLOR.muted, fontSize: 12 }}
                    />
                    <Tooltip content={<StatsTooltip />} />
                    <Bar dataKey="goles" name="Goles" fill={COLOR.cyan} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {stats!.totales.lanzamientos > 0 && (
                <ChartCard title="Eficacia de lanzamiento del equipo">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Tooltip content={<StatsTooltip />} />
                      <Legend wrapperStyle={{ color: COLOR.muted, fontSize: 12 }} />
                      <Pie
                        data={[
                          { name: "Goles", value: stats!.totales.goles },
                          {
                            name: "Fallados",
                            value: Math.max(
                              stats!.totales.lanzamientos - stats!.totales.goles,
                              0,
                            ),
                          },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        <Cell fill={COLOR.cyan} />
                        <Cell fill={COLOR.border} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              <ChartCard title="Balance del equipo">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[
                      { nombre: "Pérdidas", valor: stats!.totales.perdidas },
                      { nombre: "Robos", valor: stats!.totales.robos },
                      { nombre: "Blocajes", valor: stats!.totales.blocajes },
                      { nombre: "Exclusiones", valor: stats!.totales.exclusiones },
                    ]}
                  >
                    <CartesianGrid stroke={COLOR.border} strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" tick={{ fill: COLOR.muted, fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: COLOR.muted, fontSize: 12 }} />
                    <Tooltip content={<StatsTooltip />} />
                    <Bar dataKey="valor" name="Total" fill={COLOR.orange} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-medium text-ink">Timeline de acciones</h2>
              <div className="space-y-6">
                {[...eventosPorPeriodo.entries()].map(([periodo, filas]) => (
                  <div key={periodo}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      {PERIODO_LABEL[periodo]}
                    </p>
                    <ol className="space-y-1 border-l border-border pl-4">
                      {filas.map((ev) => (
                        <TimelineRow key={ev.id} evento={ev} />
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ----------------------------- Subcomponentes ----------------------------- */

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p
        className="mt-1 text-2xl font-semibold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4">
      <h3 className="mb-2 text-sm font-medium text-ink">{title}</h3>
      {children}
    </div>
  );
}

function TimelineRow({ evento }: { evento: EventoPartido }) {
  const { icono, color, texto } = describirEvento(evento);
  const esMarcador = [
    "INICIO_PARTIDO",
    "INICIO_PERIODO",
    "FIN_PERIODO",
    "FIN_PARTIDO",
  ].includes(evento.tipo);

  return (
    <li className="relative flex items-start gap-3 py-1.5 pl-2">
      <span
        className="absolute -left-[21px] mt-1.5 h-2.5 w-2.5 rounded-full border border-bg"
        style={{ backgroundColor: color }}
      />
      <span className="w-12 shrink-0 text-xs tabular-nums text-muted">
        {formatTiempo(evento.periodo, evento.tiempo_ms)}
      </span>
      <span className="text-sm">
        <span className="mr-1.5">{icono}</span>
        {texto}
      </span>
      {!esMarcador && (
        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted">
          {evento.goles_equipo}-{evento.goles_rival}
        </span>
      )}
    </li>
  );
}

function MarcadorTooltip({
  active,
  payload,
  label,
  rival,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  rival: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === rival ? rival : p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function StatsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-medium text-ink">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function CenteredHint({ text, icon }: { text: string; icon?: string }) {
  return (
    <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center text-muted">
      <div className="max-w-md">
        {icon && <div className="mb-3 text-3xl">{icon}</div>}
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}

/* -------------------------------- Helpers -------------------------------- */

function formatTiempo(periodo: PeriodoPartido, ms: number): string {
  const totalSeg = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSeg / 60)).padStart(2, "0");
  const ss = String(totalSeg % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function fmtPct(v: number | null | undefined): string {
  return v == null ? "—" : `${v.toFixed(1)}%`;
}

function describirEvento(e: EventoPartido): { icono: string; color: string; texto: string } {
  switch (e.tipo) {
    case "LANZAMIENTO":
      if (e.origen === "EQUIPO_PROPIO") {
        if (e.resultado_lanzamiento === "GOL") {
          return {
            icono: "⚽",
            color: COLOR.cyan,
            texto: e.asistencia_nombre
              ? `Gol de ${e.jugador_nombre} (asistencia de ${e.asistencia_nombre})`
              : `Gol de ${e.jugador_nombre}`,
          };
        }
        return {
          icono: "🎯",
          color: COLOR.muted,
          texto: `Lanzamiento fallado de ${e.jugador_nombre}${e.resultado_lanzamiento ? ` (${RESULTADO_LABEL[e.resultado_lanzamiento]})` : ""}`,
        };
      }
      if (e.resultado_lanzamiento === "GOL") {
        return {
          icono: "🥅",
          color: COLOR.coral,
          texto: e.portero_nombre ? `Gol recibido — portero ${e.portero_nombre}` : "Gol recibido",
        };
      }
      return {
        icono: "🧤",
        color: COLOR.lime,
        texto: e.portero_nombre ? `Parada de ${e.portero_nombre}` : "Parada",
      };
    case "PERDIDA":
      return { icono: "↩️", color: COLOR.orange, texto: `Pérdida de ${e.jugador_nombre}` };
    case "ROBO":
      return { icono: "🤾", color: COLOR.lime, texto: `Robo de balón de ${e.jugador_nombre}` };
    case "BLOCAJE":
      return { icono: "🛡️", color: COLOR.lime, texto: `Blocaje de ${e.jugador_nombre}` };
    case "DOS_MINUTOS":
      return { icono: "🟥", color: COLOR.coral, texto: `2 minutos de exclusión a ${e.jugador_nombre}` };
    case "INICIO_PARTIDO":
      return { icono: "🏁", color: COLOR.muted, texto: "Comienza el partido" };
    case "INICIO_PERIODO":
      return { icono: "▶️", color: COLOR.muted, texto: "Comienza el periodo" };
    case "FIN_PERIODO":
      return { icono: "⏸️", color: COLOR.muted, texto: "Fin del periodo" };
    case "FIN_PARTIDO":
      return { icono: "🏁", color: COLOR.muted, texto: "Fin del partido" };
    default:
      return { icono: "•", color: COLOR.muted, texto: e.tipo };
  }
}

const RESULTADO_LABEL: Record<string, string> = {
  PARADA: "parada rival",
  PALO: "al palo",
  FUERA: "fuera",
  BLOCADO: "blocado",
  ERROR_TECNICO: "error técnico",
};
