"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { NuevoPartidoModal } from "@/components/nuevo-partido-modal";
import { apiFetch } from "@/lib/api";
import { canAccessLiveStats, getToken } from "@/lib/auth";
import { useClub } from "@/lib/club-context";
import {
  ESTADO_PARTIDO_LABEL,
  type Competicion,
  type Equipo,
  type Partido,
  type Temporada,
} from "@/lib/types";

const ESTADOS_SELECCIONABLES = ["EN_DIRECTO", "PROGRAMADO"];

export default function LiveMatchPickerPage() {
  const router = useRouter();
  const { club, role, loading: clubLoading } = useClub();
  const clubId = club?.id;
  const isAdmin = role === "GESTOR_CLUB";

  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [rivales, setRivales] = useState<Equipo[]>([]);
  const [competiciones, setCompeticiones] = useState<Competicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    if (!clubId) return;
    const temporadas = await apiFetch<Temporada[]>(`/clubes/${clubId}/temporadas`, {
      token: getToken(),
    });
    const temporadaId = temporadas.find((t) => t.activa)?.id ?? temporadas[0]?.id;
    if (!temporadaId) {
      setPartidos([]);
      setEquipos([]);
      setRivales([]);
      setCompeticiones([]);
      return;
    }
    const soloMios = isAdmin ? "" : "&solo_mios=true";
    const [data, propios, rivalesData, competicionesData] = await Promise.all([
      apiFetch<Partido[]>(
        `/clubes/${clubId}/partidos?temporada_id=${temporadaId}${soloMios}`,
        { token: getToken() },
      ),
      apiFetch<Equipo[]>(
        `/clubes/${clubId}/equipos?temporada_id=${temporadaId}&tipo=PROPIO${soloMios}`,
        { token: getToken() },
      ),
      apiFetch<Equipo[]>(`/clubes/${clubId}/equipos?temporada_id=${temporadaId}&tipo=RIVAL`, {
        token: getToken(),
      }),
      apiFetch<Competicion[]>(`/clubes/${clubId}/competiciones?temporada_id=${temporadaId}`, {
        token: getToken(),
      }),
    ]);
    const seleccionables = data
      .filter((p) => ESTADOS_SELECCIONABLES.includes(p.estado))
      .sort((a, b) => {
        if (a.estado !== b.estado) return a.estado === "EN_DIRECTO" ? -1 : 1;
        return new Date(a.fecha_partido).getTime() - new Date(b.fecha_partido).getTime();
      });
    setPartidos(seleccionables);
    setEquipos(propios);
    setRivales(rivalesData);
    setCompeticiones(competicionesData);
  }, [clubId, isAdmin]);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId, load]);

  if (clubLoading || loading) {
    return <Centered>Cargando partidos…</Centered>;
  }

  if (!canAccessLiveStats(role)) {
    return (
      <Centered>
        No tienes acceso a Live Stats.{" "}
        <Link href="/portal" className="text-purple-600 underline">
          Volver al portal
        </Link>
      </Centered>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/portal" className="text-sm text-slate-500 hover:text-slate-700">
        ← Portal
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Match Live Stats</h1>
          <p className="mt-1 text-sm text-slate-500">
            Elige el partido en el que vas a tomar datos.
          </p>
        </div>
        {equipos.length > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
          >
            + Nuevo partido
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {partidos.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          {equipos.length === 0
            ? "No tienes equipos asignados todavía."
            : "No hay partidos programados o en directo ahora mismo."}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {partidos.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/live/${p.id}`)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-purple-400 hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-slate-800">vs {p.rival_nombre}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {new Date(p.fecha_partido).toLocaleString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  p.estado === "EN_DIRECTO"
                    ? "bg-lime-100 text-lime-700"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {ESTADO_PARTIDO_LABEL[p.estado]}
              </span>
            </button>
          ))}
        </div>
      )}

      {clubId && (
        <NuevoPartidoModal
          open={showModal}
          onClose={() => setShowModal(false)}
          clubId={clubId}
          equipos={equipos}
          rivales={rivales}
          competiciones={competiciones}
          onCompeticionCreada={(c) => setCompeticiones((prev) => [...prev, c])}
          onCreated={(partido) => {
            setShowModal(false);
            router.push(`/live/${partido.id}`);
          }}
        />
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center text-slate-500">
      {children}
    </main>
  );
}
