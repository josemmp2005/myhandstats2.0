import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import CategoriaEquipo, GeneroEquipo, TipoEquipo

_values = lambda e: [m.value for m in e]  # noqa: E731


class Equipo(Base):
    __tablename__ = "equipos"

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
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    nombre_corto: Mapped[str | None] = mapped_column(Text, nullable=True)
    categoria: Mapped[CategoriaEquipo] = mapped_column(
        PGEnum(CategoriaEquipo, name="categoria_equipo", create_type=False, values_callable=_values),
        nullable=False,
    )
    genero: Mapped[GeneroEquipo] = mapped_column(
        PGEnum(GeneroEquipo, name="genero_equipo", create_type=False, values_callable=_values),
        nullable=False,
    )
    tipo: Mapped[TipoEquipo] = mapped_column(
        PGEnum(TipoEquipo, name="tipo_equipo", create_type=False, values_callable=_values),
        nullable=False,
        default=TipoEquipo.PROPIO,
    )
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )
