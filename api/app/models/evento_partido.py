import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import (
    FaseJuego,
    OrigenEvento,
    PeriodoPartido,
    ResultadoEvento,
    ResultadoLanzamiento,
    SistemaAtaque,
    SistemaDefensa,
    SituacionNumerica,
    TipoEvento,
    TipoLanzamiento,
    ZonaCampo,
    ZonaPorteria,
)

_values = lambda e: [m.value for m in e]  # noqa: E731


class EventoPartido(Base):
    """Evento individual de un partido (tabla principal de estadísticas).

    No se mapean las columnas de sincronización offline (`id_local`,
    `dispositivo_id`, `sincronizado_en`) — fuera de alcance de MVP1 (ver
    memoria del proyecto).
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
    jugador_texto: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado_por_usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
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
    subtipo: Mapped[str | None] = mapped_column(Text, nullable=True)
    fase: Mapped[FaseJuego | None] = mapped_column(
        PGEnum(FaseJuego, name="fase_juego", create_type=False, values_callable=_values),
        nullable=True,
    )
    situacion_numerica: Mapped[SituacionNumerica | None] = mapped_column(
        PGEnum(SituacionNumerica, name="situacion_numerica", create_type=False, values_callable=_values),
        nullable=True,
    )
    sistema_ataque: Mapped[SistemaAtaque | None] = mapped_column(
        PGEnum(SistemaAtaque, name="sistema_ataque", create_type=False, values_callable=_values),
        nullable=True,
    )
    sistema_defensa: Mapped[SistemaDefensa | None] = mapped_column(
        PGEnum(SistemaDefensa, name="sistema_defensa", create_type=False, values_callable=_values),
        nullable=True,
    )
    tipo_lanzamiento: Mapped[TipoLanzamiento | None] = mapped_column(
        PGEnum(TipoLanzamiento, name="tipo_lanzamiento", create_type=False, values_callable=_values),
        nullable=True,
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
    campo_x: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    campo_y: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    zona_campo: Mapped[ZonaCampo | None] = mapped_column(
        PGEnum(ZonaCampo, name="zona_campo", create_type=False, values_callable=_values),
        nullable=True,
    )
    zona_porteria: Mapped[ZonaPorteria | None] = mapped_column(
        PGEnum(ZonaPorteria, name="zona_porteria", create_type=False, values_callable=_values),
        nullable=True,
    )
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    eliminado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    corregido: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    creado_en: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )
