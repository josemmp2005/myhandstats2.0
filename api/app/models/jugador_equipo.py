import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class JugadorEquipo(Base):
    """Tabla intermedia jugadores <-> equipos (con su temporada y dorsal)."""

    __tablename__ = "jugadores_equipos"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    jugador_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("jugadores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    equipo_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("equipos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    temporada_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("temporadas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dorsal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    equipo_principal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    disponible_para_jugar: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Columna TEXT con CHECK (PRINCIPAL/REFUERZO/DISPONIBLE), no es ENUM nativo.
    tipo_asignacion: Mapped[str] = mapped_column(Text, nullable=False, default="PRINCIPAL")
    fecha_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_fin: Mapped[date | None] = mapped_column(Date, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )
