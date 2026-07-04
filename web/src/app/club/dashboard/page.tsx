"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useClub } from "@/lib/club-context";
import type { Equipo } from "@/lib/types";

export default function ClubDashboardPage() {
  const { club, role } = useClub();
  if (!club) return null;

  const isCoach = role === "ENTRENADOR" || role === "AYUDANTE";

  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isCoach ? "Mi Dashboard" : "Dashboard"}
          </h1>
          <p className="text-sm text-muted">{club.nombre}</p>
        </div>
      </header>

      {isCoach ? <CoachDashboard /> : <AdminDashboard clubId={club.id} />}
    </>
  );
}

/* ------------------------------ Administrador ----------------------------- */

function AdminDashboard({ clubId }: { clubId: string }) {
  const [equipos, setEquipos] = useState<number | null>(null);
  const [jugadores, setJugadores] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [eqs, jgs] = await Promise.all([
          apiFetch<Equipo[]>(`/clubes/${clubId}/equipos`, { token: getToken() }),
          apiFetch<{ activo: boolean }[]>(`/clubes/${clubId}/jugadores`, {
            token: getToken(),
          }),
        ]);
        if (!cancelled) {
          setEquipos(eqs.filter((e) => e.activo).length);
          setJugadores(jgs.filter((j) => j.activo).length);
        }
      } catch {
        /* dashboard tolerante: si falla, se quedan en "—" */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Equipos activos" value={equipos} />
        <Kpi label="Jugadores totales" value={jugadores} />
        <Kpi label="Cuerpo técnico" value={null} />
        <Kpi label="Partidos registrados" value={null} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">Acciones rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction label="+ Crear equipo" href="/club/equipos" />
          <QuickAction label="+ Crear temporada" href="/club/equipos" />
          <QuickAction label="+ Crear jugador" />
          <QuickAction label="+ Añadir usuario" />
          <QuickAction label="+ Crear partido" />
        </div>
      </section>

      <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-petrol-bright/20 text-xl">
            📊
          </div>
          <h2 className="text-lg font-semibold">Visión global del club</h2>
          <p className="mt-2 text-sm text-muted">
            Aquí verás próximos partidos, informes y estadísticas globales a
            medida que se vayan registrando.
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Entrenador ------------------------------ */

function CoachDashboard() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Próximo partido + acción principal */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface/60 p-6 lg:col-span-2">
          <p className="text-sm text-muted">Próximo partido</p>
          <p className="mt-2 text-lg font-semibold text-muted/50">
            No hay partidos programados
          </p>
        </div>
        <button
          disabled
          title="Disponible próximamente"
          className="grid place-items-center rounded-2xl bg-lime/90 p-6 text-center text-lg font-bold text-bg opacity-60"
        >
          ▶ Iniciar toma de estadísticas
        </button>
      </div>

      {/* Métricas deportivas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Eficacia de lanzamiento" value={null} suffix="%" />
        <Kpi label="Pérdidas por partido" value={null} />
        <Kpi label="Porcentaje de parada" value={null} suffix="%" />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">Acciones rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction label="Mis equipos" href="/club/equipos" />
          <QuickAction label="+ Crear partido" />
          <QuickAction label="+ Preparar convocatoria" />
          <QuickAction label="Ver último informe" />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------ Subcomponentes ---------------------------- */

function Kpi({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-5">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          value === null ? "text-muted/40" : "text-ink"
        }`}
      >
        {value === null ? "—" : value}
        {value !== null && suffix ? suffix : ""}
      </p>
    </div>
  );
}

function QuickAction({ label, href }: { label: string; href?: string }) {
  const base =
    "rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition";
  if (href) {
    return (
      <Link href={href} className={`${base} text-ink hover:bg-surface-2`}>
        {label}
      </Link>
    );
  }
  return (
    <span
      title="Disponible próximamente"
      className={`${base} cursor-not-allowed text-muted/50`}
    >
      {label}
    </span>
  );
}
