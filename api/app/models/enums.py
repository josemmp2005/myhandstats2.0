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
