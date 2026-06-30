import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UsuarioCreate(BaseModel):
    email: EmailStr
    nombre: str = Field(..., min_length=1)
    apellidos: Optional[str] = None
    password: str = Field(..., min_length=8)
    avatar_url: Optional[str] = None


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1)
    apellidos: Optional[str] = None
    avatar_url: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8)


class UsuarioSelfUpdate(BaseModel):
    """Edición del propio perfil (no permite tocar `activo`)."""

    nombre: Optional[str] = Field(None, min_length=1)
    apellidos: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)


class UsuarioResponse(BaseModel):
    id: uuid.UUID
    email: str
    nombre: str
    apellidos: Optional[str]
    avatar_url: Optional[str]
    activo: bool
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}
