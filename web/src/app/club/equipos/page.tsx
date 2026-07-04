"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Button,
  ErrorMessage,
  LabeledInput,
  LabeledSelect,
  Modal,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken, type RolClub } from "@/lib/auth";
import { useClub } from "@/lib/club-context";
import {
  CATEGORIAS,
  GENEROS,
  ROL_LABEL,
  STAFF_ROLES,
  TIPOS,
  type CategoriaEquipo,
  type ClubMember,
  type Equipo,
  type GeneroEquipo,
  type StaffItem,
  type Temporada,
  type TipoEquipo,
} from "@/lib/types";

export default function EquiposPage() {
  const { club, role, loading: clubLoading } = useClub();
  const isAdmin = role === "GESTOR_CLUB";

  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [temporadaId, setTemporadaId] = useState<string>("");
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEquipoModal, setShowEquipoModal] = useState(false);
  const [showTemporadaModal, setShowTemporadaModal] = useState(false);
  const [staffEquipo, setStaffEquipo] = useState<Equipo | null>(null);

  const clubId = club?.id;

  const loadTemporadas = useCallback(async () => {
    if (!clubId) return;
    const data = await apiFetch<Temporada[]>(
      `/clubes/${clubId}/temporadas`,
      { token: getToken() },
    );
    setTemporadas(data);
    setTemporadaId((prev) => {
      if (prev && data.some((t) => t.id === prev)) return prev;
      return data.find((t) => t.activa)?.id ?? data[0]?.id ?? "";
    });
  }, [clubId]);

  const loadEquipos = useCallback(async () => {
    if (!clubId || !temporadaId) {
      setEquipos([]);
      return;
    }
    // El no-admin (entrenador/ayudante) solo ve sus equipos asignados.
    const soloMios = isAdmin ? "" : "&solo_mios=true";
    const data = await apiFetch<Equipo[]>(
      `/clubes/${clubId}/equipos?temporada_id=${temporadaId}${soloMios}`,
      { token: getToken() },
    );
    setEquipos(data);
  }, [clubId, temporadaId, isAdmin]);

  // Carga inicial de temporadas
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await loadTemporadas();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId, loadTemporadas]);

  // Recarga de equipos al cambiar de temporada
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await loadEquipos();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error al cargar equipos");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadEquipos]);

  if (clubLoading || loading) {
    return <CenteredHint text="Cargando equipos…" />;
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isAdmin ? "Equipos" : "Mis equipos"}
          </h1>
          <p className="text-sm text-muted">{club?.nombre}</p>
        </div>
        <div className="flex items-center gap-3">
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
          {isAdmin && temporadas.length > 0 && (
            <Button onClick={() => setShowEquipoModal(true)}>+ Nuevo equipo</Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-6">
        {error && <ErrorMessage message={error} />}

        {temporadas.length === 0 ? (
          <EmptyTemporadas
            isAdmin={isAdmin}
            onCreate={() => setShowTemporadaModal(true)}
          />
        ) : equipos.length === 0 ? (
          <CenteredHint
            text="No hay equipos en esta temporada todavía."
            icon="🛡️"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {equipos.map((e) => (
              <EquipoCard
                key={e.id}
                equipo={e}
                onStaff={isAdmin ? () => setStaffEquipo(e) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {clubId && (
        <NuevoEquipoModal
          open={showEquipoModal}
          onClose={() => setShowEquipoModal(false)}
          clubId={clubId}
          temporadaId={temporadaId}
          onCreated={() => {
            setShowEquipoModal(false);
            loadEquipos();
          }}
        />
      )}

      {clubId && (
        <NuevaTemporadaModal
          open={showTemporadaModal}
          onClose={() => setShowTemporadaModal(false)}
          clubId={clubId}
          onCreated={async (nuevaId) => {
            setShowTemporadaModal(false);
            await loadTemporadas();
            setTemporadaId(nuevaId);
          }}
        />
      )}

      {clubId && staffEquipo && (
        <StaffModal
          clubId={clubId}
          equipo={staffEquipo}
          onClose={() => setStaffEquipo(null)}
        />
      )}
    </>
  );
}

/* ----------------------------- Subcomponentes ----------------------------- */

function EquipoCard({
  equipo,
  onStaff,
}: {
  equipo: Equipo;
  onStaff?: () => void;
}) {
  const tipoColor =
    equipo.tipo === "RIVAL" ? "text-coral border-coral/40" : "text-cyan border-cyan/40";
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-petrol-bright/20 text-sm font-bold">
          {(equipo.nombre_corto ?? equipo.nombre).slice(0, 3).toUpperCase()}
        </span>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${tipoColor}`}>
          {equipo.tipo}
        </span>
      </div>
      <h3 className="font-semibold">{equipo.nombre}</h3>
      <p className="mt-1 text-sm text-muted">
        {titleCase(equipo.categoria)} · {titleCase(equipo.genero)}
      </p>
      {onStaff && (
        <button
          onClick={onStaff}
          className="mt-4 w-full rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          Cuerpo técnico
        </button>
      )}
    </div>
  );
}

function EmptyTemporadas({
  isAdmin,
  onCreate,
}: {
  isAdmin: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-petrol-bright/20 text-xl">
          📅
        </div>
        <h2 className="text-lg font-semibold">Necesitas una temporada</h2>
        <p className="mt-2 text-sm text-muted">
          Los equipos pertenecen a una temporada. Crea la primera para empezar a
          añadir equipos.
        </p>
        {isAdmin && (
          <div className="mt-5">
            <Button onClick={onCreate}>+ Crear temporada</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function NuevoEquipoModal({
  open,
  onClose,
  clubId,
  temporadaId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  clubId: string;
  temporadaId: string;
  onCreated: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [nombreCorto, setNombreCorto] = useState("");
  const [categoria, setCategoria] = useState<CategoriaEquipo>("SENIOR");
  const [genero, setGenero] = useState<GeneroEquipo>("MASCULINO");
  const [tipo, setTipo] = useState<TipoEquipo>("PROPIO");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/clubes/${clubId}/equipos`, {
        method: "POST",
        token: getToken(),
        body: {
          temporada_id: temporadaId,
          nombre,
          nombre_corto: nombreCorto || null,
          categoria,
          genero,
          tipo,
        },
      });
      setNombre("");
      setNombreCorto("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el equipo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo equipo">
      <form onSubmit={submit} className="space-y-4">
        <LabeledInput
          label="Nombre"
          value={nombre}
          onChange={setNombre}
          placeholder="Senior Masculino"
          required
        />
        <LabeledInput
          label="Nombre corto (opcional)"
          value={nombreCorto}
          onChange={setNombreCorto}
          placeholder="SEN-M"
        />
        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect
            label="Categoría"
            value={categoria}
            onChange={(v) => setCategoria(v as CategoriaEquipo)}
            options={CATEGORIAS.map((c) => ({ value: c, label: titleCase(c) }))}
          />
          <LabeledSelect
            label="Género"
            value={genero}
            onChange={(v) => setGenero(v as GeneroEquipo)}
            options={GENEROS.map((g) => ({ value: g, label: titleCase(g) }))}
          />
        </div>
        <LabeledSelect
          label="Tipo"
          value={tipo}
          onChange={(v) => setTipo(v as TipoEquipo)}
          options={TIPOS.map((t) => ({
            value: t,
            label: t === "PROPIO" ? "Propio" : "Rival (scouting)",
          }))}
        />

        <ErrorMessage message={error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creando…" : "Crear equipo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function NuevaTemporadaModal({
  open,
  onClose,
  clubId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  clubId: string;
  onCreated: (nuevaId: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const t = await apiFetch<Temporada>(`/clubes/${clubId}/temporadas`, {
        method: "POST",
        token: getToken(),
        body: {
          nombre,
          fecha_inicio: inicio,
          fecha_fin: fin,
          activa: true,
        },
      });
      onCreated(t.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear la temporada",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva temporada">
      <form onSubmit={submit} className="space-y-4">
        <LabeledInput
          label="Nombre"
          value={nombre}
          onChange={setNombre}
          placeholder="2026/27"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput
            label="Inicio"
            type="date"
            value={inicio}
            onChange={setInicio}
            required
          />
          <LabeledInput
            label="Fin"
            type="date"
            value={fin}
            onChange={setFin}
            required
          />
        </div>

        <ErrorMessage message={error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creando…" : "Crear temporada"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StaffModal({
  clubId,
  equipo,
  onClose,
}: {
  clubId: string;
  equipo: Equipo;
  onClose: () => void;
}) {
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [usuarioId, setUsuarioId] = useState("");
  const [rol, setRol] = useState<RolClub>("ENTRENADOR");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [s, m] = await Promise.all([
      apiFetch<StaffItem[]>(
        `/clubes/${clubId}/equipos/${equipo.id}/usuarios`,
        { token: getToken() },
      ),
      apiFetch<ClubMember[]>(`/clubes/${clubId}/usuarios`, {
        token: getToken(),
      }),
    ]);
    setStaff(s);
    setMembers(m);
    setUsuarioId((prev) => prev || m[0]?.usuario_id || "");
  }, [clubId, equipo.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/clubes/${clubId}/equipos/${equipo.id}/usuarios`, {
        method: "POST",
        token: getToken(),
        body: { usuario_id: usuarioId, rol },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(uid: string) {
    setError(null);
    try {
      await apiFetch(`/clubes/${clubId}/equipos/${equipo.id}/usuarios/${uid}`, {
        method: "DELETE",
        token: getToken(),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar");
    }
  }

  return (
    <Modal open onClose={onClose} title={`Cuerpo técnico · ${equipo.nombre}`}>
      <div className="space-y-5">
        {/* Lista actual */}
        <div>
          {loading ? (
            <p className="text-sm text-muted">Cargando…</p>
          ) : staff.length === 0 ? (
            <p className="text-sm text-muted">
              Nadie asignado todavía a este equipo.
            </p>
          ) : (
            <ul className="space-y-2">
              {staff.map((s) => (
                <li
                  key={s.asignacion.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-bg/40 px-3 py-2"
                >
                  <span className="text-sm">
                    {s.usuario.nombre} {s.usuario.apellidos ?? ""}
                    <span className="ml-2 text-xs text-cyan">
                      {ROL_LABEL[s.asignacion.rol]}
                    </span>
                  </span>
                  <button
                    onClick={() => remove(s.asignacion.usuario_id)}
                    className="text-xs text-coral transition hover:underline"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alta */}
        <form onSubmit={add} className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium">Asignar miembro</p>
          {members.length === 0 ? (
            <p className="text-sm text-muted">
              No hay miembros en el club para asignar.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <LabeledSelect
                  label="Miembro"
                  value={usuarioId}
                  onChange={setUsuarioId}
                  options={members.map((m) => ({
                    value: m.usuario_id,
                    label: `${m.nombre} ${m.apellidos ?? ""}`.trim(),
                  }))}
                />
                <LabeledSelect
                  label="Rol en el equipo"
                  value={rol}
                  onChange={(v) => setRol(v as RolClub)}
                  options={STAFF_ROLES.map((r) => ({
                    value: r,
                    label: ROL_LABEL[r],
                  }))}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving || !usuarioId}>
                  {saving ? "Asignando…" : "Asignar"}
                </Button>
              </div>
            </>
          )}
          <ErrorMessage message={error} />
        </form>
      </div>
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

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
