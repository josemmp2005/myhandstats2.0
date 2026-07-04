import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel

from app.models.enums import RolClub
from app.schemas.usuario import UsuarioResponse


class StaffCreate(BaseModel):
    """Asigna un miembro del club (ya existente) a un equipo con un rol."""

    usuario_id: uuid.UUID
    rol: RolClub = RolClub.ENTRENADOR
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None


class StaffResponse(BaseModel):
    id: uuid.UUID
    equipo_id: uuid.UUID
    usuario_id: uuid.UUID
    temporada_id: uuid.UUID
    rol: RolClub
    fecha_inicio: Optional[date]
    fecha_fin: Optional[date]
    activo: bool
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class StaffItem(BaseModel):
    """Cuerpo técnico de un equipo: asignación + datos del usuario."""

    asignacion: StaffResponse
    usuario: UsuarioResponse
