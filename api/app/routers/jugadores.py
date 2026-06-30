import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.club_access import require_member
from app.core.database import get_db
from app.models.club_usuario import ClubUsuario
from app.models.enums import TipoJugador
from app.models.jugador import Jugador
from app.schemas.jugador import JugadorCreate, JugadorResponse, JugadorUpdate

router = APIRouter(prefix="/clubes/{club_id}/jugadores", tags=["jugadores"])


async def _get_jugador_del_club(
    db: AsyncSession, club_id: uuid.UUID, jugador_id: uuid.UUID
) -> Jugador:
    result = await db.execute(
        select(Jugador).where(Jugador.id == jugador_id, Jugador.club_id == club_id)
    )
    jugador = result.scalar_one_or_none()
    if not jugador:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return jugador


@router.post("", response_model=JugadorResponse, status_code=status.HTTP_201_CREATED)
async def crear_jugador(
    club_id: uuid.UUID,
    payload: JugadorCreate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    jugador = Jugador(club_id=club_id, **payload.model_dump())
    db.add(jugador)
    await db.commit()
    await db.refresh(jugador)
    return jugador


@router.get("", response_model=list[JugadorResponse])
async def listar_jugadores(
    club_id: uuid.UUID,
    tipo: Optional[TipoJugador] = Query(None),
    activo: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    query = select(Jugador).where(Jugador.club_id == club_id)
    if tipo is not None:
        query = query.where(Jugador.tipo == tipo)
    if activo is not None:
        query = query.where(Jugador.activo == activo)
    result = await db.execute(query.order_by(Jugador.apellidos, Jugador.nombre))
    return result.scalars().all()


@router.get("/{jugador_id}", response_model=JugadorResponse)
async def obtener_jugador(
    club_id: uuid.UUID,
    jugador_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    return await _get_jugador_del_club(db, club_id, jugador_id)


@router.patch("/{jugador_id}", response_model=JugadorResponse)
async def actualizar_jugador(
    club_id: uuid.UUID,
    jugador_id: uuid.UUID,
    payload: JugadorUpdate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    jugador = await _get_jugador_del_club(db, club_id, jugador_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(jugador, key, value)
    await db.commit()
    await db.refresh(jugador)
    return jugador


@router.delete("/{jugador_id}", status_code=status.HTTP_204_NO_CONTENT)
async def desactivar_jugador(
    club_id: uuid.UUID,
    jugador_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    jugador = await _get_jugador_del_club(db, club_id, jugador_id)
    jugador.activo = False
    await db.commit()
