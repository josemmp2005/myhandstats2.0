import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CompeticionCreate(BaseModel):
    temporada_id: uuid.UUID
    nombre: str = Field(..., min_length=1)
    categoria: Optional[str] = None
    nivel: Optional[str] = None


class CompeticionResponse(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    temporada_id: uuid.UUID
    nombre: str
    categoria: Optional[str]
    nivel: Optional[str]
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}
