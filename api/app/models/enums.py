import enum


class RolClub(str, enum.Enum):
    """Coincide con el tipo ENUM `rol_club` definido en db/schema.sql."""

    GESTOR_CLUB = "GESTOR_CLUB"
    ENTRENADOR = "ENTRENADOR"
    AYUDANTE = "AYUDANTE"
    ANALISTA = "ANALISTA"


class CategoriaEquipo(str, enum.Enum):
    SENIOR = "SENIOR"
    JUVENIL = "JUVENIL"
    CADETE = "CADETE"
    INFANTIL = "INFANTIL"
    ALEVIN = "ALEVIN"
    BENJAMIN = "BENJAMIN"
    OTRO = "OTRO"


class GeneroEquipo(str, enum.Enum):
    MASCULINO = "MASCULINO"
    FEMENINO = "FEMENINO"
    MIXTO = "MIXTO"


class TipoEquipo(str, enum.Enum):
    PROPIO = "PROPIO"
    RIVAL = "RIVAL"


class TipoJugador(str, enum.Enum):
    PROPIO = "PROPIO"
    RIVAL = "RIVAL"


class ManoDominante(str, enum.Enum):
    DERECHA = "DERECHA"
    IZQUIERDA = "IZQUIERDA"
    AMBAS = "AMBAS"
    DESCONOCIDA = "DESCONOCIDA"


class PosicionJugador(str, enum.Enum):
    PORTERO = "PORTERO"
    EXTREMO_IZQUIERDO = "EXTREMO_IZQUIERDO"
    EXTREMO_DERECHO = "EXTREMO_DERECHO"
    LATERAL_IZQUIERDO = "LATERAL_IZQUIERDO"
    LATERAL_DERECHO = "LATERAL_DERECHO"
    CENTRAL = "CENTRAL"
    PIVOTE = "PIVOTE"
    UNIVERSAL = "UNIVERSAL"


class TipoAsignacion(str, enum.Enum):
    """Columna TEXT con CHECK en jugadores_equipos (no es un ENUM nativo)."""

    PRINCIPAL = "PRINCIPAL"
    REFUERZO = "REFUERZO"
    DISPONIBLE = "DISPONIBLE"


class ModoTomaDatos(str, enum.Enum):
    EQUIPO_PROPIO = "EQUIPO_PROPIO"
    SCOUTING_COMPLETO = "SCOUTING_COMPLETO"


class TipoLocalizacionPartido(str, enum.Enum):
    LOCAL = "LOCAL"
    VISITANTE = "VISITANTE"
    NEUTRAL = "NEUTRAL"


class EstadoPartido(str, enum.Enum):
    PROGRAMADO = "PROGRAMADO"
    EN_DIRECTO = "EN_DIRECTO"
    FINALIZADO = "FINALIZADO"
    CANCELADO = "CANCELADO"
    APLAZADO = "APLAZADO"


class OrigenEvento(str, enum.Enum):
    EQUIPO_PROPIO = "EQUIPO_PROPIO"
    RIVAL = "RIVAL"


class PeriodoPartido(str, enum.Enum):
    PRIMERA_PARTE = "PRIMERA_PARTE"
    SEGUNDA_PARTE = "SEGUNDA_PARTE"
    PRORROGA_1 = "PRORROGA_1"
    PRORROGA_2 = "PRORROGA_2"
    PENALTIS = "PENALTIS"


class TipoEvento(str, enum.Enum):
    """Coincide con el ENUM `tipo_evento` de db/schema.sql.

    Los lanzamientos (propios o rivales) siempre se registran con
    tipo=LANZAMIENTO y el resultado se matiza en `resultado_lanzamiento`
    (GOL, PARADA, PALO, FUERA, BLOCADO, ERROR_TECNICO) — ver los ejemplos
    documentados junto a la tabla eventos_partido en schema.sql.
    """

    LANZAMIENTO = "LANZAMIENTO"
    GOL = "GOL"
    PARADA = "PARADA"
    PERDIDA = "PERDIDA"
    ROBO = "ROBO"
    BLOCAJE = "BLOCAJE"
    ASISTENCIA = "ASISTENCIA"
    ERROR_TECNICO = "ERROR_TECNICO"
    FALTA_COMETIDA = "FALTA_COMETIDA"
    FALTA_RECIBIDA = "FALTA_RECIBIDA"
    SIETE_METROS_PROVOCADO = "SIETE_METROS_PROVOCADO"
    SIETE_METROS_COMETIDO = "SIETE_METROS_COMETIDO"
    DOS_MINUTOS = "DOS_MINUTOS"
    TARJETA_AMARILLA = "TARJETA_AMARILLA"
    TARJETA_ROJA = "TARJETA_ROJA"
    TARJETA_AZUL = "TARJETA_AZUL"
    TIEMPO_MUERTO = "TIEMPO_MUERTO"
    CAMBIO = "CAMBIO"
    PASIVO = "PASIVO"
    REBOTE = "REBOTE"
    CAMBIO_SISTEMA = "CAMBIO_SISTEMA"
    INICIO_PERIODO = "INICIO_PERIODO"
    FIN_PERIODO = "FIN_PERIODO"
    INICIO_PARTIDO = "INICIO_PARTIDO"
    FIN_PARTIDO = "FIN_PARTIDO"
    OTRO = "OTRO"


class ResultadoLanzamiento(str, enum.Enum):
    GOL = "GOL"
    PARADA = "PARADA"
    PALO = "PALO"
    FUERA = "FUERA"
    BLOCADO = "BLOCADO"
    ERROR_TECNICO = "ERROR_TECNICO"


class ResultadoEvento(str, enum.Enum):
    EXITO = "EXITO"
    FALLO = "FALLO"
    NEUTRO = "NEUTRO"
