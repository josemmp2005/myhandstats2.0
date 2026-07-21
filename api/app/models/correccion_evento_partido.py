import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CorreccionEventoPartido(Base):
    """Auditoría de correcciones/eliminaciones de eventos_partido.

    Tabla de solo inserción (no tiene actualizado_en): cada corrección deja
    una fila nueva con el estado anterior y el nuevo del evento afectado.
    """

    __tablename__ = "correcciones_evento_partido"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    partido_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("partidos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evento_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("eventos_partido.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    corregido_por_usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    motivo: Mapped[str | None] = mapped_column(Text, nullable=True)
    datos_anteriores: Mapped[dict] = mapped_column(JSONB, nullable=False)
    datos_nuevos: Mapped[dict] = mapped_column(JSONB, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
