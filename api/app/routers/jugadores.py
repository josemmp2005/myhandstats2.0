import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.club_access import require_gestor, require_gestor_or_entrenador, require_member
from app.core.database import get_db
from app.models.club_usuario import ClubUsuario
from app.models.enums import RolClub, TipoJugador
from app.models.equipo import Equipo
from app.models.equipo_usuario import EquipoUsuario
from app.models.estadistica_jugador_partido import EstadisticaJugadorPartido
from app.models.jugador import Jugador
from app.models.jugador_equipo import JugadorEquipo
from app.models.partido import Partido
from app.schemas.estadistica_jugador import (
    EstadisticaPartidoItem,
    EstadisticasTotales,
    JugadorEstadisticasResponse,
)
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


async def _get_equipo_del_club(
    db: AsyncSession, club_id: uuid.UUID, equipo_id: uuid.UUID
) -> Equipo:
    result = await db.execute(
        select(Equipo).where(Equipo.id == equipo_id, Equipo.club_id == club_id)
    )
    equipo = result.scalar_one_or_none()
    if not equipo:
        raise HTTPException(
            status_code=422, detail="El equipo no existe o no pertenece a este club"
        )
    return equipo


@router.post("", response_model=JugadorResponse, status_code=status.HTTP_201_CREATED)
async def crear_jugador(
    club_id: uuid.UUID,
    payload: JugadorCreate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor_or_entrenador),
):
    equipo = await _get_equipo_del_club(db, club_id, payload.equipo_id)

    # El entrenador solo puede dar de alta jugadores en sus propios equipos.
    if membership.rol == RolClub.ENTRENADOR:
        asignado = await db.execute(
            select(EquipoUsuario).where(
                EquipoUsuario.equipo_id == equipo.id,
                EquipoUsuario.usuario_id == membership.usuario_id,
                EquipoUsuario.activo.is_(True),
            )
        )
        if not asignado.scalar_one_or_none():
            raise HTTPException(
                status_code=403,
                detail="Solo puedes crear jugadores para tus equipos asignados",
            )

    data = payload.model_dump(exclude={"equipo_id", "dorsal"})
    jugador = Jugador(club_id=club_id, **data)
    db.add(jugador)
    await db.flush()  # asigna jugador.id sin cerrar la transacción

    asignacion = JugadorEquipo(
        jugador_id=jugador.id,
        equipo_id=equipo.id,
        temporada_id=equipo.temporada_id,
        dorsal=payload.dorsal,
    )
    db.add(asignacion)
    await db.commit()
    await db.refresh(jugador)
    return jugador


@router.get("", response_model=list[JugadorResponse])
async def listar_jugadores(
    club_id: uuid.UUID,
    tipo: Optional[TipoJugador] = Query(None),
    activo: Optional[bool] = Query(None),
    equipo_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    query = select(Jugador).where(Jugador.club_id == club_id)
    if tipo is not None:
        query = query.where(Jugador.tipo == tipo)
    if activo is not None:
        query = query.where(Jugador.activo == activo)
    if equipo_id is not None:
        query = query.join(
            JugadorEquipo, JugadorEquipo.jugador_id == Jugador.id
        ).where(
            JugadorEquipo.equipo_id == equipo_id,
            JugadorEquipo.activo.is_(True),
        )
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
    membership: ClubUsuario = Depends(require_gestor_or_entrenador),
):
    jugador = await _get_jugador_del_club(db, club_id, jugador_id)

    # El entrenador solo puede editar jugadores de sus propios equipos.
    if membership.rol == RolClub.ENTRENADOR:
        asignado = await db.execute(
            select(JugadorEquipo.id)
            .join(EquipoUsuario, EquipoUsuario.equipo_id == JugadorEquipo.equipo_id)
            .where(
                JugadorEquipo.jugador_id == jugador_id,
                JugadorEquipo.activo.is_(True),
                EquipoUsuario.usuario_id == membership.usuario_id,
                EquipoUsuario.activo.is_(True),
            )
        )
        if not asignado.first():
            raise HTTPException(
                status_code=403,
                detail="Solo puedes editar jugadores de tus equipos asignados",
            )

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
    membership: ClubUsuario = Depends(require_gestor),
):
    jugador = await _get_jugador_del_club(db, club_id, jugador_id)
    jugador.activo = False
    await db.commit()


@router.get("/{jugador_id}/estadisticas", response_model=JugadorEstadisticasResponse)
async def estadisticas_jugador(
    club_id: uuid.UUID,
    jugador_id: uuid.UUID,
    temporada_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    """Estadísticas agregadas por partido, leídas de estadisticas_jugador_partido.

    Esta tabla todavía no la rellena nadie (no existe la captura de eventos
    de partido / Live Stats), así que hoy devuelve listas vacías para
    cualquier jugador. El endpoint queda listo para cuando exista ese pipeline.
    """
    await _get_jugador_del_club(db, club_id, jugador_id)

    query = (
        select(EstadisticaJugadorPartido, Partido)
        .join(Partido, Partido.id == EstadisticaJugadorPartido.partido_id)
        .where(
            EstadisticaJugadorPartido.jugador_id == jugador_id,
            Partido.club_id == club_id,
        )
    )
    if temporada_id is not None:
        query = query.where(Partido.temporada_id == temporada_id)
    result = await db.execute(query.order_by(Partido.fecha_partido))
    filas = result.all()

    por_partido = [
        EstadisticaPartidoItem(
            partido_id=partido.id,
            fecha_partido=partido.fecha_partido,
            rival_nombre=partido.rival_nombre,
            estado_partido=partido.estado,
            goles=stat.goles,
            lanzamientos=stat.lanzamientos,
            asistencias=stat.asistencias,
            paradas=stat.paradas,
            goles_recibidos=stat.goles_recibidos,
            perdidas=stat.perdidas,
            robos=stat.robos,
            blocajes=stat.blocajes,
            exclusiones=stat.exclusiones,
            eficacia_lanzamiento=stat.eficacia_lanzamiento,
            porcentaje_paradas=stat.porcentaje_paradas,
        )
        for stat, partido in filas
    ]

    totales = EstadisticasTotales(
        goles=sum(p.goles for p in por_partido),
        lanzamientos=sum(p.lanzamientos for p in por_partido),
        asistencias=sum(p.asistencias for p in por_partido),
        paradas=sum(p.paradas for p in por_partido),
        goles_recibidos=sum(p.goles_recibidos for p in por_partido),
        perdidas=sum(p.perdidas for p in por_partido),
        robos=sum(p.robos for p in por_partido),
        blocajes=sum(p.blocajes for p in por_partido),
        exclusiones=sum(p.exclusiones for p in por_partido),
    )
    if totales.lanzamientos > 0:
        totales.eficacia_lanzamiento = round(totales.goles / totales.lanzamientos * 100, 2)
    denom_paradas = totales.paradas + totales.goles_recibidos
    if denom_paradas > 0:
        totales.porcentaje_paradas = round(totales.paradas / denom_paradas * 100, 2)

    return JugadorEstadisticasResponse(
        jugador_id=jugador_id,
        partidos_jugados=len(por_partido),
        totales=totales,
        por_partido=por_partido,
    )
