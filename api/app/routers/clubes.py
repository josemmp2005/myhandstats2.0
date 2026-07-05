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
    ClubMemberResponse,
    ClubMemberRoleUpdate,
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


@router.get("/{club_id}/usuarios", response_model=list[ClubMemberResponse])
async def listar_miembros(
    club_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    # Cualquier miembro activo puede ver el listado de miembros del club.
    if not await _get_membership(db, club_id, usuario.id):
        raise HTTPException(status_code=404, detail="Club no encontrado")

    result = await db.execute(
        select(Usuario, ClubUsuario.rol, ClubUsuario.activo)
        .join(ClubUsuario, ClubUsuario.usuario_id == Usuario.id)
        .where(ClubUsuario.club_id == club_id)
        .order_by(Usuario.apellidos, Usuario.nombre)
    )
    return [
        ClubMemberResponse(
            usuario_id=u.id,
            email=u.email,
            nombre=u.nombre,
            apellidos=u.apellidos,
            rol=rol,
            activo=activo,
        )
        for u, rol, activo in result.all()
    ]


async def _ensure_not_last_gestor(
    db: AsyncSession, club_id: uuid.UUID, usuario_id: uuid.UUID
) -> None:
    """Impide dejar al club sin ningún GESTOR_CLUB activo."""
    result = await db.execute(
        select(ClubUsuario.usuario_id).where(
            ClubUsuario.club_id == club_id,
            ClubUsuario.rol == RolClub.GESTOR_CLUB,
            ClubUsuario.activo.is_(True),
        )
    )
    otros_gestores = [uid for uid in result.scalars().all() if uid != usuario_id]
    if not otros_gestores:
        raise HTTPException(
            status_code=409,
            detail="El club debe tener al menos un gestor activo",
        )


@router.patch("/{club_id}/usuarios/{usuario_id}", response_model=ClubMemberResponse)
async def actualizar_rol_miembro(
    club_id: uuid.UUID,
    usuario_id: uuid.UUID,
    payload: ClubMemberRoleUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    await _require_gestor(db, club_id, usuario.id)

    membership = await _get_membership(db, club_id, usuario_id)
    if not membership:
        raise HTTPException(status_code=404, detail="El usuario no es miembro de este club")

    if membership.rol == RolClub.GESTOR_CLUB and payload.rol != RolClub.GESTOR_CLUB:
        await _ensure_not_last_gestor(db, club_id, usuario_id)

    membership.rol = payload.rol
    await db.commit()

    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    miembro = result.scalar_one()
    return ClubMemberResponse(
        usuario_id=miembro.id,
        email=miembro.email,
        nombre=miembro.nombre,
        apellidos=miembro.apellidos,
        rol=membership.rol,
        activo=membership.activo,
    )


@router.delete("/{club_id}/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_miembro(
    club_id: uuid.UUID,
    usuario_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    await _require_gestor(db, club_id, usuario.id)

    membership = await _get_membership(db, club_id, usuario_id)
    if not membership:
        raise HTTPException(status_code=404, detail="El usuario no es miembro de este club")

    if membership.rol == RolClub.GESTOR_CLUB:
        await _ensure_not_last_gestor(db, club_id, usuario_id)

    membership.activo = False
    await db.commit()


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
