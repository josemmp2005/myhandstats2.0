import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import ManoDominante, PosicionJugador, TipoJugador

_values = lambda e: [m.value for m in e]  # noqa: E731


class Jugador(Base):
    __tablename__ = "jugadores"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    club_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("clubes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    apellidos: Mapped[str] = mapped_column(Text, nullable=False)
    fecha_nacimiento: Mapped[date | None] = mapped_column(Date, nullable=True)
    tipo: Mapped[TipoJugador] = mapped_column(
        PGEnum(TipoJugador, name="tipo_jugador", create_type=False, values_callable=_values),
        nullable=False,
        default=TipoJugador.PROPIO,
    )
    mano_dominante: Mapped[ManoDominante] = mapped_column(
        PGEnum(ManoDominante, name="mano_dominante", create_type=False, values_callable=_values),
        nullable=False,
        default=ManoDominante.DESCONOCIDA,
    )
    posicion_principal: Mapped[PosicionJugador | None] = mapped_column(
        PGEnum(PosicionJugador, name="posicion_jugador", create_type=False, values_callable=_values),
        nullable=True,
    )
    posicion_secundaria: Mapped[PosicionJugador | None] = mapped_column(
        PGEnum(PosicionJugador, name="posicion_jugador", create_type=False, values_callable=_values),
        nullable=True,
    )
    altura_cm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    peso_kg: Mapped[int | None] = mapped_column(Integer, nullable=True)
    foto_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )
