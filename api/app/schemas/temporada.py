import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class TemporadaCreate(BaseModel):
    nombre: str = Field(..., min_length=1)
    fecha_inicio: date
    fecha_fin: date
    activa: bool = False

    @model_validator(mode="after")
    def _check_fechas(self):
        if self.fecha_inicio > self.fecha_fin:
            raise ValueError("fecha_inicio no puede ser posterior a fecha_fin")
        return self


class TemporadaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1)
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    activa: Optional[bool] = None


class TemporadaResponse(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    nombre: str
    fecha_inicio: date
    fecha_fin: date
    activa: bool
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}
