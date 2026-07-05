import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import RolClub

_SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class ClubCreate(BaseModel):
    nombre: str = Field(..., min_length=1)
    slug: str = Field(..., min_length=1, pattern=_SLUG_PATTERN)
    ciudad: Optional[str] = None
    pais: Optional[str] = None
    logo_url: Optional[str] = None
    color_primario: Optional[str] = None
    color_secundario: Optional[str] = None


class ClubUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1)
    slug: Optional[str] = Field(None, min_length=1, pattern=_SLUG_PATTERN)
    ciudad: Optional[str] = None
    pais: Optional[str] = None
    logo_url: Optional[str] = None
    color_primario: Optional[str] = None
    color_secundario: Optional[str] = None
    activo: Optional[bool] = None


class ClubResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    slug: str
    ciudad: Optional[str]
    pais: Optional[str]
    logo_url: Optional[str]
    color_primario: Optional[str]
    color_secundario: Optional[str]
    activo: bool
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class ClubMembershipResponse(ClubResponse):
    """Club junto con el rol del usuario autenticado en él."""

    rol: RolClub


class ClubMemberRoleUpdate(BaseModel):
    rol: RolClub


class ClubMemberResponse(BaseModel):
    """Un miembro del club: datos del usuario + su rol global en el club."""

    usuario_id: uuid.UUID
    email: str
    nombre: str
    apellidos: Optional[str]
    rol: RolClub
    activo: bool

    model_config = {"from_attributes": True}
