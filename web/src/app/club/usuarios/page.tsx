"use client";

import { useCallback, useEffect, useState } from "react";

import { Button, ErrorMessage, LabeledInput, LabeledSelect } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken, type RolClub } from "@/lib/auth";
import { useClub } from "@/lib/club-context";
import {
  INVITE_ROLES,
  ROL_LABEL,
  type ClubMember,
  type Invitacion,
} from "@/lib/types";

const ROLE_OPTIONS = INVITE_ROLES.map((r) => ({ value: r, label: ROL_LABEL[r] }));

export default function UsuariosPage() {
  const { club, role, loading: clubLoading } = useClub();
  const isAdmin = role === "GESTOR_CLUB";
  const clubId = club?.id;

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [invs, setInvs] = useState<Invitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    const [m, i] = await Promise.all([
      apiFetch<ClubMember[]>(`/clubes/${clubId}/usuarios`, { token: getToken() }),
      apiFetch<Invitacion[]>(`/clubes/${clubId}/invitaciones`, {
        token: getToken(),
      }),
    ]);
    setMembers(m);
    setInvs(i);
  }, [clubId]);

  async function cambiarRol(usuarioId: string, rol: RolClub) {
    if (!clubId) return;
    setError(null);
    try {
      await apiFetch(`/clubes/${clubId}/usuarios/${usuarioId}`, {
        method: "PATCH",
        token: getToken(),
        body: { rol },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el rol");
    }
  }

  async function eliminarMiembro(usuarioId: string) {
    if (!clubId) return;
    if (!window.confirm("¿Quitar a este usuario del club?")) return;
    setError(null);
    try {
      await apiFetch(`/clubes/${clubId}/usuarios/${usuarioId}`, {
        method: "DELETE",
        token: getToken(),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  useEffect(() => {
    if (!clubId || !isAdmin) return;
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
  }, [clubId, isAdmin, load]);

  if (clubLoading) return null;

  if (!isAdmin) {
    return (
      <CenteredHint text="Solo el gestor del club puede gestionar usuarios y roles." />
    );
  }

  return (
    <>
      <header className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight">Usuarios y roles</h1>
        <p className="text-sm text-muted">{club?.nombre}</p>
      </header>

      <div className="flex flex-1 flex-col gap-8 p-6">
        {error && <ErrorMessage message={error} />}

        {loading ? (
          <p className="text-sm text-muted">Cargando…</p>
        ) : (
          <>
            {clubId && <Invitaciones clubId={clubId} invs={invs} onChange={load} />}

            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted">
                Miembros del club ({members.length})
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface/60 text-left text-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">Nombre</th>
                      <th className="px-4 py-2 font-medium">Email</th>
                      <th className="px-4 py-2 font-medium">Rol</th>
                      <th className="px-4 py-2 font-medium">Estado</th>
                      <th className="px-4 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.usuario_id} className="border-t border-border">
                        <td className="px-4 py-2.5">
                          {m.nombre} {m.apellidos ?? ""}
                        </td>
                        <td className="px-4 py-2.5 text-muted">{m.email}</td>
                        <td className="px-4 py-2.5">
                          {m.activo ? (
                            <select
                              value={m.rol}
                              onChange={(e) =>
                                void cambiarRol(m.usuario_id, e.target.value as RolClub)
                              }
                              className="rounded-full border border-border bg-transparent px-2.5 py-0.5 text-xs text-cyan"
                            >
                              {ROLE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="rounded-full bg-petrol-bright/15 px-2.5 py-0.5 text-xs text-cyan">
                              {ROL_LABEL[m.rol]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted">
                          {m.activo ? "Activo" : "Inactivo"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {m.activo && (
                            <button
                              onClick={() => void eliminarMiembro(m.usuario_id)}
                              className="text-coral transition hover:underline"
                            >
                              Quitar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

/* ------------------------------ Invitaciones ------------------------------ */

function Invitaciones({
  clubId,
  invs,
  onChange,
}: {
  clubId: string;
  invs: Invitacion[];
  onChange: () => Promise<void>;
}) {
  const [rol, setRol] = useState<RolClub>("ENTRENADOR");
  const [email, setEmail] = useState("");
  const [maxUsos, setMaxUsos] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/clubes/${clubId}/invitaciones`, {
        method: "POST",
        token: getToken(),
        body: {
          rol,
          email: email.trim() || null,
          max_usos: Math.max(1, parseInt(maxUsos, 10) || 1),
        },
      });
      setEmail("");
      setMaxUsos("1");
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setSaving(false);
    }
  }

  async function revocar(id: string) {
    setError(null);
    try {
      await apiFetch(`/clubes/${clubId}/invitaciones/${id}`, {
        method: "DELETE",
        token: getToken(),
      });
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revocar");
    }
  }

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopied(codigo);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  const activas = invs.filter((i) => i.activa);

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted">
        Invitaciones por código
      </h2>

      <form
        onSubmit={crear}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface/50 p-4"
      >
        <div className="w-40">
          <LabeledSelect
            label="Rol"
            value={rol}
            onChange={(v) => setRol(v as RolClub)}
            options={INVITE_ROLES.map((r) => ({ value: r, label: ROL_LABEL[r] }))}
          />
        </div>
        <div className="w-56">
          <LabeledInput
            label="Email (opcional)"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="restringir a un correo"
          />
        </div>
        <div className="w-24">
          <LabeledInput label="Usos" value={maxUsos} onChange={setMaxUsos} type="number" />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Generando…" : "Generar código"}
        </Button>
      </form>

      <ErrorMessage message={error} />

      {activas.length > 0 && (
        <ul className="mt-4 space-y-2">
          {activas.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg/40 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <code className="rounded-lg bg-surface-2 px-3 py-1.5 font-mono text-base font-semibold tracking-widest text-cyan">
                  {i.codigo}
                </code>
                <button
                  onClick={() => copiar(i.codigo)}
                  className="text-xs text-muted transition hover:text-ink"
                >
                  {copied === i.codigo ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="rounded-full bg-petrol-bright/15 px-2 py-0.5 text-cyan">
                  {ROL_LABEL[i.rol]}
                </span>
                {i.email && <span>{i.email}</span>}
                <span>
                  {i.usos}/{i.max_usos} usos
                </span>
                <button
                  onClick={() => revocar(i.id)}
                  className="text-coral transition hover:underline"
                >
                  Revocar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CenteredHint({ text }: { text: string }) {
  return (
    <div className="grid flex-1 place-items-center p-12 text-center text-muted">
      <p className="max-w-sm text-sm">{text}</p>
    </div>
  );
}
