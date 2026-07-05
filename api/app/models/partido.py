import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import EstadoPartido, ModoTomaDatos, TipoLocalizacionPartido

_values = lambda e: [m.value for m in e]  # noqa: E731


class Partido(Base):
    __tablename__ = "partidos"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    club_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("clubes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    temporada_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("temporadas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    competicion_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("competiciones.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    equipo_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("equipos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rival_equipo_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("equipos.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    rival_nombre: Mapped[str] = mapped_column(Text, nullable=False)
    modo_toma_datos: Mapped[ModoTomaDatos] = mapped_column(
        PGEnum(ModoTomaDatos, name="modo_toma_datos", create_type=False, values_callable=_values),
        nullable=False,
        default=ModoTomaDatos.EQUIPO_PROPIO,
    )
    tipo_localizacion: Mapped[TipoLocalizacionPartido] = mapped_column(
        PGEnum(
            TipoLocalizacionPartido,
            name="tipo_localizacion_partido",
            create_type=False,
            values_callable=_values,
        ),
        nullable=False,
    )
    pabellon: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha_partido: Mapped[datetime] = mapped_column(nullable=False)
    estado: Mapped[EstadoPartido] = mapped_column(
        PGEnum(EstadoPartido, name="estado_partido", create_type=False, values_callable=_values),
        nullable=False,
        default=EstadoPartido.PROGRAMADO,
    )
    goles_equipo: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    goles_rival: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )
