import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import ManoDominante, PosicionJugador, TipoJugador


class JugadorCreate(BaseModel):
    nombre: str = Field(..., min_length=1)
    apellidos: str = Field(..., min_length=1)
    fecha_nacimiento: Optional[date] = None
    tipo: TipoJugador = TipoJugador.PROPIO
    mano_dominante: ManoDominante = ManoDominante.DESCONOCIDA
    posicion_principal: Optional[PosicionJugador] = None
    posicion_secundaria: Optional[PosicionJugador] = None
    altura_cm: Optional[int] = Field(None, gt=0)
    peso_kg: Optional[int] = Field(None, gt=0)
    foto_url: Optional[str] = None


class JugadorUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1)
    apellidos: Optional[str] = Field(None, min_length=1)
    fecha_nacimiento: Optional[date] = None
    tipo: Optional[TipoJugador] = None
    mano_dominante: Optional[ManoDominante] = None
    posicion_principal: Optional[PosicionJugador] = None
    posicion_secundaria: Optional[PosicionJugador] = None
    altura_cm: Optional[int] = Field(None, gt=0)
    peso_kg: Optional[int] = Field(None, gt=0)
    foto_url: Optional[str] = None
    activo: Optional[bool] = None


class JugadorResponse(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    nombre: str
    apellidos: str
    fecha_nacimiento: Optional[date]
    tipo: TipoJugador
    mano_dominante: ManoDominante
    posicion_principal: Optional[PosicionJugador]
    posicion_secundaria: Optional[PosicionJugador]
    altura_cm: Optional[int]
    peso_kg: Optional[int]
    foto_url: Optional[str]
    activo: bool
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}
