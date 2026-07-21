"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useClub } from "@/lib/club-context";
import { navForRole, ROLE_LABEL } from "@/lib/nav";

export function ClubShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { club, clubs, role, loading, setClubId } = useClub();

  if (loading) {
    return (
      <main className="grid flex-1 place-items-center text-muted">
        Cargando tu club…
      </main>
    );
  }

  if (!club) {
    return (
      <main className="grid flex-1 place-items-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-lg font-semibold">No perteneces a ningún club</h1>
          <p className="mt-2 text-sm text-muted">
            Pide a un gestor que te añada a un club para acceder.
          </p>
          <Link
            href="/portal"
            className="mt-5 inline-block rounded-xl border border-border px-4 py-2 text-sm transition hover:bg-surface-2"
          >
            ← Volver al portal
          </Link>
        </div>
      </main>
    );
  }

  const nav = navForRole(role);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface/40 p-4 sm:flex">
        <Link
          href="/portal"
          className="mb-6 flex items-center gap-2 px-2 font-semibold"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-petrol-bright text-sm font-bold text-bg">
            MH
          </span>
          Club Manager
        </Link>

        {/* Club activo + rol (selector si hay varios clubes) */}
        <div className="mb-6">
          {clubs.length > 1 ? (
            <select
              value={club.id}
              onChange={(e) => setClubId(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id} className="bg-surface">
                  {c.nombre}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-lg border border-border bg-bg/40 px-3 py-2 text-sm text-ink">
              {club.nombre}
            </div>
          )}
          {role && (
            <span className="mt-2 inline-block rounded-full bg-petrol-bright/15 px-2.5 py-0.5 text-xs font-medium text-cyan">
              {ROLE_LABEL[role]}
            </span>
          )}
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            if (!item.ready) {
              return (
                <span
                  key={item.label}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted/50"
                >
                  {item.label}
                  <span className="text-[10px] uppercase tracking-wide">
                    pronto
                  </span>
                </span>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-petrol-bright/20 font-medium text-cyan"
                    : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/portal"
          className="mt-auto rounded-lg px-3 py-2 text-sm text-muted transition hover:text-ink"
        >
          ← Volver al portal
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
