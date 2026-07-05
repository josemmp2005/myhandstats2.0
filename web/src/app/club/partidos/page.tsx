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
  ESTADO_PARTIDO_LABEL,
  LOCALIZACIONES,
  LOCALIZACION_LABEL,
  MODOS_TOMA_DATOS,
  MODO_TOMA_DATOS_LABEL,
  type Competicion,
  type Equipo,
  type EstadoPartido,
  type ModoTomaDatos,
  type Partido,
  type Temporada,
  type TipoLocalizacionPartido,
} from "@/lib/types";

type FiltroEstado = "TODOS" | EstadoPartido;

export default function PartidosPage() {
  const { club, role, loading: clubLoading } = useClub();
  const isAdmin = role === "GESTOR_CLUB";
  const canManage = isAdmin || role === "ENTRENADOR";

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
                  {isAdmin && <th className="px-4 py-3" />}
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
          onCreated={() => {
            setShowModal(false);
            loadPartidos();
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
  onCancelar,
}: {
  partido: Partido;
  equipoNombre: string;
  competicionNombre: string | null;
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
      {onCancelar && (
        <td className="px-4 py-3 text-right">
          <button
            onClick={onCancelar}
            className="text-xs text-coral transition hover:underline"
          >
            Cancelar
          </button>
        </td>
      )}
    </tr>
  );
}

function NuevoPartidoModal({
  open,
  onClose,
  clubId,
  equipos,
  rivales,
  competiciones,
  onCompeticionCreada,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  clubId: string;
  equipos: Equipo[];
  rivales: Equipo[];
  competiciones: Competicion[];
  onCompeticionCreada: (c: Competicion) => void;
  onCreated: () => void;
}) {
  const [equipoId, setEquipoId] = useState(equipos[0]?.id ?? "");
  const [rivalEquipoId, setRivalEquipoId] = useState("");
  const [rivalNombre, setRivalNombre] = useState("");
  const [competicionId, setCompeticionId] = useState("");
  const [modoTomaDatos, setModoTomaDatos] = useState<ModoTomaDatos>("EQUIPO_PROPIO");
  const [tipoLocalizacion, setTipoLocalizacion] =
    useState<TipoLocalizacionPartido>("LOCAL");
  const [pabellon, setPabellon] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setEquipoId((prev) => prev || equipos[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function elegirRival(id: string) {
    setRivalEquipoId(id);
    const rival = rivales.find((r) => r.id === id);
    if (rival) setRivalNombre(rival.nombre);
  }

  const scoutingSinRival = modoTomaDatos === "SCOUTING_COMPLETO" && !rivalEquipoId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!equipoId || scoutingSinRival) return;
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/clubes/${clubId}/partidos`, {
        method: "POST",
        token: getToken(),
        body: {
          equipo_id: equipoId,
          rival_equipo_id: rivalEquipoId || null,
          rival_nombre: rivalNombre,
          competicion_id: competicionId || null,
          modo_toma_datos: modoTomaDatos,
          tipo_localizacion: tipoLocalizacion,
          pabellon: pabellon || null,
          fecha_partido: fecha,
          notas: notas || null,
        },
      });
      setRivalEquipoId("");
      setRivalNombre("");
      setCompeticionId("");
      setPabellon("");
      setFecha("");
      setNotas("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el partido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo partido">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect
            label="Nuestro equipo"
            value={equipoId}
            onChange={setEquipoId}
            options={equipos.map((eq) => ({ value: eq.id, label: eq.nombre }))}
          />
          <LabeledSelect
            label="Localización"
            value={tipoLocalizacion}
            onChange={(v) => setTipoLocalizacion(v as TipoLocalizacionPartido)}
            options={LOCALIZACIONES.map((l) => ({
              value: l,
              label: LOCALIZACION_LABEL[l],
            }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect
            label="Equipo rival (opcional)"
            value={rivalEquipoId}
            onChange={elegirRival}
            options={[
              { value: "", label: "Sin equipo rival registrado" },
              ...rivales.map((r) => ({ value: r.id, label: r.nombre })),
            ]}
          />
          <LabeledInput
            label="Nombre del rival"
            value={rivalNombre}
            onChange={setRivalNombre}
            placeholder="BM Norte"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect
            label="Modo de toma de datos"
            value={modoTomaDatos}
            onChange={(v) => setModoTomaDatos(v as ModoTomaDatos)}
            options={MODOS_TOMA_DATOS.map((m) => ({
              value: m,
              label: MODO_TOMA_DATOS_LABEL[m],
            }))}
          />
          <LabeledInput
            label="Fecha y hora"
            type="datetime-local"
            value={fecha}
            onChange={setFecha}
            required
          />
        </div>
        {scoutingSinRival && (
          <ErrorMessage message="El scouting completo requiere seleccionar un equipo rival registrado." />
        )}

        <CompeticionField
          clubId={clubId}
          temporadaId={equipos.find((eq) => eq.id === equipoId)?.temporada_id ?? ""}
          competiciones={competiciones}
          value={competicionId}
          onChange={setCompeticionId}
          onCreated={onCompeticionCreada}
        />

        <LabeledInput
          label="Pabellón (opcional)"
          value={pabellon}
          onChange={setPabellon}
          placeholder="Pabellón Municipal"
        />
        <LabeledInput
          label="Notas (opcional)"
          value={notas}
          onChange={setNotas}
        />

        <ErrorMessage message={error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !equipoId || scoutingSinRival}>
            {saving ? "Creando…" : "Crear partido"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CompeticionField({
  clubId,
  temporadaId,
  competiciones,
  value,
  onChange,
  onCreated,
}: {
  clubId: string;
  temporadaId: string;
  competiciones: Competicion[];
  value: string;
  onChange: (v: string) => void;
  onCreated: (c: Competicion) => void;
}) {
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    if (!nombre.trim() || !temporadaId) return;
    setSaving(true);
    setError(null);
    try {
      const c = await apiFetch<Competicion>(`/clubes/${clubId}/competiciones`, {
        method: "POST",
        token: getToken(),
        body: { temporada_id: temporadaId, nombre },
      });
      onCreated(c);
      onChange(c.id);
      setNombre("");
      setCreando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la competición");
    } finally {
      setSaving(false);
    }
  }

  if (creando) {
    return (
      <div className="space-y-2">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Nueva competición
        </span>
        <div className="flex gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Liga Territorial"
            className="w-full rounded-xl border border-border bg-bg/60 px-4 py-2.5 text-ink outline-none placeholder:text-muted/60 focus:border-cyan"
          />
          <Button type="button" onClick={crear} disabled={saving || !nombre.trim()}>
            {saving ? "…" : "Añadir"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setCreando(false)}>
            ✕
          </Button>
        </div>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-2">
      <LabeledSelect
        label="Competición (opcional)"
        value={value}
        onChange={onChange}
        options={[
          { value: "", label: "Sin competición" },
          ...competiciones.map((c) => ({ value: c.id, label: c.nombre })),
        ]}
      />
      <Button type="button" variant="ghost" onClick={() => setCreando(true)}>
        + Nueva
      </Button>
    </div>
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
