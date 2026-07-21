"use client";

import { useEffect } from "react";

import { useConvocatoria } from "@/lib/use-convocatoria";
import { POSICIONES, POSICION_LABEL, type PosicionJugador } from "@/lib/types";

/**
 * Convocatoria como popup dentro de Match Live: misma lógica que la página
 * de Club Manager (vía useConvocatoria), pero con el tema claro/morado de
 * Match Live — para que crear un partido desde /live nunca navegue a la
 * zona de gestión del club.
 */
export function ConvocatoriaPopup({
  partidoId,
  onClose,
  onSaved,
}: {
  partidoId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const c = useConvocatoria(partidoId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function guardar() {
    const ok = await c.guardar();
    if (ok) onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Convocatoria"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Convocatoria{c.partido ? ` · vs ${c.partido.rival_nombre}` : ""}
            </h2>
            {!c.loading && c.partido && (
              <p className="text-sm text-slate-500">
                {c.resumen.disponibles} disponibles de {c.resumen.total} · {c.resumen.titulares} titulares ·{" "}
                {c.resumen.porteros} {c.resumen.porteros === 1 ? "portero" : "porteros"}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 transition hover:text-slate-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {c.loading || !c.partido ? (
            <p className="text-center text-slate-500">Cargando convocatoria…</p>
          ) : (
            <>
              {c.error && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {c.error}
                </p>
              )}
              {c.bloqueada && (
                <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Este partido está {c.partido.estado === "FINALIZADO" ? "finalizado" : "cancelado"}: la
                  convocatoria no se puede modificar.
                </p>
              )}
              {c.resumen.porteros === 0 && (
                <p className="mb-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                  Debes convocar al menos un portero.
                </p>
              )}
              {c.dorsalesDuplicados.size > 0 && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  Dorsal duplicado en la convocatoria:{" "}
                  {[...c.dorsalesDuplicados].sort((a, b) => a - b).join(", ")}
                </p>
              )}

              {c.filas.length === 0 ? (
                <p className="py-10 text-center text-slate-400">
                  Este equipo no tiene jugadores en plantilla todavía.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <input
                      value={c.busqueda}
                      onChange={(e) => c.setBusqueda(e.target.value)}
                      placeholder="Buscar por nombre o dorsal…"
                      className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
                    />
                    <select
                      value={c.filtroPosicion}
                      onChange={(e) => c.setFiltroPosicion(e.target.value as PosicionJugador | "")}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
                    >
                      <option value="">Todas las posiciones</option>
                      {POSICIONES.map((p) => (
                        <option key={p} value={p}>
                          {POSICION_LABEL[p]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-2.5 font-medium">#</th>
                          <th className="px-4 py-2.5 font-medium">Jugador</th>
                          <th className="px-4 py-2.5 font-medium">Posición</th>
                          <th className="px-4 py-2.5 font-medium">Disponible</th>
                          <th className="px-4 py-2.5 font-medium">Titular</th>
                          <th className="px-4 py-2.5 font-medium">Portero</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.filasFiltradas.map((f) => (
                          <tr
                            key={f.jugador_id}
                            className={`border-b border-slate-100 last:border-0 ${
                              !f.disponible_para_jugar ? "opacity-50" : ""
                            } ${f.dorsal != null && c.dorsalesDuplicados.has(f.dorsal) ? "bg-red-50" : ""}`}
                          >
                            <td className="px-4 py-2.5">
                              <input
                                type="number"
                                min={0}
                                max={99}
                                value={f.dorsal ?? ""}
                                onChange={(e) => c.cambiarDorsal(f.jugador_id, e.target.value)}
                                disabled={!c.puedeEditar}
                                className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-sm tabular-nums outline-none focus:border-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
                              />
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-800">
                              <div className="flex items-center gap-2.5">
                                <Avatar fotoUrl={f.foto_url} nombre={f.nombre} apellidos={f.apellidos} />
                                <div>
                                  <p>
                                    {f.nombre} {f.apellidos}
                                  </p>
                                  {!f.disponible_para_jugar && (
                                    <p className="text-xs text-red-500">No disponible esta temporada</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">
                              {f.posicion_principal ? POSICION_LABEL[f.posicion_principal] : "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <ToggleChip
                                on={f.disponible}
                                onClick={() => c.toggleDisponible(f)}
                                disabled={!c.puedeEditar || !f.disponible_para_jugar}
                                color="emerald"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <ToggleChip
                                on={f.titular}
                                onClick={() => c.toggleTitular(f)}
                                disabled={!c.puedeEditar || !f.disponible}
                                color="purple"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <ToggleChip
                                on={f.es_portero}
                                onClick={() => c.togglePortero(f)}
                                disabled={!c.puedeEditar || !f.disponible}
                                color="sky"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {c.filasFiltradas.length === 0 && (
                      <p className="p-6 text-center text-sm text-slate-400">
                        Ningún jugador coincide con la búsqueda.
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {c.puedeEditar && c.partido && (
          <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
            <button
              onClick={guardar}
              disabled={c.saving || c.dorsalesDuplicados.size > 0}
              className="rounded-xl bg-purple-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
            >
              {c.saving ? "Guardando…" : c.guardado ? "Guardado ✓" : "Guardar convocatoria"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
    <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
      {iniciales}
    </span>
  );
}

function ToggleChip({
  on,
  onClick,
  disabled,
  color,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  color: "emerald" | "sky" | "purple";
}) {
  const onClasses =
    color === "emerald"
      ? "bg-emerald-100 border-emerald-300 text-emerald-700"
      : color === "sky"
        ? "bg-sky-100 border-sky-300 text-sky-700"
        : "bg-purple-100 border-purple-300 text-purple-700";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        on ? onClasses : "border-slate-200 text-slate-400 hover:text-slate-600"
      }`}
    >
      {on ? "Sí" : "No"}
    </button>
  );
}
