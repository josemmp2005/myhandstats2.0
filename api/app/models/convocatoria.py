import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import PosicionJugador

_values = lambda e: [m.value for m in e]  # noqa: E731


class Convocatoria(Base):
    """Jugador convocado para un partido concreto (convocatorias_partido)."""

    __tablename__ = "convocatorias_partido"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    partido_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("partidos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    equipo_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("equipos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    jugador_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("jugadores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dorsal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    posicion: Mapped[PosicionJugador | None] = mapped_column(
        PGEnum(PosicionJugador, name="posicion_jugador", create_type=False, values_callable=_values),
        nullable=True,
    )
    titular: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    es_portero: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    capitan: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    disponible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )
