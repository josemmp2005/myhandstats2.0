import uuid
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import PosicionJugador


class ConvocatoriaJugadorInput(BaseModel):
    """Una fila de la convocatoria enviada desde el guardado masivo."""

    jugador_id: uuid.UUID
    disponible: bool = True
    es_portero: bool = False
    titular: bool = False
    dorsal: Optional[int] = Field(None, ge=0, le=99)


class ConvocatoriaItem(BaseModel):
    jugador_id: uuid.UUID
    nombre: str
    apellidos: str
    foto_url: Optional[str] = None
    dorsal: Optional[int]
    posicion_principal: Optional[PosicionJugador]
    disponible: bool
    es_portero: bool
    titular: bool
    disponible_para_jugar: bool = True
