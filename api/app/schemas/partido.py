import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.models.enums import EstadoPartido, ModoTomaDatos, TipoLocalizacionPartido


class PartidoCreate(BaseModel):
    """La temporada se toma automáticamente de la del equipo (nuestro equipo)."""

    competicion_id: Optional[uuid.UUID] = None
    equipo_id: uuid.UUID
    rival_equipo_id: Optional[uuid.UUID] = None
    rival_nombre: str = Field(..., min_length=1)
    modo_toma_datos: ModoTomaDatos = ModoTomaDatos.EQUIPO_PROPIO
    tipo_localizacion: TipoLocalizacionPartido
    pabellon: Optional[str] = None
    fecha_partido: datetime
    notas: Optional[str] = None

    @model_validator(mode="after")
    def _check_rival(self):
        if self.rival_equipo_id is not None and self.rival_equipo_id == self.equipo_id:
            raise ValueError("El equipo rival no puede ser el mismo que el propio")
        if self.modo_toma_datos == ModoTomaDatos.SCOUTING_COMPLETO and not self.rival_equipo_id:
            raise ValueError(
                "El modo SCOUTING_COMPLETO requiere seleccionar un equipo rival"
            )
        return self


class PartidoUpdate(BaseModel):
    competicion_id: Optional[uuid.UUID] = None
    rival_equipo_id: Optional[uuid.UUID] = None
    rival_nombre: Optional[str] = Field(None, min_length=1)
    modo_toma_datos: Optional[ModoTomaDatos] = None
    tipo_localizacion: Optional[TipoLocalizacionPartido] = None
    pabellon: Optional[str] = None
    fecha_partido: Optional[datetime] = None
    estado: Optional[EstadoPartido] = None
    goles_equipo: Optional[int] = Field(None, ge=0)
    goles_rival: Optional[int] = Field(None, ge=0)
    notas: Optional[str] = None


class PartidoResponse(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    temporada_id: uuid.UUID
    competicion_id: Optional[uuid.UUID]
    equipo_id: uuid.UUID
    rival_equipo_id: Optional[uuid.UUID]
    rival_nombre: str
    modo_toma_datos: ModoTomaDatos
    tipo_localizacion: TipoLocalizacionPartido
    pabellon: Optional[str]
    fecha_partido: datetime
    estado: EstadoPartido
    goles_equipo: int
    goles_rival: int
    notas: Optional[str]
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}
