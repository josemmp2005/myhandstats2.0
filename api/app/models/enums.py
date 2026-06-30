import enum


class RolClub(str, enum.Enum):
    """Coincide con el tipo ENUM `rol_club` definido en db/schema.sql."""

    GESTOR_CLUB = "GESTOR_CLUB"
    ENTRENADOR = "ENTRENADOR"
    AYUDANTE = "AYUDANTE"
    ANALISTA = "ANALISTA"
