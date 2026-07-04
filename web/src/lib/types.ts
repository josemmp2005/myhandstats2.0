import type { RolClub } from "./auth";

export type Club = {
  id: string;
  nombre: string;
  slug: string;
  ciudad: string | null;
  pais: string | null;
  logo_url: string | null;
  color_primario: string | null;
  color_secundario: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
};

export type ClubMembership = Club & { rol: RolClub };

export type Temporada = {
  id: string;
  club_id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activa: boolean;
};

export type CategoriaEquipo =
  | "SENIOR"
  | "JUVENIL"
  | "CADETE"
  | "INFANTIL"
  | "ALEVIN"
  | "BENJAMIN"
  | "OTRO";

export type GeneroEquipo = "MASCULINO" | "FEMENINO" | "MIXTO";

export type TipoEquipo = "PROPIO" | "RIVAL";

export type Equipo = {
  id: string;
  club_id: string;
  temporada_id: string;
  nombre: string;
  nombre_corto: string | null;
  categoria: CategoriaEquipo;
  genero: GeneroEquipo;
  tipo: TipoEquipo;
  logo_url: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
};

export const CATEGORIAS: CategoriaEquipo[] = [
  "SENIOR",
  "JUVENIL",
  "CADETE",
  "INFANTIL",
  "ALEVIN",
  "BENJAMIN",
  "OTRO",
];

export const GENEROS: GeneroEquipo[] = ["MASCULINO", "FEMENINO", "MIXTO"];

export const TIPOS: TipoEquipo[] = ["PROPIO", "RIVAL"];

/* --------------------------- Cuerpo técnico --------------------------- */

export type ClubMember = {
  usuario_id: string;
  email: string;
  nombre: string;
  apellidos: string | null;
  rol: RolClub;
  activo: boolean;
};

export type StaffItem = {
  asignacion: {
    id: string;
    usuario_id: string;
    rol: RolClub;
    activo: boolean;
  };
  usuario: {
    id: string;
    email: string;
    nombre: string;
    apellidos: string | null;
  };
};

/** Roles asignables a un equipo (el gestor gestiona el club, no se asigna a equipos). */
export const STAFF_ROLES: RolClub[] = ["ENTRENADOR", "AYUDANTE", "ANALISTA"];

/** Roles que se pueden conceder mediante una invitación al club. */
export const INVITE_ROLES: RolClub[] = [
  "ENTRENADOR",
  "AYUDANTE",
  "ANALISTA",
  "GESTOR_CLUB",
];

export type Invitacion = {
  id: string;
  club_id: string;
  codigo: string;
  rol: RolClub;
  email: string | null;
  expira_en: string | null;
  max_usos: number;
  usos: number;
  activa: boolean;
  creado_en: string;
};

export const ROL_LABEL: Record<RolClub, string> = {
  GESTOR_CLUB: "Gestor",
  ENTRENADOR: "Entrenador",
  AYUDANTE: "Ayudante",
  ANALISTA: "Analista",
};
