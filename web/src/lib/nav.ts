import type { RolClub } from "./auth";

export type NavItem = {
  label: string;
  href: string;
  /** false = la pantalla aún no existe (se muestra como "pronto"). */
  ready: boolean;
};

/** Administrador (GESTOR_CLUB): estructura, usuarios, permisos, visión global. */
export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/club/dashboard", ready: true },
  { label: "Temporadas", href: "/club/temporadas", ready: false },
  { label: "Equipos", href: "/club/equipos", ready: true },
  { label: "Jugadores", href: "/club/jugadores", ready: false },
  { label: "Usuarios y roles", href: "/club/usuarios", ready: true },
  { label: "Partidos", href: "/club/partidos", ready: false },
  { label: "Configuración", href: "/club/configuracion", ready: false },
];

/** Entrenador (ENTRENADOR): equipos asignados, partidos, convocatorias, stats. */
export const coachNav: NavItem[] = [
  { label: "Mi Dashboard", href: "/club/dashboard", ready: true },
  { label: "Mis equipos", href: "/club/equipos", ready: true },
  { label: "Jugadores", href: "/club/jugadores", ready: false },
  { label: "Partidos", href: "/club/partidos", ready: false },
  { label: "Convocatorias", href: "/club/convocatorias", ready: false },
  { label: "Live Stats", href: "/live", ready: false },
  { label: "Estadísticas", href: "/club/estadisticas", ready: false },
];

export function navForRole(role: RolClub | null): NavItem[] {
  return role === "ENTRENADOR" || role === "AYUDANTE" ? coachNav : adminNav;
}

export const ROLE_LABEL: Record<RolClub, string> = {
  GESTOR_CLUB: "Administrador",
  ENTRENADOR: "Entrenador",
  AYUDANTE: "Ayudante",
  ANALISTA: "Analista",
};
