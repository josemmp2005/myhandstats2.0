import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.club import Club
from app.models.club_usuario import ClubUsuario
from app.models.enums import RolClub
from app.models.usuario import Usuario
from app.schemas.club import (
    ClubCreate,
    ClubMembershipResponse,
    ClubResponse,
    ClubUpdate,
)

router = APIRouter(prefix="/clubes", tags=["clubes"])


async def _get_membership(
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


async def _require_gestor(
    db: AsyncSession, club_id: uuid.UUID, usuario_id: uuid.UUID
) -> ClubUsuario:
    """Exige que el usuario sea miembro y GESTOR_CLUB del club."""
    membership = await _get_membership(db, club_id, usuario_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Club no encontrado")
    if membership.rol != RolClub.GESTOR_CLUB:
        raise HTTPException(status_code=403, detail="Solo el gestor del club puede realizar esta acción")
    return membership


@router.post("", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
async def crear_club(
    payload: ClubCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    existe = await db.execute(select(Club).where(Club.slug == payload.slug))
    if existe.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="El slug ya está en uso")

    club = Club(**payload.model_dump())
    db.add(club)
    await db.flush()  # asigna club.id sin cerrar la transacción

    # El creador entra en la tabla intermedia como gestor del club.
    db.add(ClubUsuario(club_id=club.id, usuario_id=usuario.id, rol=RolClub.GESTOR_CLUB))

    await db.commit()  # club + membresía se confirman atómicamente
    await db.refresh(club)
    return club


@router.get("", response_model=list[ClubMembershipResponse])
async def listar_mis_clubes(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(Club, ClubUsuario.rol)
        .join(ClubUsuario, ClubUsuario.club_id == Club.id)
        .where(
            ClubUsuario.usuario_id == usuario.id,
            ClubUsuario.activo.is_(True),
        )
        .order_by(Club.nombre)
    )
    return [
        ClubMembershipResponse(**ClubResponse.model_validate(club).model_dump(), rol=rol)
        for club, rol in result.all()
    ]


@router.get("/{club_id}", response_model=ClubResponse)
async def obtener_club(
    club_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    # Solo los miembros del club pueden verlo.
    if not await _get_membership(db, club_id, usuario.id):
        raise HTTPException(status_code=404, detail="Club no encontrado")
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club no encontrado")
    return club


@router.patch("/{club_id}", response_model=ClubResponse)
async def actualizar_club(
    club_id: uuid.UUID,
    payload: ClubUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    await _require_gestor(db, club_id, usuario.id)

    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club no encontrado")

    data = payload.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"] != club.slug:
        existe = await db.execute(select(Club).where(Club.slug == data["slug"]))
        if existe.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="El slug ya está en uso")

    for key, value in data.items():
        setattr(club, key, value)

    await db.commit()
    await db.refresh(club)
    return club


@router.delete("/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
async def desactivar_club(
    club_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    await _require_gestor(db, club_id, usuario.id)

    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club no encontrado")

    club.activo = False
    await db.commit()
