import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class EstadisticaJugadorPartido(Base):
    """Agregado por jugador y partido, calculado a partir de eventos_partido.

    Tabla de solo lectura desde la API por ahora: todavía no existe la captura
    de eventos (Live Stats) que la rellena, así que normalmente estará vacía.
    """

    __tablename__ = "estadisticas_jugador_partido"

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
    goles: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lanzamientos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    asistencias: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    paradas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    goles_recibidos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    perdidas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    robos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    blocajes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    exclusiones: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    eficacia_lanzamiento: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    porcentaje_paradas: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    desglose: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    creado_en: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )
