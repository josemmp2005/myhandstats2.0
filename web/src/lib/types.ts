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

/* ------------------------------ Jugadores ------------------------------ */

export type TipoJugador = "PROPIO" | "RIVAL";

export type ManoDominante = "DERECHA" | "IZQUIERDA" | "AMBAS" | "DESCONOCIDA";

export type PosicionJugador =
  | "PORTERO"
  | "EXTREMO_IZQUIERDO"
  | "EXTREMO_DERECHO"
  | "LATERAL_IZQUIERDO"
  | "LATERAL_DERECHO"
  | "CENTRAL"
  | "PIVOTE"
  | "UNIVERSAL";

export type Jugador = {
  id: string;
  club_id: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  tipo: TipoJugador;
  mano_dominante: ManoDominante;
  posicion_principal: PosicionJugador | null;
  posicion_secundaria: PosicionJugador | null;
  altura_cm: number | null;
  peso_kg: number | null;
  foto_url: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
};

export const TIPOS_JUGADOR: TipoJugador[] = ["PROPIO", "RIVAL"];

export const POSICIONES: PosicionJugador[] = [
  "PORTERO",
  "EXTREMO_IZQUIERDO",
  "EXTREMO_DERECHO",
  "LATERAL_IZQUIERDO",
  "LATERAL_DERECHO",
  "CENTRAL",
  "PIVOTE",
  "UNIVERSAL",
];

export const POSICION_LABEL: Record<PosicionJugador, string> = {
  PORTERO: "Portero",
  EXTREMO_IZQUIERDO: "Extremo izquierdo",
  EXTREMO_DERECHO: "Extremo derecho",
  LATERAL_IZQUIERDO: "Lateral izquierdo",
  LATERAL_DERECHO: "Lateral derecho",
  CENTRAL: "Central",
  PIVOTE: "Pivote",
  UNIVERSAL: "Universal",
};

export const MANOS: ManoDominante[] = [
  "DESCONOCIDA",
  "DERECHA",
  "IZQUIERDA",
  "AMBAS",
];

export const MANO_LABEL: Record<ManoDominante, string> = {
  DERECHA: "Derecha",
  IZQUIERDA: "Izquierda",
  AMBAS: "Ambas",
  DESCONOCIDA: "Desconocida",
};

/* ------------------------------- Plantilla ------------------------------- */

export type Asignacion = {
  id: string;
  jugador_id: string;
  equipo_id: string;
  temporada_id: string;
  dorsal: number | null;
  equipo_principal: boolean;
  disponible_para_jugar: boolean;
  tipo_asignacion: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
};

export type PlantillaItem = {
  asignacion: Asignacion;
  jugador: Jugador;
};

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

/* ------------------------------- Partidos ------------------------------ */

export type ModoTomaDatos = "EQUIPO_PROPIO" | "SCOUTING_COMPLETO";

export type TipoLocalizacionPartido = "LOCAL" | "VISITANTE" | "NEUTRAL";

export type EstadoPartido =
  | "PROGRAMADO"
  | "EN_DIRECTO"
  | "FINALIZADO"
  | "CANCELADO"
  | "APLAZADO";

export type Competicion = {
  id: string;
  club_id: string;
  temporada_id: string;
  nombre: string;
  categoria: string | null;
  nivel: string | null;
  creado_en: string;
  actualizado_en: string;
};

export type Partido = {
  id: string;
  club_id: string;
  temporada_id: string;
  competicion_id: string | null;
  equipo_id: string;
  rival_equipo_id: string | null;
  rival_nombre: string;
  modo_toma_datos: ModoTomaDatos;
  tipo_localizacion: TipoLocalizacionPartido;
  pabellon: string | null;
  fecha_partido: string;
  estado: EstadoPartido;
  goles_equipo: number;
  goles_rival: number;
  notas: string | null;
  creado_en: string;
  actualizado_en: string;
};

export const LOCALIZACIONES: TipoLocalizacionPartido[] = [
  "LOCAL",
  "VISITANTE",
  "NEUTRAL",
];

export const LOCALIZACION_LABEL: Record<TipoLocalizacionPartido, string> = {
  LOCAL: "Local",
  VISITANTE: "Visitante",
  NEUTRAL: "Campo neutral",
};

export const MODOS_TOMA_DATOS: ModoTomaDatos[] = [
  "EQUIPO_PROPIO",
  "SCOUTING_COMPLETO",
];

export const MODO_TOMA_DATOS_LABEL: Record<ModoTomaDatos, string> = {
  EQUIPO_PROPIO: "Solo nuestro equipo",
  SCOUTING_COMPLETO: "Scouting completo (ambos equipos)",
};

export const ESTADO_PARTIDO_LABEL: Record<EstadoPartido, string> = {
  PROGRAMADO: "Programado",
  EN_DIRECTO: "En directo",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
  APLAZADO: "Aplazado",
};

/* -------------------------- Estadísticas jugador ------------------------ */

export type EstadisticaPartidoItem = {
  partido_id: string;
  fecha_partido: string;
  rival_nombre: string;
  estado_partido: EstadoPartido;
  goles: number;
  lanzamientos: number;
  asistencias: number;
  paradas: number;
  goles_recibidos: number;
  perdidas: number;
  robos: number;
  blocajes: number;
  exclusiones: number;
  eficacia_lanzamiento: number | null;
  porcentaje_paradas: number | null;
};

export type EstadisticasTotales = {
  goles: number;
  lanzamientos: number;
  asistencias: number;
  paradas: number;
  goles_recibidos: number;
  perdidas: number;
  robos: number;
  blocajes: number;
  exclusiones: number;
  eficacia_lanzamiento: number | null;
  porcentaje_paradas: number | null;
};

export type JugadorEstadisticas = {
  jugador_id: string;
  partidos_jugados: number;
  totales: EstadisticasTotales;
  por_partido: EstadisticaPartidoItem[];
};

/* -------------------------- Estadísticas de partido ---------------------- */

export type JugadorPartidoStats = {
  jugador_id: string;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
  posicion_principal: PosicionJugador | null;
  goles: number;
  lanzamientos: number;
  asistencias: number;
  paradas: number;
  goles_recibidos: number;
  perdidas: number;
  robos: number;
  blocajes: number;
  exclusiones: number;
  eficacia_lanzamiento: number | null;
  porcentaje_paradas: number | null;
};

export type PartidoEstadisticas = {
  partido_id: string;
  estado: EstadoPartido;
  rival_nombre: string;
  goles_equipo: number;
  goles_rival: number;
  totales: EstadisticasTotales;
  jugadores: JugadorPartidoStats[];
};

/* ------------------------------ Timeline de partido ---------------------- */

export type PeriodoPartido =
  | "PRIMERA_PARTE"
  | "SEGUNDA_PARTE"
  | "PRORROGA_1"
  | "PRORROGA_2"
  | "PENALTIS";

export type OrigenEvento = "EQUIPO_PROPIO" | "RIVAL";

export type TipoEvento =
  | "LANZAMIENTO"
  | "GOL"
  | "PARADA"
  | "PERDIDA"
  | "ROBO"
  | "BLOCAJE"
  | "ASISTENCIA"
  | "ERROR_TECNICO"
  | "FALTA_COMETIDA"
  | "FALTA_RECIBIDA"
  | "SIETE_METROS_PROVOCADO"
  | "SIETE_METROS_COMETIDO"
  | "DOS_MINUTOS"
  | "TARJETA_AMARILLA"
  | "TARJETA_ROJA"
  | "TARJETA_AZUL"
  | "TIEMPO_MUERTO"
  | "CAMBIO"
  | "PASIVO"
  | "REBOTE"
  | "CAMBIO_SISTEMA"
  | "INICIO_PERIODO"
  | "FIN_PERIODO"
  | "INICIO_PARTIDO"
  | "FIN_PARTIDO"
  | "OTRO";

export type ResultadoLanzamiento =
  | "GOL"
  | "PARADA"
  | "PALO"
  | "FUERA"
  | "BLOCADO"
  | "ERROR_TECNICO";

export type ResultadoEvento = "EXITO" | "FALLO" | "NEUTRO";

export type EventoPartido = {
  id: string;
  origen: OrigenEvento;
  equipo_id: string | null;
  jugador_id: string | null;
  jugador_nombre: string | null;
  jugador_asistencia_id: string | null;
  asistencia_nombre: string | null;
  portero_id: string | null;
  portero_nombre: string | null;
  periodo: PeriodoPartido;
  tiempo_ms: number;
  goles_equipo: number;
  goles_rival: number;
  tipo: TipoEvento;
  subtipo: string | null;
  fase: FaseJuego | null;
  situacion_numerica: SituacionNumerica | null;
  sistema_ataque: SistemaAtaque | null;
  sistema_defensa: SistemaDefensa | null;
  resultado_lanzamiento: ResultadoLanzamiento | null;
  resultado: ResultadoEvento | null;
  campo_x: number | null;
  campo_y: number | null;
  zona_campo: ZonaCampo | null;
  zona_porteria: ZonaPorteria | null;
};

export const PERIODO_LABEL: Record<PeriodoPartido, string> = {
  PRIMERA_PARTE: "1ª parte",
  SEGUNDA_PARTE: "2ª parte",
  PRORROGA_1: "Prórroga 1",
  PRORROGA_2: "Prórroga 2",
  PENALTIS: "Penaltis",
};

/* --------------------------- Livematch (escritura) ------------------------ */

export type FaseJuego =
  | "CONTRAATAQUE_PRIMERA_OLEADA"
  | "CONTRAATAQUE_SEGUNDA_OLEADA"
  | "ATAQUE_POSICIONAL"
  | "SAQUE_CENTRO_RAPIDO"
  | "SIETE_METROS"
  | "GOLPE_FRANCO"
  | "ATAQUE_PORTERIA_VACIA"
  | "TRANSICION_DEFENSIVA"
  | "DEFENSA_POSICIONAL"
  | "ATAQUE_SUPERIORIDAD"
  | "ATAQUE_INFERIORIDAD"
  | "DEFENSA_SUPERIORIDAD"
  | "DEFENSA_INFERIORIDAD"
  | "ATAQUE_7_VS_6"
  | "DEFENSA_7_VS_6"
  | "OTRA";

export type SituacionNumerica =
  | "SEIS_VS_SEIS"
  | "SEIS_VS_CINCO"
  | "CINCO_VS_SEIS"
  | "SIETE_VS_SEIS"
  | "SEIS_VS_SIETE"
  | "CINCO_VS_CINCO"
  | "OTRA";

export type SistemaAtaque =
  | "TRES_TRES"
  | "DOS_CUATRO"
  | "SIETE_VS_SEIS"
  | "PORTERIA_VACIA"
  | "DESCONOCIDO";

export type SistemaDefensa =
  | "SEIS_CERO"
  | "CINCO_UNO"
  | "TRES_DOS_UNO"
  | "CUATRO_DOS"
  | "TRES_TRES"
  | "MIXTA"
  | "INDIVIDUAL"
  | "DESCONOCIDA";

export type ZonaPorteria =
  | "ALTA_IZQUIERDA"
  | "ALTA_CENTRO"
  | "ALTA_DERECHA"
  | "MEDIA_IZQUIERDA"
  | "MEDIA_CENTRO"
  | "MEDIA_DERECHA"
  | "BAJA_IZQUIERDA"
  | "BAJA_CENTRO"
  | "BAJA_DERECHA";

export type ZonaCampo =
  | "EXTREMO_IZQUIERDO"
  | "LATERAL_IZQUIERDO_9M"
  | "CENTRAL_9M"
  | "LATERAL_DERECHO_9M"
  | "EXTREMO_DERECHO"
  | "IZQUIERDA_6M"
  | "CENTRO_6M"
  | "DERECHA_6M"
  | "ZONA_PIVOTE"
  | "SIETE_METROS"
  | "CAMPO_PROPIO"
  | "PORTERIA_VACIA_LARGA_DISTANCIA"
  | "DESCONOCIDA";

export type EventoCreate = {
  origen: OrigenEvento;
  equipo_id?: string | null;
  jugador_id?: string | null;
  jugador_asistencia_id?: string | null;
  portero_id?: string | null;
  jugador_texto?: string | null;
  periodo: PeriodoPartido;
  tiempo_ms: number;
  tipo: TipoEvento;
  subtipo?: string | null;
  fase?: FaseJuego | null;
  situacion_numerica?: SituacionNumerica | null;
  sistema_ataque?: SistemaAtaque | null;
  sistema_defensa?: SistemaDefensa | null;
  resultado_lanzamiento?: ResultadoLanzamiento | null;
  resultado?: ResultadoEvento | null;
  campo_x?: number | null;
  campo_y?: number | null;
  zona_campo?: ZonaCampo | null;
  zona_porteria?: ZonaPorteria | null;
};

export type EventoLiveResponse = EventoCreate & {
  id: string;
  partido_id: string;
  goles_equipo: number;
  goles_rival: number;
  eliminado: boolean;
};

/* ------------------------------ Convocatoria ------------------------------ */

export type ConvocatoriaItem = {
  jugador_id: string;
  nombre: string;
  apellidos: string;
  foto_url: string | null;
  dorsal: number | null;
  posicion_principal: PosicionJugador | null;
  disponible: boolean;
  es_portero: boolean;
  titular: boolean;
  disponible_para_jugar: boolean;
};

export type ConvocatoriaJugadorInput = {
  jugador_id: string;
  disponible: boolean;
  es_portero: boolean;
  titular: boolean;
  dorsal: number | null;
};
