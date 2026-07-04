"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, ErrorMessage, LabeledInput, Modal } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";
import {
  canAccessClubManager,
  canAccessLiveStats,
  clearToken,
  getToken,
  highestRole,
  type RolClub,
} from "@/lib/auth";
import { persistActiveClub } from "@/lib/club-context";

type ClubMembership = { id: string; nombre: string; rol: RolClub };

const ROLE_LABEL: Record<RolClub, string> = {
  GESTOR_CLUB: "Gestor del club",
  ENTRENADOR: "Entrenador",
  AYUDANTE: "Ayudante",
  ANALISTA: "Analista",
};

export default function PortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<ClubMembership[]>([]);
  const [showCrear, setShowCrear] = useState(false);
  const [showUnirse, setShowUnirse] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch<ClubMembership[]>("/clubes", { token });
        if (!cancelled) setClubs(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST", token: getToken() });
    } catch {
      /* ignore */
    }
    clearToken();
    router.replace("/login");
  }

  function onJoined(clubId: string) {
    persistActiveClub(clubId);
    router.push("/club/dashboard");
  }

  const role = highestRole(clubs.map((c) => c.rol));
  const hasClubs = clubs.length > 0;

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-petrol-bright text-sm font-bold text-bg">
            MH
          </span>
          MyHandStats
        </span>
        <button
          onClick={logout}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:text-ink"
        >
          Cerrar sesión
        </button>
      </header>

      <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {loading ? (
          <p className="text-muted">Comprobando tus permisos…</p>
        ) : !hasClubs ? (
          <Onboarding
            onCrear={() => setShowCrear(true)}
            onUnirse={() => setShowUnirse(true)}
          />
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight">
              ¿A dónde quieres entrar?
            </h1>
            <p className="mt-2 text-muted">
              {role ? `Tu rol: ${ROLE_LABEL[role]}` : ""}
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <AppCard
                title="Club Manager"
                description="Gestiona equipos, jugadores, temporadas y partidos de tu club."
                accent="cyan"
                href="/club/dashboard"
                unlocked={canAccessClubManager(role)}
                lockedReason="Necesitas ser gestor o entrenador de un club."
              />
              <AppCard
                title="Match Live Stats"
                description="Toma estadísticas en directo durante el partido, optimizado para tablet."
                accent="lime"
                href="/live"
                unlocked={canAccessLiveStats(role)}
                lockedReason="Necesitas estar asignado a un equipo."
              />
            </div>

            <button
              onClick={() => setShowUnirse(true)}
              className="mt-8 text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline"
            >
              Unirme a otro club con un código
            </button>
          </>
        )}
      </section>

      <CrearClubModal
        open={showCrear}
        onClose={() => setShowCrear(false)}
        onCreated={onJoined}
      />
      <UnirseModal
        open={showUnirse}
        onClose={() => setShowUnirse(false)}
        onJoined={onJoined}
      />
    </main>
  );
}

/* ------------------------------- Onboarding ------------------------------- */

function Onboarding({
  onCrear,
  onUnirse,
}: {
  onCrear: () => void;
  onUnirse: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h1 className="text-3xl font-bold tracking-tight">Empecemos</h1>
      <p className="mt-2 text-muted">
        Aún no perteneces a ningún club. Crea el tuyo o únete con un código de
        invitación.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-border bg-surface/70 p-6 text-left">
          <span className="mb-3 text-2xl">🏟️</span>
          <h2 className="text-lg font-semibold">Crear un club</h2>
          <p className="mt-1 flex-1 text-sm text-muted">
            Serás el gestor y podrás invitar a entrenadores y ayudantes.
          </p>
          <div className="mt-4">
            <Button onClick={onCrear}>Crear club</Button>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-surface/70 p-6 text-left">
          <span className="mb-3 text-2xl">🔑</span>
          <h2 className="text-lg font-semibold">Unirme a un club</h2>
          <p className="mt-1 flex-1 text-sm text-muted">
            ¿Tienes un código de invitación? Introdúcelo para unirte.
          </p>
          <div className="mt-4">
            <Button variant="ghost" onClick={onUnirse}>
              Tengo un código
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CrearClubModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (clubId: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function onNombre(v: string) {
    setNombre(v);
    if (!slugEdited) setSlug(slugify(v));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const club = await apiFetch<{ id: string }>("/clubes", {
        method: "POST",
        token: getToken(),
        body: { nombre, slug },
      });
      onCreated(club.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el club");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Crear club">
      <form onSubmit={submit} className="space-y-4">
        <LabeledInput
          label="Nombre del club"
          value={nombre}
          onChange={onNombre}
          placeholder="Balonmano Ejemplo"
          required
        />
        <LabeledInput
          label="Identificador (slug)"
          value={slug}
          onChange={(v) => {
            setSlug(v);
            setSlugEdited(true);
          }}
          placeholder="balonmano-ejemplo"
          required
        />
        <p className="text-xs text-muted">
          Solo minúsculas, números y guiones. Será único.
        </p>
        <ErrorMessage message={error} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creando…" : "Crear club"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UnirseModal({
  open,
  onClose,
  onJoined,
}: {
  open: boolean;
  onClose: () => void;
  onJoined: (clubId: string) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await apiFetch<{ club_id: string; nombre: string }>(
        "/invitaciones/redimir",
        { method: "POST", token: getToken(), body: { codigo: codigo.trim() } },
      );
      onJoined(res.club_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo unir al club");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Unirme a un club">
      <form onSubmit={submit} className="space-y-4">
        <LabeledInput
          label="Código de invitación"
          value={codigo}
          onChange={(v) => setCodigo(v.toUpperCase())}
          placeholder="Ej. ABCD2345"
          required
        />
        <ErrorMessage message={error} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Uniéndome…" : "Unirme"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* --------------------------------- AppCard -------------------------------- */

function AppCard({
  title,
  description,
  accent,
  href,
  unlocked,
  lockedReason,
}: {
  title: string;
  description: string;
  accent: "cyan" | "lime";
  href: string;
  unlocked: boolean;
  lockedReason: string;
}) {
  const accentRing = accent === "cyan" ? "hover:border-cyan" : "hover:border-lime";
  const accentDot = accent === "cyan" ? "bg-cyan" : "bg-lime";

  const inner = (
    <div
      className={`group relative flex h-full flex-col rounded-2xl border border-border bg-surface/70 p-6 transition ${
        unlocked ? `cursor-pointer ${accentRing}` : "opacity-60"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className={`h-2.5 w-2.5 rounded-full ${accentDot}`} />
        {!unlocked && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
            🔒 Bloqueado
          </span>
        )}
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 flex-1 text-sm text-muted">{description}</p>
      <p className="mt-4 text-sm font-medium">
        {unlocked ? (
          <span className="text-ink">Entrar →</span>
        ) : (
          <span className="text-muted">{lockedReason}</span>
        )}
      </p>
    </div>
  );

  if (!unlocked) return inner;
  return <Link href={href}>{inner}</Link>;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
