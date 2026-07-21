"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Button, ErrorMessage } from "@/components/ui";
import { useConvocatoria } from "@/lib/use-convocatoria";
import { POSICIONES, POSICION_LABEL, type PosicionJugador } from "@/lib/types";

export default function ConvocatoriaPage() {
  const params = useParams<{ partidoId: string }>();
  const partidoId = params.partidoId;
  const c = useConvocatoria(partidoId);

  if (c.loading || !c.partido) {
    return <CenteredHint text="Cargando convocatoria…" />;
  }
  const { partido } = c;

  return (
    <>
      <header className="border-b border-border px-6 py-5">
        <Link
          href={`/club/partidos/${partidoId}`}
          className="text-xs text-muted transition hover:text-ink"
        >
          ← Partido
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Convocatoria · vs {partido.rival_nombre}
            </h1>
            <p className="text-sm text-muted">
              {new Date(partido.fecha_partido).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}{" "}
              · {c.resumen.disponibles} disponibles de {c.resumen.total} · {c.resumen.titulares} titulares ·{" "}
              {c.resumen.porteros} {c.resumen.porteros === 1 ? "portero" : "porteros"}
            </p>
          </div>
          {c.puedeEditar && (
            <Button onClick={c.guardar} disabled={c.saving || c.dorsalesDuplicados.size > 0}>
              {c.saving ? "Guardando…" : c.guardado ? "Guardado ✓" : "Guardar convocatoria"}
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-6">
        {c.error && <ErrorMessage message={c.error} />}

        {c.bloqueada && (
          <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
            Este partido está {partido.estado === "FINALIZADO" ? "finalizado" : "cancelado"}: la
            convocatoria no se puede modificar.
          </p>
        )}

        {c.resumen.porteros === 0 && (
          <p className="rounded-lg border border-orange/40 bg-orange/10 px-3 py-2 text-sm text-orange">
            Debes convocar al menos un portero.
          </p>
        )}

        {c.dorsalesDuplicados.size > 0 && (
          <ErrorMessage
            message={`Dorsal duplicado en la convocatoria: ${[...c.dorsalesDuplicados].sort((a, b) => a - b).join(", ")}`}
          />
        )}

        {c.filas.length === 0 ? (
          <CenteredHint text="Este equipo no tiene jugadores en plantilla todavía." icon="🤾" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={c.busqueda}
                onChange={(e) => c.setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o dorsal…"
                className="w-56 rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-cyan"
              />
              <select
                value={c.filtroPosicion}
                onChange={(e) => c.setFiltroPosicion(e.target.value as PosicionJugador | "")}
                className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
              >
                <option value="" className="bg-surface">
                  Todas las posiciones
                </option>
                {POSICIONES.map((p) => (
                  <option key={p} value={p} className="bg-surface">
                    {POSICION_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-surface/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Jugador</th>
                    <th className="px-4 py-3 font-medium">Posición</th>
                    <th className="px-4 py-3 font-medium">Disponible</th>
                    <th className="px-4 py-3 font-medium">Titular</th>
                    <th className="px-4 py-3 font-medium">Portero</th>
                  </tr>
                </thead>
                <tbody>
                  {c.filasFiltradas.map((f) => (
                    <tr
                      key={f.jugador_id}
                      className={`border-b border-border/50 last:border-0 ${
                        !f.disponible_para_jugar ? "opacity-50" : ""
                      } ${f.dorsal != null && c.dorsalesDuplicados.has(f.dorsal) ? "bg-coral/10" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={f.dorsal ?? ""}
                          onChange={(e) => c.cambiarDorsal(f.jugador_id, e.target.value)}
                          disabled={!c.puedeEditar}
                          className="w-14 rounded-lg border border-border bg-bg/60 px-2 py-1 text-sm tabular-nums text-ink outline-none focus:border-cyan disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2.5">
                          <Avatar fotoUrl={f.foto_url} nombre={f.nombre} apellidos={f.apellidos} />
                          <div>
                            <p>
                              {f.nombre} {f.apellidos}
                            </p>
                            {!f.disponible_para_jugar && (
                              <p className="text-xs text-coral">No disponible esta temporada</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {f.posicion_principal ? POSICION_LABEL[f.posicion_principal] : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ToggleChip
                          on={f.disponible}
                          onClick={() => c.toggleDisponible(f)}
                          disabled={!c.puedeEditar || !f.disponible_para_jugar}
                          onColor="lime"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <ToggleChip
                          on={f.titular}
                          onClick={() => c.toggleTitular(f)}
                          disabled={!c.puedeEditar || !f.disponible}
                          onColor="purple"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <ToggleChip
                          on={f.es_portero}
                          onClick={() => c.togglePortero(f)}
                          disabled={!c.puedeEditar || !f.disponible}
                          onColor="cyan"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {c.filasFiltradas.length === 0 && (
                <p className="p-6 text-center text-sm text-muted">
                  Ningún jugador coincide con la búsqueda.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ----------------------------- Subcomponentes ----------------------------- */

function Avatar({
  fotoUrl,
  nombre,
  apellidos,
}: {
  fotoUrl: string | null;
  nombre: string;
  apellidos: string;
}) {
  if (fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fotoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />;
  }
  const iniciales = `${nombre[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase();
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-muted">
      {iniciales}
    </span>
  );
}

function ToggleChip({
  on,
  onClick,
  disabled,
  onColor,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  onColor: "lime" | "cyan" | "purple";
}) {
  const onClasses =
    onColor === "lime"
      ? "bg-lime/20 border-lime/50 text-lime"
      : onColor === "cyan"
        ? "bg-cyan/20 border-cyan/50 text-cyan"
        : "bg-purple-500/20 border-purple-500/50 text-purple-300";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        on ? onClasses : "border-border text-muted hover:text-ink"
      }`}
    >
      {on ? "Sí" : "No"}
    </button>
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
