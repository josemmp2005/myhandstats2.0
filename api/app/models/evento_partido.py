import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import (
    OrigenEvento,
    PeriodoPartido,
    ResultadoEvento,
    ResultadoLanzamiento,
    TipoEvento,
)

_values = lambda e: [m.value for m in e]  # noqa: E731


class EventoPartido(Base):
    """Evento individual de un partido (tabla principal de estadísticas).

    Solo se mapean las columnas necesarias para leer/mostrar el timeline;
    las columnas tácticas más finas (fase de juego, sistemas, zonas del
    campo...) no se usan todavía y se dejan sin mapear — Postgres las
    rellena con su valor por defecto o NULL sin problema.
    """

    __tablename__ = "eventos_partido"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    partido_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("partidos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    origen: Mapped[OrigenEvento] = mapped_column(
        PGEnum(OrigenEvento, name="origen_evento", create_type=False, values_callable=_values),
        nullable=False,
        default=OrigenEvento.EQUIPO_PROPIO,
    )
    equipo_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("equipos.id", ondelete="SET NULL"), nullable=True
    )
    jugador_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("jugadores.id", ondelete="SET NULL"), nullable=True, index=True
    )
    jugador_asistencia_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("jugadores.id", ondelete="SET NULL"), nullable=True
    )
    portero_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("jugadores.id", ondelete="SET NULL"), nullable=True
    )
    periodo: Mapped[PeriodoPartido] = mapped_column(
        PGEnum(PeriodoPartido, name="periodo_partido", create_type=False, values_callable=_values),
        nullable=False,
    )
    tiempo_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    goles_equipo: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    goles_rival: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tipo: Mapped[TipoEvento] = mapped_column(
        PGEnum(TipoEvento, name="tipo_evento", create_type=False, values_callable=_values),
        nullable=False,
    )
    resultado_lanzamiento: Mapped[ResultadoLanzamiento | None] = mapped_column(
        PGEnum(
            ResultadoLanzamiento,
            name="resultado_lanzamiento",
            create_type=False,
            values_callable=_values,
        ),
        nullable=True,
    )
    resultado: Mapped[ResultadoEvento | None] = mapped_column(
        PGEnum(ResultadoEvento, name="resultado_evento", create_type=False, values_callable=_values),
        nullable=True,
    )
    eliminado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    creado_en: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
