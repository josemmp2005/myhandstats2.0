"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { apiFetch, ApiError } from "./api";
import { clearToken, getToken, type RolClub } from "./auth";
import type { ClubMembership } from "./types";

type ClubCtx = {
  clubs: ClubMembership[];
  club: ClubMembership | null;
  role: RolClub | null;
  loading: boolean;
  setClubId: (id: string) => void;
  /** Vuelve a pedir la lista de clubes (usar tras editar los datos del club activo). */
  refresh: () => Promise<void>;
};

const ClubContext = createContext<ClubCtx | null>(null);

export const ACTIVE_CLUB_KEY = "mhs_active_club";

/** Fija el club activo (usado tras crear o unirse a un club). */
export function persistActiveClub(id: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACTIVE_CLUB_KEY, id);
  }
}

export function ClubProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [clubs, setClubs] = useState<ClubMembership[]>([]);
  const [clubId, setClubIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<ClubMembership[]>("/clubes", { token });
      setClubs(data);
      setClubIdState((prev) => {
        if (prev && data.some((c) => c.id === prev)) return prev;
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem(ACTIVE_CLUB_KEY)
            : null;
        return data.find((c) => c.id === stored)?.id ?? data[0]?.id ?? null;
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        router.replace("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  function setClubId(id: string) {
    setClubIdState(id);
    localStorage.setItem(ACTIVE_CLUB_KEY, id);
  }

  const club = clubs.find((c) => c.id === clubId) ?? null;
  const role = club?.rol ?? null;

  return (
    <ClubContext.Provider
      value={{ clubs, club, role, loading, setClubId, refresh: load }}
    >
      {children}
    </ClubContext.Provider>
  );
}

export function useClub(): ClubCtx {
  const ctx = useContext(ClubContext);
  if (!ctx) {
    throw new Error("useClub debe usarse dentro de <ClubProvider>");
  }
  return ctx;
}
