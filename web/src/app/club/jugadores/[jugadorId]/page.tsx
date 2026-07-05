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
  MANO_LABEL,
  POSICION_LABEL,
  type EstadisticaPartidoItem,
  type Jugador,
  type JugadorEstadisticas,
  type Temporada,
} from "@/lib/types";

const COLOR = {
  cyan: "#22d3ee",
  lime: "#84cc16",
  coral: "#fb6b6b",
  orange: "#f97316",
  muted: "#8aa0b4",
  border: "#1d3a59",
};

export default function JugadorEstadisticasPage() {
  const params = useParams<{ jugadorId: string }>();
  const jugadorId = params.jugadorId;
  const { club, loading: clubLoading } = useClub();
  const clubId = club?.id;

  const [jugador, setJugador] = useState<Jugador | null>(null);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [temporadaId, setTemporadaId] = useState("");
  const [stats, setStats] = useState<JugadorEstadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBase = useCallback(async () => {
    if (!clubId) return;
    const [j, temporadasData] = await Promise.all([
      apiFetch<Jugador>(`/clubes/${clubId}/jugadores/${jugadorId}`, {
        token: getToken(),
      }),
      apiFetch<Temporada[]>(`/clubes/${clubId}/temporadas`, {
        token: getToken(),
      }),
    ]);
    setJugador(j);
    setTemporadas(temporadasData);
    setTemporadaId((prev) => {
      if (prev && temporadasData.some((t) => t.id === prev)) return prev;
      return temporadasData.find((t) => t.activa)?.id ?? temporadasData[0]?.id ?? "";
    });
  }, [clubId, jugadorId]);

  const loadStats = useCallback(async () => {
    if (!clubId) return;
    const temporada = temporadaId ? `?temporada_id=${temporadaId}` : "";
    const data = await apiFetch<JugadorEstadisticas>(
      `/clubes/${clubId}/jugadores/${jugadorId}/estadisticas${temporada}`,
      { token: getToken() },
    );
    setStats(data);
  }, [clubId, jugadorId, temporadaId]);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await loadBase();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error al cargar el jugador");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId, loadBase]);

  useEffect(() => {
    if (!clubId || !temporadaId) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadStats();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error al cargar estadísticas");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId, temporadaId, loadStats]);

  const chartData = useMemo(() => buildChartData(stats?.por_partido ?? []), [stats]);

  if (clubLoading || loading || !jugador) {
    return <CenteredHint text="Cargando estadísticas…" />;
  }

  const esPortero =
    jugador.posicion_principal === "PORTERO" ||
    jugador.posicion_secundaria === "PORTERO" ||
    (stats ? stats.totales.paradas + stats.totales.goles_recibidos > 0 : false);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
        <div>
          <Link
            href="/club/jugadores"
            className="text-xs text-muted transition hover:text-ink"
          >
            ← Jugadores
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {jugador.nombre} {jugador.apellidos}
          </h1>
          <p className="text-sm text-muted">
            {jugador.posicion_principal ? POSICION_LABEL[jugador.posicion_principal] : "Sin posición"}
            {jugador.mano_dominante !== "DESCONOCIDA" && (
              <> · {MANO_LABEL[jugador.mano_dominante]}</>
            )}
          </p>
        </div>
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
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        {error && <ErrorMessage message={error} />}

        {!stats || stats.partidos_jugados === 0 ? (
          <CenteredHint
            icon="📊"
            text="Todavía no hay estadísticas registradas para este jugador. Aparecerán aquí en cuanto se registren datos de partidos en Live Stats."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="Partidos" value={stats.partidos_jugados} />
              <KpiCard label="Goles" value={stats.totales.goles} accent={COLOR.cyan} />
              <KpiCard label="Asistencias" value={stats.totales.asistencias} />
              <KpiCard
                label="Eficacia lanz."
                value={fmtPct(stats.totales.eficacia_lanzamiento)}
              />
              {esPortero && (
                <>
                  <KpiCard label="Paradas" value={stats.totales.paradas} accent={COLOR.lime} />
                  <KpiCard
                    label="% Paradas"
                    value={fmtPct(stats.totales.porcentaje_paradas)}
                  />
                </>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="Goles por partido">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData}>
                    <CartesianGrid stroke={COLOR.border} strokeDasharray="3 3" />
                    <XAxis dataKey="etiqueta" tick={{ fill: COLOR.muted, fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: COLOR.muted, fontSize: 12 }} />
                    <Tooltip content={<StatsTooltip />} />
                    <Bar dataKey="goles" name="Goles" fill={COLOR.cyan} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Progresión de goles en la temporada">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke={COLOR.border} strokeDasharray="3 3" />
                    <XAxis dataKey="etiqueta" tick={{ fill: COLOR.muted, fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: COLOR.muted, fontSize: 12 }} />
                    <Tooltip content={<StatsTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="acumulado"
                      name="Goles acumulados"
                      stroke={COLOR.lime}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              {stats.totales.lanzamientos > 0 && (
                <ChartCard title="Eficacia de lanzamiento">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Tooltip content={<StatsTooltip />} />
                      <Legend wrapperStyle={{ color: COLOR.muted, fontSize: 12 }} />
                      <Pie
                        data={[
                          { name: "Goles", value: stats.totales.goles },
                          {
                            name: "Fallados",
                            value: Math.max(
                              stats.totales.lanzamientos - stats.totales.goles,
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

              {esPortero && (
                <ChartCard title="Paradas vs. goles recibidos">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData}>
                      <CartesianGrid stroke={COLOR.border} strokeDasharray="3 3" />
                      <XAxis dataKey="etiqueta" tick={{ fill: COLOR.muted, fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: COLOR.muted, fontSize: 12 }} />
                      <Tooltip content={<StatsTooltip />} />
                      <Legend wrapperStyle={{ color: COLOR.muted, fontSize: 12 }} />
                      <Bar dataKey="paradas" name="Paradas" fill={COLOR.lime} radius={[4, 4, 0, 0]} />
                      <Bar
                        dataKey="goles_recibidos"
                        name="Goles recibidos"
                        fill={COLOR.coral}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>

            <PartidosTable filas={stats.por_partido} />
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

function PartidosTable({ filas }: { filas: EstadisticaPartidoItem[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Rival</th>
            <th className="px-4 py-3 font-medium">Goles</th>
            <th className="px-4 py-3 font-medium">Asist.</th>
            <th className="px-4 py-3 font-medium">Lanz.</th>
            <th className="px-4 py-3 font-medium">Eficacia</th>
            <th className="px-4 py-3 font-medium">Paradas</th>
          </tr>
        </thead>
        <tbody>
          {[...filas].reverse().map((f) => (
            <tr key={f.partido_id} className="border-b border-border/50 last:border-0">
              <td className="px-4 py-3 text-muted">{formatFechaCorta(f.fecha_partido)}</td>
              <td className="px-4 py-3">{f.rival_nombre}</td>
              <td className="px-4 py-3 tabular-nums">{f.goles}</td>
              <td className="px-4 py-3 tabular-nums">{f.asistencias}</td>
              <td className="px-4 py-3 tabular-nums">{f.lanzamientos}</td>
              <td className="px-4 py-3 tabular-nums">{fmtPct(f.eficacia_lanzamiento)}</td>
              <td className="px-4 py-3 tabular-nums">{f.paradas}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      <p className="mb-1 font-medium text-ink">{label}</p>
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

function buildChartData(filas: EstadisticaPartidoItem[]) {
  let acumulado = 0;
  return filas.map((f) => {
    acumulado += f.goles;
    return {
      etiqueta: formatFechaCorta(f.fecha_partido),
      rival: f.rival_nombre,
      goles: f.goles,
      asistencias: f.asistencias,
      lanzamientos: f.lanzamientos,
      paradas: f.paradas,
      goles_recibidos: f.goles_recibidos,
      acumulado,
    };
  });
}

function formatFechaCorta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

function fmtPct(v: number | null): string {
  return v == null ? "—" : `${v.toFixed(1)}%`;
}
