import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import CategoriaEquipo, GeneroEquipo, TipoEquipo


class EquipoCreate(BaseModel):
    temporada_id: uuid.UUID
    nombre: str = Field(..., min_length=1)
    nombre_corto: Optional[str] = None
    categoria: CategoriaEquipo
    genero: GeneroEquipo
    tipo: TipoEquipo = TipoEquipo.PROPIO
    logo_url: Optional[str] = None


class EquipoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1)
    nombre_corto: Optional[str] = None
    categoria: Optional[CategoriaEquipo] = None
    genero: Optional[GeneroEquipo] = None
    tipo: Optional[TipoEquipo] = None
    logo_url: Optional[str] = None
    activo: Optional[bool] = None


class EquipoResponse(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    temporada_id: uuid.UUID
    nombre: str
    nombre_corto: Optional[str]
    categoria: CategoriaEquipo
    genero: GeneroEquipo
    tipo: TipoEquipo
    logo_url: Optional[str]
    activo: bool
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}
