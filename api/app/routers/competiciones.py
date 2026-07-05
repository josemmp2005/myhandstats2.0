import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.club_access import require_gestor_or_entrenador, require_member
from app.core.database import get_db
from app.models.club_usuario import ClubUsuario
from app.models.competicion import Competicion
from app.models.temporada import Temporada
from app.schemas.competicion import CompeticionCreate, CompeticionResponse

router = APIRouter(prefix="/clubes/{club_id}/competiciones", tags=["competiciones"])


@router.post("", response_model=CompeticionResponse, status_code=status.HTTP_201_CREATED)
async def crear_competicion(
    club_id: uuid.UUID,
    payload: CompeticionCreate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor_or_entrenador),
):
    temporada = await db.execute(
        select(Temporada).where(
            Temporada.id == payload.temporada_id, Temporada.club_id == club_id
        )
    )
    if not temporada.scalar_one_or_none():
        raise HTTPException(
            status_code=422, detail="La temporada no existe o no pertenece a este club"
        )

    existe = await db.execute(
        select(Competicion).where(
            Competicion.club_id == club_id,
            Competicion.temporada_id == payload.temporada_id,
            Competicion.nombre == payload.nombre,
        )
    )
    if existe.scalar_one_or_none():
        raise HTTPException(
            status_code=409, detail="Ya existe una competición con ese nombre en esa temporada"
        )

    competicion = Competicion(club_id=club_id, **payload.model_dump())
    db.add(competicion)
    await db.commit()
    await db.refresh(competicion)
    return competicion


@router.get("", response_model=list[CompeticionResponse])
async def listar_competiciones(
    club_id: uuid.UUID,
    temporada_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    query = select(Competicion).where(Competicion.club_id == club_id)
    if temporada_id is not None:
        query = query.where(Competicion.temporada_id == temporada_id)
    result = await db.execute(query.order_by(Competicion.nombre))
    return result.scalars().all()
