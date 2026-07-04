import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.club_access import require_gestor, require_member
from app.core.database import get_db
from app.models.club_usuario import ClubUsuario
from app.models.temporada import Temporada
from app.schemas.temporada import TemporadaCreate, TemporadaResponse, TemporadaUpdate

router = APIRouter(prefix="/clubes/{club_id}/temporadas", tags=["temporadas"])


@router.post("", response_model=TemporadaResponse, status_code=status.HTTP_201_CREATED)
async def crear_temporada(
    club_id: uuid.UUID,
    payload: TemporadaCreate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    existe = await db.execute(
        select(Temporada).where(
            Temporada.club_id == club_id, Temporada.nombre == payload.nombre
        )
    )
    if existe.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe una temporada con ese nombre en el club")

    temporada = Temporada(club_id=club_id, **payload.model_dump())
    db.add(temporada)
    await db.commit()
    await db.refresh(temporada)
    return temporada


@router.get("", response_model=list[TemporadaResponse])
async def listar_temporadas(
    club_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    result = await db.execute(
        select(Temporada)
        .where(Temporada.club_id == club_id)
        .order_by(Temporada.fecha_inicio.desc())
    )
    return result.scalars().all()


@router.get("/{temporada_id}", response_model=TemporadaResponse)
async def obtener_temporada(
    club_id: uuid.UUID,
    temporada_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    temporada = await _get_temporada_del_club(db, club_id, temporada_id)
    return temporada


@router.patch("/{temporada_id}", response_model=TemporadaResponse)
async def actualizar_temporada(
    club_id: uuid.UUID,
    temporada_id: uuid.UUID,
    payload: TemporadaUpdate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    temporada = await _get_temporada_del_club(db, club_id, temporada_id)

    data = payload.model_dump(exclude_unset=True)
    if "nombre" in data and data["nombre"] != temporada.nombre:
        existe = await db.execute(
            select(Temporada).where(
                Temporada.club_id == club_id, Temporada.nombre == data["nombre"]
            )
        )
        if existe.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Ya existe una temporada con ese nombre en el club")

    for key, value in data.items():
        setattr(temporada, key, value)

    nueva_inicio = data.get("fecha_inicio", temporada.fecha_inicio)
    nueva_fin = data.get("fecha_fin", temporada.fecha_fin)
    if nueva_inicio > nueva_fin:
        raise HTTPException(status_code=422, detail="fecha_inicio no puede ser posterior a fecha_fin")

    await db.commit()
    await db.refresh(temporada)
    return temporada


async def _get_temporada_del_club(
    db: AsyncSession, club_id: uuid.UUID, temporada_id: uuid.UUID
) -> Temporada:
    result = await db.execute(
        select(Temporada).where(
            Temporada.id == temporada_id, Temporada.club_id == club_id
        )
    )
    temporada = result.scalar_one_or_none()
    if not temporada:
        raise HTTPException(status_code=404, detail="Temporada no encontrada")
    return temporada
