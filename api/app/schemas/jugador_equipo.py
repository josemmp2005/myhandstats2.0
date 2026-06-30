import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import TipoAsignacion
from app.schemas.jugador import JugadorResponse


class AsignacionCreate(BaseModel):
    """Asigna un jugador (ya existente en el club) a un equipo.

    La temporada se toma automáticamente de la del equipo.
    """

    jugador_id: uuid.UUID
    dorsal: Optional[int] = Field(None, ge=0, le=99)
    equipo_principal: bool = True
    disponible_para_jugar: bool = True
    tipo_asignacion: TipoAsignacion = TipoAsignacion.PRINCIPAL
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None


class AsignacionUpdate(BaseModel):
    dorsal: Optional[int] = Field(None, ge=0, le=99)
    equipo_principal: Optional[bool] = None
    disponible_para_jugar: Optional[bool] = None
    tipo_asignacion: Optional[TipoAsignacion] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    activo: Optional[bool] = None


class AsignacionResponse(BaseModel):
    id: uuid.UUID
    jugador_id: uuid.UUID
    equipo_id: uuid.UUID
    temporada_id: uuid.UUID
    dorsal: Optional[int]
    equipo_principal: bool
    disponible_para_jugar: bool
    tipo_asignacion: str
    fecha_inicio: Optional[date]
    fecha_fin: Optional[date]
    activo: bool
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class PlantillaItem(BaseModel):
    """Item de la plantilla de un equipo: datos de la asignación + del jugador."""

    asignacion: AsignacionResponse
    jugador: JugadorResponse
