"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  Button,
  ErrorMessage,
  LabeledInput,
  LabeledSelect,
  Modal,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useClub } from "@/lib/club-context";
import {
  MANO_LABEL,
  MANOS,
  POSICION_LABEL,
  POSICIONES,
  TIPOS_JUGADOR,
  type Equipo,
  type Jugador,
  type ManoDominante,
  type PosicionJugador,
  type TipoJugador,
} from "@/lib/types";

type FiltroTipo = "TODOS" | TipoJugador;

export default function JugadoresPage() {
  const { club, role, loading: clubLoading } = useClub();
  const isAdmin = role === "GESTOR_CLUB";
  // El entrenador también puede dar de alta jugadores (en sus equipos asignados).
  const canManage = isAdmin || role === "ENTRENADOR";

  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("TODOS");
  const [filtroEquipo, setFiltroEquipo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Jugador | null>(null);

  const clubId = club?.id;

  const loadJugadores = useCallback(async () => {
    if (!clubId) return;
    const tipo = filtroTipo === "TODOS" ? "" : `&tipo=${filtroTipo}`;
    const equipo = filtroEquipo ? `&equipo_id=${filtroEquipo}` : "";
    const data = await apiFetch<Jugador[]>(
      `/clubes/${clubId}/jugadores?activo=true${tipo}${equipo}`,
      { token: getToken() },
    );
    setJugadores(data);
  }, [clubId, filtroTipo, filtroEquipo]);

  const loadEquipos = useCallback(async () => {
    if (!clubId) return;
    // El no-admin (entrenador/ayudante) solo ve sus equipos asignados.
    const soloMios = isAdmin ? "" : "?solo_mios=true";
    const data = await apiFetch<Equipo[]>(
      `/clubes/${clubId}/equipos${soloMios}`,
      { token: getToken() },
    );
    setEquipos(data);
  }, [clubId, isAdmin]);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await Promise.all([loadJugadores(), loadEquipos()]);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error al cargar jugadores");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Solo en la carga inicial: los cambios de filtro se manejan aparte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // Recarga de jugadores al cambiar los filtros (sin recargar equipos).
  useEffect(() => {
    if (!clubId || loading) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadJugadores();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error al cargar jugadores");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTipo, filtroEquipo]);

  async function darDeBaja(j: Jugador) {
    if (!clubId) return;
    if (!window.confirm(`¿Dar de baja a ${j.nombre} ${j.apellidos}?`)) return;
    setError(null);
    try {
      await apiFetch(`/clubes/${clubId}/jugadores/${j.id}`, {
        method: "DELETE",
        token: getToken(),
      });
      await loadJugadores();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo dar de baja");
    }
  }

  const visibles = jugadores.filter((j) =>
    `${j.nombre} ${j.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()),
  );

  if (clubLoading || loading) {
    return <CenteredHint text="Cargando jugadores…" />;
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Jugadores</h1>
          <p className="text-sm text-muted">{club?.nombre}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar jugador…"
            className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-cyan"
          />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
            className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
          >
            <option value="TODOS" className="bg-surface">
              Todos
            </option>
            <option value="PROPIO" className="bg-surface">
              Propios
            </option>
            <option value="RIVAL" className="bg-surface">
              Rivales
            </option>
          </select>
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
          {canManage && (
            <Button onClick={() => setShowModal(true)}>+ Nuevo jugador</Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-6">
        {error && <ErrorMessage message={error} />}

        {visibles.length === 0 ? (
          <CenteredHint
            text={
              jugadores.length === 0
                ? "No hay jugadores todavía. Crea el primero para empezar a montar plantillas."
                : "Ningún jugador coincide con la búsqueda."
            }
            icon="🤾"
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Jugador</th>
                  <th className="px-4 py-3 font-medium">Posición</th>
                  <th className="px-4 py-3 font-medium">Mano</th>
                  <th className="px-4 py-3 font-medium">Edad</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  {canManage && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {visibles.map((j) => (
                  <JugadorRow
                    key={j.id}
                    jugador={j}
                    onEdit={canManage ? () => setEditando(j) : undefined}
                    onBaja={isAdmin ? () => darDeBaja(j) : undefined}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {clubId && (
        <NuevoJugadorModal
          open={showModal}
          onClose={() => setShowModal(false)}
          clubId={clubId}
          equipos={equipos}
          onCreated={() => {
            setShowModal(false);
            loadJugadores();
          }}
        />
      )}

      {clubId && editando && (
        <EditarJugadorModal
          jugador={editando}
          clubId={clubId}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            loadJugadores();
          }}
        />
      )}
    </>
  );
}

/* ----------------------------- Subcomponentes ----------------------------- */

function JugadorRow({
  jugador,
  onEdit,
  onBaja,
}: {
  jugador: Jugador;
  onEdit?: () => void;
  onBaja?: () => void;
}) {
  const tipoColor =
    jugador.tipo === "RIVAL"
      ? "text-coral border-coral/40"
      : "text-cyan border-cyan/40";
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-petrol-bright/20 text-xs font-bold">
            {iniciales(jugador)}
          </span>
          <Link
            href={`/club/jugadores/${jugador.id}`}
            className="font-medium transition hover:text-cyan hover:underline"
          >
            {jugador.nombre} {jugador.apellidos}
          </Link>
        </div>
      </td>
      <td className="px-4 py-3 text-muted">
        {jugador.posicion_principal
          ? POSICION_LABEL[jugador.posicion_principal]
          : "—"}
        {jugador.posicion_secundaria && (
          <span className="text-xs">
            {" "}
            / {POSICION_LABEL[jugador.posicion_secundaria]}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-muted">
        {jugador.mano_dominante === "DESCONOCIDA"
          ? "—"
          : MANO_LABEL[jugador.mano_dominante]}
      </td>
      <td className="px-4 py-3 text-muted">{edad(jugador.fecha_nacimiento)}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${tipoColor}`}>
          {jugador.tipo}
        </span>
      </td>
      {(onEdit || onBaja) && (
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-3">
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-xs text-cyan transition hover:underline"
              >
                Editar
              </button>
            )}
            {onBaja && (
              <button
                onClick={onBaja}
                className="text-xs text-coral transition hover:underline"
              >
                Dar de baja
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

function NuevoJugadorModal({
  open,
  onClose,
  clubId,
  equipos,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  clubId: string;
  equipos: Equipo[];
  onCreated: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [tipo, setTipo] = useState<TipoJugador>("PROPIO");
  const [posPrincipal, setPosPrincipal] = useState<string>("");
  const [posSecundaria, setPosSecundaria] = useState<string>("");
  const [mano, setMano] = useState<ManoDominante>("DESCONOCIDA");
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [equipoId, setEquipoId] = useState("");
  const [dorsal, setDorsal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const posOptions = [
    { value: "", label: "Sin definir" },
    ...POSICIONES.map((p) => ({ value: p, label: POSICION_LABEL[p] })),
  ];

  // Un jugador propio va a un equipo propio; uno rival, a un equipo rival.
  const equiposDelTipo = equipos.filter((eq) => eq.tipo === tipo);

  useEffect(() => {
    setEquipoId((prev) =>
      equiposDelTipo.some((eq) => eq.id === prev)
        ? prev
        : equiposDelTipo[0]?.id ?? "",
    );
  }, [tipo, equiposDelTipo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!equipoId) return;
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/clubes/${clubId}/jugadores`, {
        method: "POST",
        token: getToken(),
        body: {
          nombre,
          apellidos,
          fecha_nacimiento: fechaNacimiento || null,
          tipo,
          mano_dominante: mano,
          posicion_principal: posPrincipal || null,
          posicion_secundaria: posSecundaria || null,
          altura_cm: altura ? Number(altura) : null,
          peso_kg: peso ? Number(peso) : null,
          equipo_id: equipoId,
          dorsal: dorsal ? Number(dorsal) : null,
        },
      });
      setNombre("");
      setApellidos("");
      setFechaNacimiento("");
      setPosPrincipal("");
      setPosSecundaria("");
      setAltura("");
      setPeso("");
      setDorsal("");
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear el jugador",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo jugador">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput
            label="Nombre"
            value={nombre}
            onChange={setNombre}
            placeholder="Marta"
            required
          />
          <LabeledInput
            label="Apellidos"
            value={apellidos}
            onChange={setApellidos}
            placeholder="García Ruiz"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput
            label="Fecha de nacimiento (opcional)"
            type="date"
            value={fechaNacimiento}
            onChange={setFechaNacimiento}
          />
          <LabeledSelect
            label="Tipo"
            value={tipo}
            onChange={(v) => setTipo(v as TipoJugador)}
            options={TIPOS_JUGADOR.map((t) => ({
              value: t,
              label: t === "PROPIO" ? "Propio" : "Rival (scouting)",
            }))}
          />
        </div>

        {equiposDelTipo.length === 0 ? (
          <ErrorMessage
            message={
              tipo === "PROPIO"
                ? "No tienes equipos propios disponibles. Crea un equipo antes de dar de alta jugadores."
                : "No hay equipos rivales creados todavía. Crea uno para poder fichar jugadores de scouting."
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <LabeledSelect
              label="Equipo"
              value={equipoId}
              onChange={setEquipoId}
              options={equiposDelTipo.map((eq) => ({
                value: eq.id,
                label: eq.nombre,
              }))}
            />
            <LabeledInput
              label="Dorsal (opcional)"
              type="number"
              value={dorsal}
              onChange={setDorsal}
              placeholder="7"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect
            label="Posición principal"
            value={posPrincipal}
            onChange={setPosPrincipal}
            options={posOptions}
          />
          <LabeledSelect
            label="Posición secundaria"
            value={posSecundaria}
            onChange={setPosSecundaria}
            options={posOptions}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <LabeledSelect
            label="Mano dominante"
            value={mano}
            onChange={(v) => setMano(v as ManoDominante)}
            options={MANOS.map((m) => ({ value: m, label: MANO_LABEL[m] }))}
          />
          <LabeledInput
            label="Altura (cm)"
            type="number"
            value={altura}
            onChange={setAltura}
            placeholder="180"
          />
          <LabeledInput
            label="Peso (kg)"
            type="number"
            value={peso}
            onChange={setPeso}
            placeholder="75"
          />
        </div>

        <ErrorMessage message={error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !equipoId}>
            {saving ? "Creando…" : "Crear jugador"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditarJugadorModal({
  jugador,
  clubId,
  onClose,
  onSaved,
}: {
  jugador: Jugador;
  clubId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(jugador.nombre);
  const [apellidos, setApellidos] = useState(jugador.apellidos);
  const [fechaNacimiento, setFechaNacimiento] = useState(
    jugador.fecha_nacimiento ?? "",
  );
  const [tipo, setTipo] = useState<TipoJugador>(jugador.tipo);
  const [posPrincipal, setPosPrincipal] = useState<string>(
    jugador.posicion_principal ?? "",
  );
  const [posSecundaria, setPosSecundaria] = useState<string>(
    jugador.posicion_secundaria ?? "",
  );
  const [mano, setMano] = useState<ManoDominante>(jugador.mano_dominante);
  const [altura, setAltura] = useState(
    jugador.altura_cm != null ? String(jugador.altura_cm) : "",
  );
  const [peso, setPeso] = useState(
    jugador.peso_kg != null ? String(jugador.peso_kg) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const posOptions = [
    { value: "", label: "Sin definir" },
    ...POSICIONES.map((p) => ({ value: p, label: POSICION_LABEL[p] })),
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/clubes/${clubId}/jugadores/${jugador.id}`, {
        method: "PATCH",
        token: getToken(),
        body: {
          nombre,
          apellidos,
          fecha_nacimiento: fechaNacimiento || null,
          tipo,
          mano_dominante: mano,
          posicion_principal: posPrincipal || null,
          posicion_secundaria: posSecundaria || null,
          altura_cm: altura ? Number(altura) : null,
          peso_kg: peso ? Number(peso) : null,
        },
      });
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el jugador",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Editar · ${jugador.nombre} ${jugador.apellidos}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="Nombre" value={nombre} onChange={setNombre} required />
          <LabeledInput
            label="Apellidos"
            value={apellidos}
            onChange={setApellidos}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput
            label="Fecha de nacimiento (opcional)"
            type="date"
            value={fechaNacimiento}
            onChange={setFechaNacimiento}
          />
          <LabeledSelect
            label="Tipo"
            value={tipo}
            onChange={(v) => setTipo(v as TipoJugador)}
            options={TIPOS_JUGADOR.map((t) => ({
              value: t,
              label: t === "PROPIO" ? "Propio" : "Rival (scouting)",
            }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect
            label="Posición principal"
            value={posPrincipal}
            onChange={setPosPrincipal}
            options={posOptions}
          />
          <LabeledSelect
            label="Posición secundaria"
            value={posSecundaria}
            onChange={setPosSecundaria}
            options={posOptions}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <LabeledSelect
            label="Mano dominante"
            value={mano}
            onChange={(v) => setMano(v as ManoDominante)}
            options={MANOS.map((m) => ({ value: m, label: MANO_LABEL[m] }))}
          />
          <LabeledInput
            label="Altura (cm)"
            type="number"
            value={altura}
            onChange={setAltura}
          />
          <LabeledInput
            label="Peso (kg)"
            type="number"
            value={peso}
            onChange={setPeso}
          />
        </div>

        <ErrorMessage message={error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
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

function iniciales(j: Jugador): string {
  return `${j.nombre.charAt(0)}${j.apellidos.charAt(0)}`.toUpperCase();
}

function edad(fecha: string | null): string {
  if (!fecha) return "—";
  const nac = new Date(fecha);
  const hoy = new Date();
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e -= 1;
  return `${e} años`;
}
