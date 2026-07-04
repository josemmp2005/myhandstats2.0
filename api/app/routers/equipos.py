import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.club_access import require_gestor, require_member
from app.core.database import get_db
from app.models.club_usuario import ClubUsuario
from app.models.enums import TipoEquipo
from app.models.equipo import Equipo
from app.models.equipo_usuario import EquipoUsuario
from app.models.jugador import Jugador
from app.models.jugador_equipo import JugadorEquipo
from app.models.temporada import Temporada
from app.models.usuario import Usuario
from app.schemas.equipo import EquipoCreate, EquipoResponse, EquipoUpdate
from app.schemas.equipo_usuario import StaffCreate, StaffItem, StaffResponse
from app.schemas.jugador_equipo import (
    AsignacionCreate,
    AsignacionResponse,
    AsignacionUpdate,
    PlantillaItem,
)

router = APIRouter(prefix="/clubes/{club_id}/equipos", tags=["equipos"])


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
async def _get_equipo_del_club(
    db: AsyncSession, club_id: uuid.UUID, equipo_id: uuid.UUID
) -> Equipo:
    result = await db.execute(
        select(Equipo).where(Equipo.id == equipo_id, Equipo.club_id == club_id)
    )
    equipo = result.scalar_one_or_none()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return equipo


async def _temporada_del_club(
    db: AsyncSession, club_id: uuid.UUID, temporada_id: uuid.UUID
) -> Temporada:
    result = await db.execute(
        select(Temporada).where(
            Temporada.id == temporada_id, Temporada.club_id == club_id
        )
    )
    temporada = result.scalar_one_or_none()
    if not temporada:
        raise HTTPException(
            status_code=422, detail="La temporada no existe o no pertenece a este club"
        )
    return temporada


# --------------------------------------------------------------------------
# Equipos
# --------------------------------------------------------------------------
@router.post("", response_model=EquipoResponse, status_code=status.HTTP_201_CREATED)
async def crear_equipo(
    club_id: uuid.UUID,
    payload: EquipoCreate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    # La temporada debe existir y ser del mismo club.
    await _temporada_del_club(db, club_id, payload.temporada_id)

    existe = await db.execute(
        select(Equipo).where(
            Equipo.club_id == club_id,
            Equipo.temporada_id == payload.temporada_id,
            Equipo.nombre == payload.nombre,
        )
    )
    if existe.scalar_one_or_none():
        raise HTTPException(
            status_code=409, detail="Ya existe un equipo con ese nombre en esa temporada"
        )

    equipo = Equipo(club_id=club_id, **payload.model_dump())
    db.add(equipo)
    await db.commit()
    await db.refresh(equipo)
    return equipo


@router.get("", response_model=list[EquipoResponse])
async def listar_equipos(
    club_id: uuid.UUID,
    temporada_id: Optional[uuid.UUID] = Query(None),
    tipo: Optional[TipoEquipo] = Query(None),
    solo_mios: bool = Query(False, description="Solo equipos asignados al usuario actual"),
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    query = select(Equipo).where(Equipo.club_id == club_id)
    if temporada_id is not None:
        query = query.where(Equipo.temporada_id == temporada_id)
    if tipo is not None:
        query = query.where(Equipo.tipo == tipo)
    if solo_mios:
        # Filtra a los equipos donde el usuario tiene una asignación activa.
        query = query.join(
            EquipoUsuario, EquipoUsuario.equipo_id == Equipo.id
        ).where(
            EquipoUsuario.usuario_id == membership.usuario_id,
            EquipoUsuario.activo.is_(True),
        )
    result = await db.execute(query.order_by(Equipo.nombre))
    return result.scalars().all()


@router.get("/{equipo_id}", response_model=EquipoResponse)
async def obtener_equipo(
    club_id: uuid.UUID,
    equipo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    return await _get_equipo_del_club(db, club_id, equipo_id)


@router.patch("/{equipo_id}", response_model=EquipoResponse)
async def actualizar_equipo(
    club_id: uuid.UUID,
    equipo_id: uuid.UUID,
    payload: EquipoUpdate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    equipo = await _get_equipo_del_club(db, club_id, equipo_id)
    data = payload.model_dump(exclude_unset=True)

    if "nombre" in data and data["nombre"] != equipo.nombre:
        existe = await db.execute(
            select(Equipo).where(
                Equipo.club_id == club_id,
                Equipo.temporada_id == equipo.temporada_id,
                Equipo.nombre == data["nombre"],
            )
        )
        if existe.scalar_one_or_none():
            raise HTTPException(
                status_code=409, detail="Ya existe un equipo con ese nombre en esa temporada"
            )

    for key, value in data.items():
        setattr(equipo, key, value)

    await db.commit()
    await db.refresh(equipo)
    return equipo


@router.delete("/{equipo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def desactivar_equipo(
    club_id: uuid.UUID,
    equipo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    equipo = await _get_equipo_del_club(db, club_id, equipo_id)
    equipo.activo = False
    await db.commit()


# --------------------------------------------------------------------------
# Plantilla del equipo (jugadores_equipos)
# --------------------------------------------------------------------------
@router.post(
    "/{equipo_id}/jugadores",
    response_model=AsignacionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def asignar_jugador(
    club_id: uuid.UUID,
    equipo_id: uuid.UUID,
    payload: AsignacionCreate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    equipo = await _get_equipo_del_club(db, club_id, equipo_id)

    # El jugador debe existir y pertenecer al mismo club.
    result = await db.execute(
        select(Jugador).where(
            Jugador.id == payload.jugador_id, Jugador.club_id == club_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=422, detail="El jugador no existe o no pertenece a este club"
        )

    # Evitamos duplicar (jugador, equipo, temporada) — coincide con la constraint UNIQUE.
    existe = await db.execute(
        select(JugadorEquipo).where(
            JugadorEquipo.jugador_id == payload.jugador_id,
            JugadorEquipo.equipo_id == equipo_id,
            JugadorEquipo.temporada_id == equipo.temporada_id,
        )
    )
    if existe.scalar_one_or_none():
        raise HTTPException(
            status_code=409, detail="El jugador ya está asignado a este equipo en esta temporada"
        )

    data = payload.model_dump()
    data["tipo_asignacion"] = data["tipo_asignacion"].value
    asignacion = JugadorEquipo(
        equipo_id=equipo_id,
        temporada_id=equipo.temporada_id,  # la temporada la hereda del equipo
        **data,
    )
    db.add(asignacion)
    await db.commit()
    await db.refresh(asignacion)
    return asignacion


@router.get("/{equipo_id}/jugadores", response_model=list[PlantillaItem])
async def listar_plantilla(
    club_id: uuid.UUID,
    equipo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    await _get_equipo_del_club(db, club_id, equipo_id)
    result = await db.execute(
        select(JugadorEquipo, Jugador)
        .join(Jugador, Jugador.id == JugadorEquipo.jugador_id)
        .where(
            JugadorEquipo.equipo_id == equipo_id,
            JugadorEquipo.activo.is_(True),
        )
        .order_by(JugadorEquipo.dorsal)
    )
    return [
        PlantillaItem(asignacion=asignacion, jugador=jugador)
        for asignacion, jugador in result.all()
    ]


@router.patch(
    "/{equipo_id}/jugadores/{jugador_id}", response_model=AsignacionResponse
)
async def actualizar_asignacion(
    club_id: uuid.UUID,
    equipo_id: uuid.UUID,
    jugador_id: uuid.UUID,
    payload: AsignacionUpdate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    equipo = await _get_equipo_del_club(db, club_id, equipo_id)
    asignacion = await _get_asignacion(db, equipo, jugador_id)

    data = payload.model_dump(exclude_unset=True)
    if "tipo_asignacion" in data and data["tipo_asignacion"] is not None:
        data["tipo_asignacion"] = data["tipo_asignacion"].value
    for key, value in data.items():
        setattr(asignacion, key, value)

    await db.commit()
    await db.refresh(asignacion)
    return asignacion


@router.delete(
    "/{equipo_id}/jugadores/{jugador_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def quitar_jugador(
    club_id: uuid.UUID,
    equipo_id: uuid.UUID,
    jugador_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    equipo = await _get_equipo_del_club(db, club_id, equipo_id)
    asignacion = await _get_asignacion(db, equipo, jugador_id)
    asignacion.activo = False
    await db.commit()


async def _get_asignacion(
    db: AsyncSession, equipo: Equipo, jugador_id: uuid.UUID
) -> JugadorEquipo:
    result = await db.execute(
        select(JugadorEquipo).where(
            JugadorEquipo.equipo_id == equipo.id,
            JugadorEquipo.jugador_id == jugador_id,
            JugadorEquipo.temporada_id == equipo.temporada_id,
        )
    )
    asignacion = result.scalar_one_or_none()
    if not asignacion:
        raise HTTPException(status_code=404, detail="El jugador no está asignado a este equipo")
    return asignacion


# --------------------------------------------------------------------------
# Cuerpo técnico del equipo (equipo_usuarios)
# --------------------------------------------------------------------------
@router.post(
    "/{equipo_id}/usuarios",
    response_model=StaffResponse,
    status_code=status.HTTP_201_CREATED,
)
async def asignar_staff(
    club_id: uuid.UUID,
    equipo_id: uuid.UUID,
    payload: StaffCreate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    equipo = await _get_equipo_del_club(db, club_id, equipo_id)

    # El usuario debe ser miembro activo del club.
    miembro = await db.execute(
        select(ClubUsuario).where(
            ClubUsuario.club_id == club_id,
            ClubUsuario.usuario_id == payload.usuario_id,
            ClubUsuario.activo.is_(True),
        )
    )
    if not miembro.scalar_one_or_none():
        raise HTTPException(
            status_code=422, detail="El usuario no es miembro activo de este club"
        )

    # No duplicar (equipo, usuario, temporada, rol).
    existe = await db.execute(
        select(EquipoUsuario).where(
            EquipoUsuario.equipo_id == equipo_id,
            EquipoUsuario.usuario_id == payload.usuario_id,
            EquipoUsuario.temporada_id == equipo.temporada_id,
            EquipoUsuario.rol == payload.rol,
        )
    )
    if existe.scalar_one_or_none():
        raise HTTPException(
            status_code=409, detail="El usuario ya tiene ese rol en este equipo"
        )

    staff = EquipoUsuario(
        equipo_id=equipo_id,
        temporada_id=equipo.temporada_id,  # heredada del equipo
        usuario_id=payload.usuario_id,
        rol=payload.rol,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
    )
    db.add(staff)
    await db.commit()
    await db.refresh(staff)
    return staff


@router.get("/{equipo_id}/usuarios", response_model=list[StaffItem])
async def listar_staff(
    club_id: uuid.UUID,
    equipo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    await _get_equipo_del_club(db, club_id, equipo_id)
    result = await db.execute(
        select(EquipoUsuario, Usuario)
        .join(Usuario, Usuario.id == EquipoUsuario.usuario_id)
        .where(
            EquipoUsuario.equipo_id == equipo_id,
            EquipoUsuario.activo.is_(True),
        )
        .order_by(Usuario.apellidos, Usuario.nombre)
    )
    return [
        StaffItem(asignacion=asignacion, usuario=usuario)
        for asignacion, usuario in result.all()
    ]


@router.delete(
    "/{equipo_id}/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def quitar_staff(
    club_id: uuid.UUID,
    equipo_id: uuid.UUID,
    usuario_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    equipo = await _get_equipo_del_club(db, club_id, equipo_id)
    result = await db.execute(
        select(EquipoUsuario).where(
            EquipoUsuario.equipo_id == equipo.id,
            EquipoUsuario.usuario_id == usuario_id,
            EquipoUsuario.temporada_id == equipo.temporada_id,
            EquipoUsuario.activo.is_(True),
        )
    )
    asignaciones = result.scalars().all()
    if not asignaciones:
        raise HTTPException(
            status_code=404, detail="El usuario no está asignado a este equipo"
        )
    for a in asignaciones:
        a.activo = False
    await db.commit()
