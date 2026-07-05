"""Helpers de autorización por club, reutilizables como dependencias FastAPI."""

import uuid

from fastapi import Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.club_usuario import ClubUsuario
from app.models.enums import RolClub
from app.models.usuario import Usuario


async def get_membership(
    db: AsyncSession, club_id: uuid.UUID, usuario_id: uuid.UUID
) -> ClubUsuario | None:
    """Devuelve la membresía activa del usuario en el club, o None."""
    result = await db.execute(
        select(ClubUsuario).where(
            ClubUsuario.club_id == club_id,
            ClubUsuario.usuario_id == usuario_id,
            ClubUsuario.activo.is_(True),
        )
    )
    return result.scalar_one_or_none()


async def require_member(
    club_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> ClubUsuario:
    """Dependencia: exige que el usuario autenticado sea miembro activo del club.

    Devuelve 404 (no 403) si no es miembro, para no revelar clubes ajenos.
    """
    membership = await get_membership(db, club_id, usuario.id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club no encontrado")
    return membership


async def require_gestor(
    club_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> ClubUsuario:
    """Dependencia: exige ser miembro y GESTOR_CLUB del club."""
    membership = await get_membership(db, club_id, usuario.id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club no encontrado")
    if membership.rol != RolClub.GESTOR_CLUB:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el gestor del club puede realizar esta acción",
        )
    return membership


async def require_gestor_or_entrenador(
    club_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> ClubUsuario:
    """Dependencia: exige ser miembro y GESTOR_CLUB o ENTRENADOR del club."""
    membership = await get_membership(db, club_id, usuario.id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club no encontrado")
    if membership.rol not in (RolClub.GESTOR_CLUB, RolClub.ENTRENADOR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el gestor o un entrenador puede realizar esta acción",
        )
    return membership
