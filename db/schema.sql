-- =========================================================
-- MyHandStats2.0 - Esquema inicial PostgreSQL en español
-- Versión actualizada con dos modos de toma de datos:
-- 1) EQUIPO_PROPIO
-- 2) SCOUTING_COMPLETO
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================================================
-- ENUMS
-- =========================================================

CREATE TYPE rol_club AS ENUM (
  'GESTOR_CLUB',
  'ENTRENADOR',
  'AYUDANTE',
  'ANALISTA'
);

CREATE TYPE categoria_equipo AS ENUM (
  'SENIOR',
  'JUVENIL',
  'CADETE',
  'INFANTIL',
  'ALEVIN',
  'BENJAMIN',
  'OTRO'
);

CREATE TYPE genero_equipo AS ENUM (
  'MASCULINO',
  'FEMENINO',
  'MIXTO'
);

CREATE TYPE tipo_equipo AS ENUM (
  'PROPIO',
  'RIVAL'
);

CREATE TYPE tipo_jugador AS ENUM (
  'PROPIO',
  'RIVAL'
);

CREATE TYPE modo_toma_datos AS ENUM (
  'EQUIPO_PROPIO',
  'SCOUTING_COMPLETO'
);

CREATE TYPE origen_evento AS ENUM (
  'EQUIPO_PROPIO',
  'RIVAL'
);

CREATE TYPE posicion_jugador AS ENUM (
  'PORTERO',
  'EXTREMO_IZQUIERDO',
  'EXTREMO_DERECHO',
  'LATERAL_IZQUIERDO',
  'LATERAL_DERECHO',
  'CENTRAL',
  'PIVOTE',
  'UNIVERSAL'
);

CREATE TYPE mano_dominante AS ENUM (
  'DERECHA',
  'IZQUIERDA',
  'AMBAS',
  'DESCONOCIDA'
);

CREATE TYPE estado_partido AS ENUM (
  'PROGRAMADO',
  'EN_DIRECTO',
  'FINALIZADO',
  'CANCELADO',
  'APLAZADO'
);

CREATE TYPE tipo_localizacion_partido AS ENUM (
  'LOCAL',
  'VISITANTE',
  'NEUTRAL'
);

CREATE TYPE periodo_partido AS ENUM (
  'PRIMERA_PARTE',
  'SEGUNDA_PARTE',
  'PRORROGA_1',
  'PRORROGA_2',
  'PENALTIS'
);

CREATE TYPE fase_juego AS ENUM (
  'CONTRAATAQUE_PRIMERA_OLEADA',
  'CONTRAATAQUE_SEGUNDA_OLEADA',
  'ATAQUE_POSICIONAL',
  'SAQUE_CENTRO_RAPIDO',
  'SIETE_METROS',
  'GOLPE_FRANCO',
  'ATAQUE_PORTERIA_VACIA',
  'TRANSICION_DEFENSIVA',
  'DEFENSA_POSICIONAL',
  'ATAQUE_SUPERIORIDAD',
  'ATAQUE_INFERIORIDAD',
  'DEFENSA_SUPERIORIDAD',
  'DEFENSA_INFERIORIDAD',
  'ATAQUE_7_VS_6',
  'DEFENSA_7_VS_6',
  'OTRA'
);

CREATE TYPE situacion_numerica AS ENUM (
  'SEIS_VS_SEIS',
  'SEIS_VS_CINCO',
  'CINCO_VS_SEIS',
  'SIETE_VS_SEIS',
  'SEIS_VS_SIETE',
  'CINCO_VS_CINCO',
  'OTRA'
);

CREATE TYPE sistema_ataque AS ENUM (
  'TRES_TRES',
  'DOS_CUATRO',
  'SIETE_VS_SEIS',
  'PORTERIA_VACIA',
  'DESCONOCIDO'
);

CREATE TYPE sistema_defensa AS ENUM (
  'SEIS_CERO',
  'CINCO_UNO',
  'TRES_DOS_UNO',
  'CUATRO_DOS',
  'TRES_TRES',
  'MIXTA',
  'INDIVIDUAL',
  'DESCONOCIDA'
);

CREATE TYPE tipo_evento AS ENUM (
  'LANZAMIENTO',
  'GOL',
  'PARADA',
  'PERDIDA',
  'ROBO',
  'BLOCAJE',
  'ASISTENCIA',
  'ERROR_TECNICO',
  'FALTA_COMETIDA',
  'FALTA_RECIBIDA',
  'SIETE_METROS_PROVOCADO',
  'SIETE_METROS_COMETIDO',
  'DOS_MINUTOS',
  'TARJETA_AMARILLA',
  'TARJETA_ROJA',
  'TARJETA_AZUL',
  'TIEMPO_MUERTO',
  'CAMBIO',
  'PASIVO',
  'REBOTE',
  'CAMBIO_SISTEMA',
  'INICIO_PERIODO',
  'FIN_PERIODO',
  'INICIO_PARTIDO',
  'FIN_PARTIDO',
  'OTRO'
);

CREATE TYPE tipo_lanzamiento AS ENUM (
  'LANZAMIENTO_SUSPENSION',
  'LANZAMIENTO_APOYO',
  'LANZAMIENTO_EXTREMO',
  'LANZAMIENTO_PIVOTE',
  'LANZAMIENTO_CONTRAATAQUE',
  'LANZAMIENTO_SIETE_METROS',
  'LANZAMIENTO_PORTERIA_VACIA',
  'GOLPE_FRANCO_DIRECTO',
  'OTRO'
);

CREATE TYPE resultado_evento AS ENUM (
  'EXITO',
  'FALLO',
  'NEUTRO'
);

CREATE TYPE resultado_lanzamiento AS ENUM (
  'GOL',
  'PARADA',
  'PALO',
  'FUERA',
  'BLOCADO',
  'ERROR_TECNICO'
);

CREATE TYPE zona_campo AS ENUM (
  'EXTREMO_IZQUIERDO',
  'LATERAL_IZQUIERDO_9M',
  'CENTRAL_9M',
  'LATERAL_DERECHO_9M',
  'EXTREMO_DERECHO',
  'IZQUIERDA_6M',
  'CENTRO_6M',
  'DERECHA_6M',
  'ZONA_PIVOTE',
  'SIETE_METROS',
  'CAMPO_PROPIO',
  'PORTERIA_VACIA_LARGA_DISTANCIA',
  'DESCONOCIDA'
);

CREATE TYPE zona_porteria AS ENUM (
  'ALTA_IZQUIERDA',
  'ALTA_CENTRO',
  'ALTA_DERECHA',
  'MEDIA_IZQUIERDA',
  'MEDIA_CENTRO',
  'MEDIA_DERECHA',
  'BAJA_IZQUIERDA',
  'BAJA_CENTRO',
  'BAJA_DERECHA',
  'DESCONOCIDA'
);

CREATE TYPE tipo_informe AS ENUM (
  'PARTIDO',
  'EQUIPO',
  'JUGADOR',
  'PORTERO',
  'TEMPORADA',
  'RIVAL'
);

CREATE TYPE estado_informe AS ENUM (
  'BORRADOR',
  'GENERADO',
  'REVISADO',
  'ARCHIVADO'
);

-- =========================================================
-- FUNCION PARA ACTUALIZAR actualizado_en
-- =========================================================

CREATE OR REPLACE FUNCTION actualizar_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- USUARIOS
-- Usuarios que pueden acceder a la plataforma.
-- Pueden ser gestores de club, entrenadores, ayudantes o analistas.
-- =========================================================

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email CITEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellidos TEXT,
  password_hash TEXT,
  avatar_url TEXT,

  activo BOOLEAN NOT NULL DEFAULT TRUE,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

CREATE TRIGGER trg_usuarios_actualizado_en
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- CLUBES
-- Entidad principal del sistema.
-- =========================================================

CREATE TABLE clubes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  nombre TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,

  ciudad TEXT,
  pais TEXT,

  logo_url TEXT,
  color_primario TEXT,
  color_secundario TEXT,

  activo BOOLEAN NOT NULL DEFAULT TRUE,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clubes_slug ON clubes(slug);
CREATE INDEX idx_clubes_activo ON clubes(activo);

CREATE TRIGGER trg_clubes_actualizado_en
BEFORE UPDATE ON clubes
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- USUARIOS DEL CLUB
-- Relación entre usuarios y clubes.
-- Aquí se define el rol global del usuario dentro del club.
-- =========================================================

CREATE TABLE club_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  rol rol_club NOT NULL,

  activo BOOLEAN NOT NULL DEFAULT TRUE,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_club_usuarios_club_usuario UNIQUE (club_id, usuario_id)
);

CREATE INDEX idx_club_usuarios_club_id ON club_usuarios(club_id);
CREATE INDEX idx_club_usuarios_usuario_id ON club_usuarios(usuario_id);
CREATE INDEX idx_club_usuarios_rol ON club_usuarios(rol);

CREATE TRIGGER trg_club_usuarios_actualizado_en
BEFORE UPDATE ON club_usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- INVITACIONES AL CLUB
-- Códigos/tokens que permiten a un usuario unirse a un club con un rol.
-- El token se puede compartir como código o (en el futuro) por email.
-- =========================================================

CREATE TABLE invitaciones_club (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL UNIQUE,

  rol rol_club NOT NULL DEFAULT 'ENTRENADOR',
  email CITEXT,

  creada_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  expira_en TIMESTAMPTZ,

  max_usos INTEGER NOT NULL DEFAULT 1,
  usos INTEGER NOT NULL DEFAULT 0,

  activa BOOLEAN NOT NULL DEFAULT TRUE,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_invitaciones_max_usos CHECK (max_usos >= 1),
  CONSTRAINT chk_invitaciones_usos CHECK (usos >= 0 AND usos <= max_usos)
);

CREATE INDEX idx_invitaciones_club_id ON invitaciones_club(club_id);
CREATE INDEX idx_invitaciones_codigo ON invitaciones_club(codigo);
CREATE INDEX idx_invitaciones_activa ON invitaciones_club(activa);

CREATE TRIGGER trg_invitaciones_actualizado_en
BEFORE UPDATE ON invitaciones_club
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- TEMPORADAS
-- Cada club puede tener varias temporadas.
-- =========================================================

CREATE TABLE temporadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,

  nombre TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,

  activa BOOLEAN NOT NULL DEFAULT FALSE,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_temporadas_club_nombre UNIQUE (club_id, nombre),
  CONSTRAINT chk_temporadas_fechas CHECK (fecha_inicio <= fecha_fin)
);

CREATE INDEX idx_temporadas_club_id ON temporadas(club_id);
CREATE INDEX idx_temporadas_activa ON temporadas(activa);

CREATE TRIGGER trg_temporadas_actualizado_en
BEFORE UPDATE ON temporadas
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- EQUIPOS
-- Equipos del club en una temporada.
--
-- tipo = PROPIO:
--   Equipo perteneciente al club.
--
-- tipo = RIVAL:
--   Equipo rival reutilizable dentro de la misma temporada.
--
-- Ejemplo:
--   Senior Masculino 2026/27        -> PROPIO
--   BM Norte Senior Masculino       -> RIVAL
-- =========================================================

CREATE TABLE equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,

  nombre TEXT NOT NULL,
  nombre_corto TEXT,

  categoria categoria_equipo NOT NULL,
  genero genero_equipo NOT NULL,
  tipo tipo_equipo NOT NULL DEFAULT 'PROPIO',

  logo_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_equipos_club_temporada_nombre UNIQUE (club_id, temporada_id, nombre)
);

CREATE INDEX idx_equipos_club_id ON equipos(club_id);
CREATE INDEX idx_equipos_temporada_id ON equipos(temporada_id);
CREATE INDEX idx_equipos_categoria ON equipos(categoria);
CREATE INDEX idx_equipos_genero ON equipos(genero);
CREATE INDEX idx_equipos_tipo ON equipos(tipo);
CREATE INDEX idx_equipos_activo ON equipos(activo);

CREATE TRIGGER trg_equipos_actualizado_en
BEFORE UPDATE ON equipos
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- USUARIOS ASIGNADOS A EQUIPOS
-- Permite asignar entrenadores, ayudantes o analistas a equipos concretos.
--
-- Ejemplo:
-- Juan es ENTRENADOR del Senior.
-- Marta es AYUDANTE del Juvenil.
-- Pedro es ANALISTA del Senior y del Juvenil.
-- =========================================================

CREATE TABLE equipo_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,

  rol rol_club NOT NULL,

  fecha_inicio DATE,
  fecha_fin DATE,

  activo BOOLEAN NOT NULL DEFAULT TRUE,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_equipo_usuarios_equipo_usuario_rol UNIQUE (
    equipo_id,
    usuario_id,
    temporada_id,
    rol
  ),

  CONSTRAINT chk_equipo_usuarios_fechas CHECK (
    fecha_inicio IS NULL OR fecha_fin IS NULL OR fecha_inicio <= fecha_fin
  )
);

CREATE INDEX idx_equipo_usuarios_equipo_id ON equipo_usuarios(equipo_id);
CREATE INDEX idx_equipo_usuarios_usuario_id ON equipo_usuarios(usuario_id);
CREATE INDEX idx_equipo_usuarios_temporada_id ON equipo_usuarios(temporada_id);
CREATE INDEX idx_equipo_usuarios_rol ON equipo_usuarios(rol);

CREATE TRIGGER trg_equipo_usuarios_actualizado_en
BEFORE UPDATE ON equipo_usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- JUGADORES
-- El jugador pertenece al club, no directamente a un solo equipo.
--
-- tipo = PROPIO:
--   Jugador del club.
--
-- tipo = RIVAL:
--   Jugador rival registrado para scouting.
--
-- Esto permite que:
-- - un juvenil pueda jugar con el senior sin duplicarse;
-- - un jugador rival pueda reutilizarse en varios partidos de la temporada.
-- =========================================================

CREATE TABLE jugadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,

  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,

  fecha_nacimiento DATE,

  tipo tipo_jugador NOT NULL DEFAULT 'PROPIO',

  mano_dominante mano_dominante NOT NULL DEFAULT 'DESCONOCIDA',
  posicion_principal posicion_jugador,
  posicion_secundaria posicion_jugador,

  altura_cm INTEGER,
  peso_kg INTEGER,
  foto_url TEXT,

  activo BOOLEAN NOT NULL DEFAULT TRUE,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_jugadores_altura CHECK (
    altura_cm IS NULL OR altura_cm > 0
  ),

  CONSTRAINT chk_jugadores_peso CHECK (
    peso_kg IS NULL OR peso_kg > 0
  )
);

CREATE INDEX idx_jugadores_club_id ON jugadores(club_id);
CREATE INDEX idx_jugadores_nombre ON jugadores(apellidos, nombre);
CREATE INDEX idx_jugadores_tipo ON jugadores(tipo);
CREATE INDEX idx_jugadores_posicion_principal ON jugadores(posicion_principal);
CREATE INDEX idx_jugadores_activo ON jugadores(activo);

CREATE TRIGGER trg_jugadores_actualizado_en
BEFORE UPDATE ON jugadores
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- JUGADORES EN EQUIPOS
-- Relación entre jugadores y equipos.
--
-- Resuelve:
-- - jugador juvenil que también puede jugar con senior;
-- - jugadores rivales vinculados a equipos rivales reutilizables.
--
-- tipo_asignacion:
-- - PRINCIPAL
-- - REFUERZO
-- - DISPONIBLE
-- =========================================================

CREATE TABLE jugadores_equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,

  dorsal INTEGER,

  equipo_principal BOOLEAN NOT NULL DEFAULT TRUE,
  disponible_para_jugar BOOLEAN NOT NULL DEFAULT TRUE,

  tipo_asignacion TEXT NOT NULL DEFAULT 'PRINCIPAL',

  fecha_inicio DATE,
  fecha_fin DATE,

  activo BOOLEAN NOT NULL DEFAULT TRUE,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_jugadores_equipos UNIQUE (
    jugador_id,
    equipo_id,
    temporada_id
  ),

  CONSTRAINT chk_jugadores_equipos_dorsal CHECK (
    dorsal IS NULL OR dorsal BETWEEN 0 AND 99
  ),

  CONSTRAINT chk_jugadores_equipos_fechas CHECK (
    fecha_inicio IS NULL OR fecha_fin IS NULL OR fecha_inicio <= fecha_fin
  ),

  CONSTRAINT chk_jugadores_equipos_tipo_asignacion CHECK (
    tipo_asignacion IN ('PRINCIPAL', 'REFUERZO', 'DISPONIBLE')
  )
);

CREATE INDEX idx_jugadores_equipos_jugador_id ON jugadores_equipos(jugador_id);
CREATE INDEX idx_jugadores_equipos_equipo_id ON jugadores_equipos(equipo_id);
CREATE INDEX idx_jugadores_equipos_temporada_id ON jugadores_equipos(temporada_id);
CREATE INDEX idx_jugadores_equipos_tipo_asignacion ON jugadores_equipos(tipo_asignacion);
CREATE INDEX idx_jugadores_equipos_activo ON jugadores_equipos(activo);

CREATE TRIGGER trg_jugadores_equipos_actualizado_en
BEFORE UPDATE ON jugadores_equipos
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- COMPETICIONES
-- Competiciones de una temporada.
-- Ejemplo: Liga Territorial, Copa Federación, Torneo amistoso.
-- =========================================================

CREATE TABLE competiciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,

  nombre TEXT NOT NULL,
  categoria TEXT,
  nivel TEXT,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_competiciones_club_temporada_nombre UNIQUE (
    club_id,
    temporada_id,
    nombre
  )
);

CREATE INDEX idx_competiciones_club_id ON competiciones(club_id);
CREATE INDEX idx_competiciones_temporada_id ON competiciones(temporada_id);

CREATE TRIGGER trg_competiciones_actualizado_en
BEFORE UPDATE ON competiciones
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- PARTIDOS
--
-- equipo_id:
--   Nuestro equipo.
--
-- rival_equipo_id:
--   Equipo rival reutilizable dentro de la misma temporada.
--   En modo EQUIPO_PROPIO puede ser NULL, aunque es recomendable tenerlo.
--   En modo SCOUTING_COMPLETO debe existir.
--
-- rival_nombre:
--   Nombre histórico del rival en este partido.
--   Se mantiene aunque cambie el nombre del equipo rival en el futuro.
--
-- modo_toma_datos:
--   EQUIPO_PROPIO:
--     Se toman datos de nuestro equipo.
--     Las acciones del rival se registran indirectamente.
--
--   SCOUTING_COMPLETO:
--     Se toman datos de ambos equipos.
--     Se pueden registrar jugadores propios y rivales.
-- =========================================================

CREATE TABLE partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  competicion_id UUID REFERENCES competiciones(id) ON DELETE SET NULL,

  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  rival_equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL,

  rival_nombre TEXT NOT NULL,

  modo_toma_datos modo_toma_datos NOT NULL DEFAULT 'EQUIPO_PROPIO',

  tipo_localizacion tipo_localizacion_partido NOT NULL,
  pabellon TEXT,

  fecha_partido TIMESTAMPTZ NOT NULL,
  estado estado_partido NOT NULL DEFAULT 'PROGRAMADO',

  goles_equipo INTEGER NOT NULL DEFAULT 0,
  goles_rival INTEGER NOT NULL DEFAULT 0,

  notas TEXT,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_partidos_goles_no_negativos CHECK (
    goles_equipo >= 0 AND goles_rival >= 0
  ),

  CONSTRAINT chk_partidos_equipos_distintos CHECK (
    rival_equipo_id IS NULL OR equipo_id <> rival_equipo_id
  ),

  CONSTRAINT chk_partidos_scouting_con_rival CHECK (
    modo_toma_datos <> 'SCOUTING_COMPLETO' OR rival_equipo_id IS NOT NULL
  )
);

CREATE INDEX idx_partidos_club_id ON partidos(club_id);
CREATE INDEX idx_partidos_temporada_id ON partidos(temporada_id);
CREATE INDEX idx_partidos_competicion_id ON partidos(competicion_id);
CREATE INDEX idx_partidos_equipo_id ON partidos(equipo_id);
CREATE INDEX idx_partidos_rival_equipo_id ON partidos(rival_equipo_id);
CREATE INDEX idx_partidos_modo_toma_datos ON partidos(modo_toma_datos);
CREATE INDEX idx_partidos_fecha_partido ON partidos(fecha_partido);
CREATE INDEX idx_partidos_estado ON partidos(estado);

CREATE TRIGGER trg_partidos_actualizado_en
BEFORE UPDATE ON partidos
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- CONVOCATORIAS DE PARTIDO
-- Jugadores convocados para un partido concreto.
--
-- Sirve tanto para jugadores propios como para jugadores rivales,
-- según el modo de toma de datos.
--
-- En modo EQUIPO_PROPIO:
--   normalmente solo se cargan jugadores de nuestro equipo.
--
-- En modo SCOUTING_COMPLETO:
--   se pueden cargar jugadores de nuestro equipo y del equipo rival.
-- =========================================================

CREATE TABLE convocatorias_partido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,

  dorsal INTEGER,

  posicion posicion_jugador,

  titular BOOLEAN NOT NULL DEFAULT FALSE,
  es_portero BOOLEAN NOT NULL DEFAULT FALSE,
  capitan BOOLEAN NOT NULL DEFAULT FALSE,
  disponible BOOLEAN NOT NULL DEFAULT TRUE,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_convocatorias_partido_jugador UNIQUE (
    partido_id,
    equipo_id,
    jugador_id
  ),

  CONSTRAINT chk_convocatorias_partido_dorsal CHECK (
    dorsal IS NULL OR dorsal BETWEEN 0 AND 99
  )
);

CREATE INDEX idx_convocatorias_partido_partido_id ON convocatorias_partido(partido_id);
CREATE INDEX idx_convocatorias_partido_equipo_id ON convocatorias_partido(equipo_id);
CREATE INDEX idx_convocatorias_partido_jugador_id ON convocatorias_partido(jugador_id);
CREATE INDEX idx_convocatorias_partido_titular ON convocatorias_partido(titular);
CREATE INDEX idx_convocatorias_partido_es_portero ON convocatorias_partido(es_portero);

CREATE TRIGGER trg_convocatorias_partido_actualizado_en
BEFORE UPDATE ON convocatorias_partido
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- EVENTOS DE PARTIDO
-- Tabla principal de estadísticas.
--
-- Cada acción del partido se guarda como un evento.
--
-- Significado clave:
--
-- origen:
--   EQUIPO_PROPIO:
--     La acción pertenece a nuestro equipo.
--
--   RIVAL:
--     La acción pertenece al rival.
--
-- equipo_id:
--   Equipo que realiza la acción.
--   En modo EQUIPO_PROPIO puede ser NULL para acciones indirectas del rival
--   si no hemos creado equipo rival.
--
-- jugador_id:
--   Jugador que realiza la acción.
--   En modo EQUIPO_PROPIO será normalmente jugador propio.
--   En scouting completo puede ser jugador propio o rival.
--
-- jugador_texto:
--   Campo libre para indicar "#10", "dorsal 7", "central rival", etc.
--   Útil si no queremos crear un jugador rival.
--
-- portero_id:
--   Portero implicado en el lanzamiento/parada/gol recibido.
--   Puede ser propio o rival según el modo.
--
-- Ejemplos:
--
-- Gol nuestro:
--   origen = EQUIPO_PROPIO
--   tipo = LANZAMIENTO
--   resultado_lanzamiento = GOL
--
-- Gol recibido en modo equipo propio:
--   origen = RIVAL
--   jugador_id = NULL
--   portero_id = nuestro portero
--   tipo = LANZAMIENTO
--   resultado_lanzamiento = GOL
--
-- Parada de nuestro portero:
--   origen = RIVAL
--   jugador_id = NULL
--   portero_id = nuestro portero
--   tipo = LANZAMIENTO
--   resultado_lanzamiento = PARADA
--
-- Gol del rival en scouting completo:
--   origen = RIVAL
--   equipo_id = equipo rival
--   jugador_id = jugador rival
--   portero_id = nuestro portero
-- =========================================================

CREATE TABLE eventos_partido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sincronización offline desde tablet/móvil
  id_local TEXT,
  dispositivo_id TEXT,

  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,

  origen origen_evento NOT NULL DEFAULT 'EQUIPO_PROPIO',

  equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL,

  jugador_id UUID REFERENCES jugadores(id) ON DELETE SET NULL,
  jugador_asistencia_id UUID REFERENCES jugadores(id) ON DELETE SET NULL,
  portero_id UUID REFERENCES jugadores(id) ON DELETE SET NULL,

  jugador_texto TEXT,

  creado_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  periodo periodo_partido NOT NULL,
  tiempo_ms INTEGER NOT NULL,

  -- Marcador en el momento del evento
  goles_equipo INTEGER NOT NULL DEFAULT 0,
  goles_rival INTEGER NOT NULL DEFAULT 0,

  tipo tipo_evento NOT NULL,
  subtipo TEXT,

  fase fase_juego,
  situacion_numerica situacion_numerica,
  sistema_ataque sistema_ataque,
  sistema_defensa sistema_defensa,

  tipo_lanzamiento tipo_lanzamiento,
  resultado_lanzamiento resultado_lanzamiento,
  resultado resultado_evento,

  -- Coordenadas normalizadas 0-100
  campo_x NUMERIC(5,2),
  campo_y NUMERIC(5,2),
  zona_campo zona_campo,

  -- Zona de portería
  zona_porteria zona_porteria,

  -- Datos flexibles para ampliar sin tocar schema cada vez
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  eliminado BOOLEAN NOT NULL DEFAULT FALSE,
  corregido BOOLEAN NOT NULL DEFAULT FALSE,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sincronizado_en TIMESTAMPTZ,

  CONSTRAINT chk_eventos_partido_tiempo_ms CHECK (
    tiempo_ms >= 0
  ),

  CONSTRAINT chk_eventos_partido_goles_no_negativos CHECK (
    goles_equipo >= 0 AND goles_rival >= 0
  ),

  CONSTRAINT chk_eventos_partido_campo_x CHECK (
    campo_x IS NULL OR campo_x BETWEEN 0 AND 100
  ),

  CONSTRAINT chk_eventos_partido_campo_y CHECK (
    campo_y IS NULL OR campo_y BETWEEN 0 AND 100
  )
);

-- Evita duplicar eventos cuando se sincroniza desde una app offline.
CREATE UNIQUE INDEX uq_eventos_partido_offline
ON eventos_partido(partido_id, id_local, dispositivo_id)
WHERE id_local IS NOT NULL AND dispositivo_id IS NOT NULL;

CREATE INDEX idx_eventos_partido_partido_id ON eventos_partido(partido_id);
CREATE INDEX idx_eventos_partido_origen ON eventos_partido(origen);
CREATE INDEX idx_eventos_partido_equipo_id ON eventos_partido(equipo_id);
CREATE INDEX idx_eventos_partido_jugador_id ON eventos_partido(jugador_id);
CREATE INDEX idx_eventos_partido_jugador_asistencia_id ON eventos_partido(jugador_asistencia_id);
CREATE INDEX idx_eventos_partido_portero_id ON eventos_partido(portero_id);
CREATE INDEX idx_eventos_partido_jugador_texto ON eventos_partido(jugador_texto);
CREATE INDEX idx_eventos_partido_creado_por_usuario_id ON eventos_partido(creado_por_usuario_id);
CREATE INDEX idx_eventos_partido_tipo ON eventos_partido(tipo);
CREATE INDEX idx_eventos_partido_fase ON eventos_partido(fase);
CREATE INDEX idx_eventos_partido_tiempo_ms ON eventos_partido(tiempo_ms);
CREATE INDEX idx_eventos_partido_partido_tiempo ON eventos_partido(partido_id, tiempo_ms);
CREATE INDEX idx_eventos_partido_zona_campo ON eventos_partido(zona_campo);
CREATE INDEX idx_eventos_partido_zona_porteria ON eventos_partido(zona_porteria);
CREATE INDEX idx_eventos_partido_resultado_lanzamiento ON eventos_partido(resultado_lanzamiento);
CREATE INDEX idx_eventos_partido_metadata_gin ON eventos_partido USING GIN(metadata);

CREATE TRIGGER trg_eventos_partido_actualizado_en
BEFORE UPDATE ON eventos_partido
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- CORRECCIONES DE EVENTO
-- Guarda trazabilidad cuando se corrige una acción.
--
-- Ejemplo:
-- Se registró lanzamiento del jugador 9,
-- pero realmente era del jugador 11.
-- =========================================================

CREATE TABLE correcciones_evento_partido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES eventos_partido(id) ON DELETE CASCADE,
  corregido_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  motivo TEXT,

  datos_anteriores JSONB NOT NULL,
  datos_nuevos JSONB NOT NULL,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_correcciones_evento_partido_partido_id ON correcciones_evento_partido(partido_id);
CREATE INDEX idx_correcciones_evento_partido_evento_id ON correcciones_evento_partido(evento_id);
CREATE INDEX idx_correcciones_evento_partido_usuario_id ON correcciones_evento_partido(corregido_por_usuario_id);

-- =========================================================
-- ESTADISTICAS DE EQUIPO POR PARTIDO
-- Agregados calculados a partir de eventos_partido.
--
-- Puedes calcularlos al final del partido o en tiempo real.
-- =========================================================

CREATE TABLE estadisticas_equipo_partido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,

  goles INTEGER NOT NULL DEFAULT 0,
  lanzamientos INTEGER NOT NULL DEFAULT 0,
  paradas INTEGER NOT NULL DEFAULT 0,
  perdidas INTEGER NOT NULL DEFAULT 0,
  robos INTEGER NOT NULL DEFAULT 0,
  blocajes INTEGER NOT NULL DEFAULT 0,
  exclusiones INTEGER NOT NULL DEFAULT 0,

  eficacia_ataque NUMERIC(5,2),
  eficacia_lanzamiento NUMERIC(5,2),
  porcentaje_paradas NUMERIC(5,2),

  desglose JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_estadisticas_equipo_partido UNIQUE (
    partido_id,
    equipo_id
  ),

  CONSTRAINT chk_estadisticas_equipo_partido_no_negativas CHECK (
    goles >= 0 AND
    lanzamientos >= 0 AND
    paradas >= 0 AND
    perdidas >= 0 AND
    robos >= 0 AND
    blocajes >= 0 AND
    exclusiones >= 0
  ),

  CONSTRAINT chk_estadisticas_equipo_partido_porcentajes CHECK (
    (eficacia_ataque IS NULL OR eficacia_ataque BETWEEN 0 AND 100) AND
    (eficacia_lanzamiento IS NULL OR eficacia_lanzamiento BETWEEN 0 AND 100) AND
    (porcentaje_paradas IS NULL OR porcentaje_paradas BETWEEN 0 AND 100)
  )
);

CREATE INDEX idx_estadisticas_equipo_partido_partido_id ON estadisticas_equipo_partido(partido_id);
CREATE INDEX idx_estadisticas_equipo_partido_equipo_id ON estadisticas_equipo_partido(equipo_id);
CREATE INDEX idx_estadisticas_equipo_partido_desglose_gin ON estadisticas_equipo_partido USING GIN(desglose);

CREATE TRIGGER trg_estadisticas_equipo_partido_actualizado_en
BEFORE UPDATE ON estadisticas_equipo_partido
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- ESTADISTICAS DE JUGADOR POR PARTIDO
-- Agregados individuales calculados a partir de eventos_partido.
-- =========================================================

CREATE TABLE estadisticas_jugador_partido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,

  goles INTEGER NOT NULL DEFAULT 0,
  lanzamientos INTEGER NOT NULL DEFAULT 0,
  asistencias INTEGER NOT NULL DEFAULT 0,
  paradas INTEGER NOT NULL DEFAULT 0,
  goles_recibidos INTEGER NOT NULL DEFAULT 0,
  perdidas INTEGER NOT NULL DEFAULT 0,
  robos INTEGER NOT NULL DEFAULT 0,
  blocajes INTEGER NOT NULL DEFAULT 0,
  exclusiones INTEGER NOT NULL DEFAULT 0,

  eficacia_lanzamiento NUMERIC(5,2),
  porcentaje_paradas NUMERIC(5,2),

  desglose JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_estadisticas_jugador_partido UNIQUE (
    partido_id,
    equipo_id,
    jugador_id
  ),

  CONSTRAINT chk_estadisticas_jugador_partido_no_negativas CHECK (
    goles >= 0 AND
    lanzamientos >= 0 AND
    asistencias >= 0 AND
    paradas >= 0 AND
    goles_recibidos >= 0 AND
    perdidas >= 0 AND
    robos >= 0 AND
    blocajes >= 0 AND
    exclusiones >= 0
  ),

  CONSTRAINT chk_estadisticas_jugador_partido_porcentajes CHECK (
    (eficacia_lanzamiento IS NULL OR eficacia_lanzamiento BETWEEN 0 AND 100) AND
    (porcentaje_paradas IS NULL OR porcentaje_paradas BETWEEN 0 AND 100)
  )
);

CREATE INDEX idx_estadisticas_jugador_partido_partido_id ON estadisticas_jugador_partido(partido_id);
CREATE INDEX idx_estadisticas_jugador_partido_equipo_id ON estadisticas_jugador_partido(equipo_id);
CREATE INDEX idx_estadisticas_jugador_partido_jugador_id ON estadisticas_jugador_partido(jugador_id);
CREATE INDEX idx_estadisticas_jugador_partido_desglose_gin ON estadisticas_jugador_partido USING GIN(desglose);

CREATE TRIGGER trg_estadisticas_jugador_partido_actualizado_en
BEFORE UPDATE ON estadisticas_jugador_partido
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- INFORMES
-- Informes manuales o generados por IA.
--
-- Puede haber informes de:
-- - partido
-- - equipo
-- - jugador
-- - portero
-- - temporada
-- - rival
-- =========================================================

CREATE TABLE informes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  temporada_id UUID REFERENCES temporadas(id) ON DELETE SET NULL,
  partido_id UUID REFERENCES partidos(id) ON DELETE SET NULL,
  equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL,
  jugador_id UUID REFERENCES jugadores(id) ON DELETE SET NULL,

  creado_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  tipo tipo_informe NOT NULL,
  estado estado_informe NOT NULL DEFAULT 'BORRADOR',

  titulo TEXT NOT NULL,
  resumen TEXT,
  contenido JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_url TEXT,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_informes_club_id ON informes(club_id);
CREATE INDEX idx_informes_temporada_id ON informes(temporada_id);
CREATE INDEX idx_informes_partido_id ON informes(partido_id);
CREATE INDEX idx_informes_equipo_id ON informes(equipo_id);
CREATE INDEX idx_informes_jugador_id ON informes(jugador_id);
CREATE INDEX idx_informes_creado_por_usuario_id ON informes(creado_por_usuario_id);
CREATE INDEX idx_informes_tipo ON informes(tipo);
CREATE INDEX idx_informes_estado ON informes(estado);
CREATE INDEX idx_informes_contenido_gin ON informes USING GIN(contenido);

CREATE TRIGGER trg_informes_actualizado_en
BEFORE UPDATE ON informes
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

-- =========================================================
-- CONVERSACIONES IA
-- Para chatbot, análisis de datos e informes inteligentes.
-- =========================================================

CREATE TABLE conversaciones_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  titulo TEXT,
  contexto JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversaciones_ia_club_id ON conversaciones_ia(club_id);
CREATE INDEX idx_conversaciones_ia_usuario_id ON conversaciones_ia(usuario_id);
CREATE INDEX idx_conversaciones_ia_contexto_gin ON conversaciones_ia USING GIN(contexto);

CREATE TRIGGER trg_conversaciones_ia_actualizado_en
BEFORE UPDATE ON conversaciones_ia
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

CREATE TABLE mensajes_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  conversacion_id UUID NOT NULL REFERENCES conversaciones_ia(id) ON DELETE CASCADE,

  rol TEXT NOT NULL,
  contenido TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_mensajes_ia_rol CHECK (
    rol IN ('system', 'user', 'assistant', 'tool')
  )
);

CREATE INDEX idx_mensajes_ia_conversacion_id ON mensajes_ia(conversacion_id);
CREATE INDEX idx_mensajes_ia_creado_en ON mensajes_ia(creado_en);
CREATE INDEX idx_mensajes_ia_metadata_gin ON mensajes_ia USING GIN(metadata);

-- =========================================================
-- CONSULTAS DE EJEMPLO
-- =========================================================

-- Goles de nuestro equipo en un partido:
-- SELECT COUNT(*)
-- FROM eventos_partido
-- WHERE partido_id = :partido_id
--   AND origen = 'EQUIPO_PROPIO'
--   AND tipo = 'LANZAMIENTO'
--   AND resultado_lanzamiento = 'GOL'
--   AND eliminado = FALSE;

-- Goles del rival en un partido:
-- SELECT COUNT(*)
-- FROM eventos_partido
-- WHERE partido_id = :partido_id
--   AND origen = 'RIVAL'
--   AND tipo = 'LANZAMIENTO'
--   AND resultado_lanzamiento = 'GOL'
--   AND eliminado = FALSE;

-- Paradas de nuestro portero:
-- SELECT
--   j.id,
--   j.nombre,
--   j.apellidos,
--   COUNT(*) AS paradas
-- FROM eventos_partido e
-- JOIN jugadores j ON j.id = e.portero_id
-- WHERE e.partido_id = :partido_id
--   AND e.origen = 'RIVAL'
--   AND e.tipo = 'LANZAMIENTO'
--   AND e.resultado_lanzamiento = 'PARADA'
--   AND e.eliminado = FALSE
-- GROUP BY j.id, j.nombre, j.apellidos;
