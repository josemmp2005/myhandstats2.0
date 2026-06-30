/** Gestión del access token en cliente (MVP: localStorage). */

const TOKEN_KEY = "mhs_access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

/** Roles del club (espejo del ENUM rol_club del backend). */
export type RolClub = "GESTOR_CLUB" | "ENTRENADOR" | "AYUDANTE" | "ANALISTA";

const ROLE_PRIORITY: Record<RolClub, number> = {
  GESTOR_CLUB: 4,
  ENTRENADOR: 3,
  AYUDANTE: 2,
  ANALISTA: 1,
};

/** Devuelve el rol de mayor alcance entre una lista de membresías. */
export function highestRole(roles: RolClub[]): RolClub | null {
  if (roles.length === 0) return null;
  return roles.reduce((best, r) =>
    ROLE_PRIORITY[r] > ROLE_PRIORITY[best] ? r : best,
  );
}

/** Gating del portal según rol. */
export function canAccessClubManager(role: RolClub | null): boolean {
  return role === "GESTOR_CLUB" || role === "ENTRENADOR";
}

export function canAccessLiveStats(role: RolClub | null): boolean {
  return (
    role === "GESTOR_CLUB" || role === "ENTRENADOR" || role === "AYUDANTE"
  );
}
