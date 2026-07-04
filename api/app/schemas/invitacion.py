import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import RolClub


class InvitacionCreate(BaseModel):
    rol: RolClub = RolClub.ENTRENADOR
    email: Optional[EmailStr] = None
    max_usos: int = Field(1, ge=1, le=999)
    expira_en: Optional[datetime] = None


class InvitacionResponse(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    codigo: str
    rol: RolClub
    email: Optional[str]
    expira_en: Optional[datetime]
    max_usos: int
    usos: int
    activa: bool
    creado_en: datetime

    model_config = {"from_attributes": True}


class RedeemRequest(BaseModel):
    codigo: str = Field(..., min_length=1)


class RedeemResponse(BaseModel):
    club_id: uuid.UUID
    nombre: str
    rol: RolClub
