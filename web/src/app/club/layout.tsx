"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getToken } from "@/lib/auth";

const NAV = [
  { label: "Dashboard", href: "/club/dashboard", ready: true },
  { label: "Equipos", href: "/club/equipos", ready: false },
  { label: "Jugadores", href: "/club/jugadores", ready: false },
  { label: "Temporadas", href: "/club/temporadas", ready: false },
  { label: "Partidos", href: "/club/partidos", ready: false },
];

export default function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <main className="grid flex-1 place-items-center text-muted">Cargando…</main>
    );
  }

  return (
    <div className="flex min-h-full flex-1">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface/40 p-4 sm:flex">
        <Link href="/portal" className="mb-8 flex items-center gap-2 px-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-petrol-bright text-sm font-bold text-bg">
            MH
          </span>
          Club Manager
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            if (!item.ready) {
              return (
                <span
                  key={item.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted/50"
                >
                  {item.label}
                  <span className="text-[10px] uppercase tracking-wide">pronto</span>
                </span>
              );
            }
            return (
              <Link
                key={item.href}
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

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
