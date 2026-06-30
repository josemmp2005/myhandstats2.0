"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch, ApiError } from "@/lib/api";
import {
  canAccessClubManager,
  canAccessLiveStats,
  clearToken,
  getToken,
  highestRole,
  type RolClub,
} from "@/lib/auth";

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
  const [role, setRole] = useState<RolClub | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    apiFetch<ClubMembership[]>("/clubes", { token })
      .then((clubs) => setRole(highestRole(clubs.map((c) => c.rol))))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace("/login");
        }
      })
      .finally(() => setLoading(false));
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
        <h1 className="text-3xl font-bold tracking-tight">¿A dónde quieres entrar?</h1>
        <p className="mt-2 text-muted">
          {loading
            ? "Comprobando tus permisos…"
            : role
              ? `Tu rol: ${ROLE_LABEL[role]}`
              : "Aún no perteneces a ningún club."}
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <AppCard
            title="Club Manager"
            description="Gestiona equipos, jugadores, temporadas y partidos de tu club."
            accent="cyan"
            href="/club/dashboard"
            unlocked={!loading && canAccessClubManager(role)}
            lockedReason="Necesitas ser gestor o entrenador de un club."
          />
          <AppCard
            title="Match Live Stats"
            description="Toma estadísticas en directo durante el partido, optimizado para tablet."
            accent="lime"
            href="/live"
            unlocked={!loading && canAccessLiveStats(role)}
            lockedReason="Necesitas estar asignado a un equipo."
          />
        </div>

        {!loading && !role && (
          <p className="mt-8 rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm text-muted">
            Pide a un gestor que te añada a un club, o crea uno para empezar.
          </p>
        )}
      </section>
    </main>
  );
}

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
