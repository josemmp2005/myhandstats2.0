import secrets
import string
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.club_access import require_gestor
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.club import Club
from app.models.club_usuario import ClubUsuario
from app.models.invitacion import InvitacionClub
from app.models.usuario import Usuario
from app.schemas.invitacion import (
    InvitacionCreate,
    InvitacionResponse,
    RedeemRequest,
    RedeemResponse,
)

# Caracteres sin los confusos (O/0, I/1) para que el código sea fácil de dictar.
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _gen_code(n: int = 8) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(n))


async def _unique_code(db: AsyncSession) -> str:
    for _ in range(10):
        code = _gen_code()
        exists = await db.execute(
            select(InvitacionClub).where(InvitacionClub.codigo == code)
        )
        if not exists.scalar_one_or_none():
            return code
    raise HTTPException(status_code=500, detail="No se pudo generar un código único")


# ==========================================================================
# Gestión de invitaciones (solo GESTOR_CLUB)
# ==========================================================================
router = APIRouter(prefix="/clubes/{club_id}/invitaciones", tags=["invitaciones"])


@router.post("", response_model=InvitacionResponse, status_code=status.HTTP_201_CREATED)
async def crear_invitacion(
    club_id: uuid.UUID,
    payload: InvitacionCreate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    invitacion = InvitacionClub(
        club_id=club_id,
        codigo=await _unique_code(db),
        rol=payload.rol,
        email=payload.email,
        max_usos=payload.max_usos,
        expira_en=payload.expira_en,
        creada_por=membership.usuario_id,
    )
    db.add(invitacion)
    await db.commit()
    await db.refresh(invitacion)
    return invitacion


@router.get("", response_model=list[InvitacionResponse])
async def listar_invitaciones(
    club_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    result = await db.execute(
        select(InvitacionClub)
        .where(InvitacionClub.club_id == club_id)
        .order_by(InvitacionClub.creado_en.desc())
    )
    return result.scalars().all()


@router.delete("/{invitacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revocar_invitacion(
    club_id: uuid.UUID,
    invitacion_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    result = await db.execute(
        select(InvitacionClub).where(
            InvitacionClub.id == invitacion_id,
            InvitacionClub.club_id == club_id,
        )
    )
    invitacion = result.scalar_one_or_none()
    if not invitacion:
        raise HTTPException(status_code=404, detail="Invitación no encontrada")
    invitacion.activa = False
    await db.commit()


# ==========================================================================
# Canje de invitación (cualquier usuario autenticado)
# ==========================================================================
redeem_router = APIRouter(prefix="/invitaciones", tags=["invitaciones"])


@redeem_router.post("/redimir", response_model=RedeemResponse)
async def redimir_invitacion(
    payload: RedeemRequest,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(InvitacionClub).where(InvitacionClub.codigo == payload.codigo.strip())
    )
    invitacion = result.scalar_one_or_none()

    if not invitacion or not invitacion.activa:
        raise HTTPException(status_code=404, detail="Código de invitación no válido")
    if invitacion.expira_en and invitacion.expira_en < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="La invitación ha caducado")
    if invitacion.usos >= invitacion.max_usos:
        raise HTTPException(status_code=409, detail="La invitación ya no tiene usos disponibles")
    if invitacion.email and invitacion.email.lower() != usuario.email.lower():
        raise HTTPException(status_code=403, detail="Esta invitación es para otro correo")

    # ¿Ya tiene membresía en ese club?
    existing = await db.execute(
        select(ClubUsuario).where(
            ClubUsuario.club_id == invitacion.club_id,
            ClubUsuario.usuario_id == usuario.id,
        )
    )
    membership = existing.scalar_one_or_none()
    if membership and membership.activo:
        raise HTTPException(status_code=409, detail="Ya eres miembro de este club")

    if membership:
        # Reactiva una membresía previa (evita violar el UNIQUE club+usuario).
        membership.activo = True
        membership.rol = invitacion.rol
    else:
        db.add(
            ClubUsuario(
                club_id=invitacion.club_id,
                usuario_id=usuario.id,
                rol=invitacion.rol,
            )
        )

    invitacion.usos += 1
    if invitacion.usos >= invitacion.max_usos:
        invitacion.activa = False

    await db.commit()

    club = (
        await db.execute(select(Club).where(Club.id == invitacion.club_id))
    ).scalar_one()
    return RedeemResponse(club_id=club.id, nombre=club.nombre, rol=invitacion.rol)
