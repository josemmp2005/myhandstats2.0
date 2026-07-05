import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.club_access import require_gestor, require_gestor_or_entrenador, require_member
from app.core.database import get_db
from app.models.club_usuario import ClubUsuario
from app.models.competicion import Competicion
from app.models.enums import EstadoPartido, PeriodoPartido, RolClub
from app.models.equipo import Equipo
from app.models.equipo_usuario import EquipoUsuario
from app.models.estadistica_jugador_partido import EstadisticaJugadorPartido
from app.models.evento_partido import EventoPartido
from app.models.jugador import Jugador
from app.models.jugador_equipo import JugadorEquipo
from app.models.partido import Partido
from app.schemas.estadistica_partido import (
    EstadisticasEquipoTotales,
    JugadorPartidoStats,
    PartidoEstadisticasResponse,
)
from app.schemas.evento_partido import EventoPartidoResponse
from app.schemas.partido import PartidoCreate, PartidoResponse, PartidoUpdate

router = APIRouter(prefix="/clubes/{club_id}/partidos", tags=["partidos"])

_PERIODO_ORDEN = {
    PeriodoPartido.PRIMERA_PARTE: 1,
    PeriodoPartido.SEGUNDA_PARTE: 2,
    PeriodoPartido.PRORROGA_1: 3,
    PeriodoPartido.PRORROGA_2: 4,
    PeriodoPartido.PENALTIS: 5,
}


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


async def _get_partido_del_club(
    db: AsyncSession, club_id: uuid.UUID, partido_id: uuid.UUID
) -> Partido:
    result = await db.execute(
        select(Partido).where(Partido.id == partido_id, Partido.club_id == club_id)
    )
    partido = result.scalar_one_or_none()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return partido


async def _require_equipo_asignado(
    db: AsyncSession, membership: ClubUsuario, equipo_id: uuid.UUID, accion: str
) -> None:
    """El entrenador solo puede operar sobre partidos de sus equipos asignados."""
    if membership.rol != RolClub.ENTRENADOR:
        return
    asignado = await db.execute(
        select(EquipoUsuario).where(
            EquipoUsuario.equipo_id == equipo_id,
            EquipoUsuario.usuario_id == membership.usuario_id,
            EquipoUsuario.activo.is_(True),
        )
    )
    if not asignado.scalar_one_or_none():
        raise HTTPException(
            status_code=403,
            detail=f"Solo puedes {accion} partidos de tus equipos asignados",
        )


async def _check_rival_equipo(
    db: AsyncSession, club_id: uuid.UUID, rival_equipo_id: uuid.UUID, temporada_id: uuid.UUID
) -> None:
    rival = await _get_equipo_del_club(db, club_id, rival_equipo_id)
    if rival.temporada_id != temporada_id:
        raise HTTPException(
            status_code=422, detail="El equipo rival debe pertenecer a la misma temporada"
        )


async def _check_competicion(
    db: AsyncSession, club_id: uuid.UUID, competicion_id: uuid.UUID, temporada_id: uuid.UUID
) -> None:
    result = await db.execute(
        select(Competicion).where(
            Competicion.id == competicion_id,
            Competicion.club_id == club_id,
            Competicion.temporada_id == temporada_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=422, detail="La competición no existe o no pertenece a esta temporada"
        )


@router.post("", response_model=PartidoResponse, status_code=status.HTTP_201_CREATED)
async def crear_partido(
    club_id: uuid.UUID,
    payload: PartidoCreate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor_or_entrenador),
):
    equipo = await _get_equipo_del_club(db, club_id, payload.equipo_id)
    await _require_equipo_asignado(db, membership, equipo.id, "crear")

    if payload.rival_equipo_id is not None:
        await _check_rival_equipo(db, club_id, payload.rival_equipo_id, equipo.temporada_id)

    if payload.competicion_id is not None:
        await _check_competicion(db, club_id, payload.competicion_id, equipo.temporada_id)

    partido = Partido(
        club_id=club_id,
        temporada_id=equipo.temporada_id,
        **payload.model_dump(),
    )
    db.add(partido)
    await db.commit()
    await db.refresh(partido)
    return partido


@router.get("", response_model=list[PartidoResponse])
async def listar_partidos(
    club_id: uuid.UUID,
    temporada_id: Optional[uuid.UUID] = Query(None),
    equipo_id: Optional[uuid.UUID] = Query(None),
    estado: Optional[EstadoPartido] = Query(None),
    solo_mios: bool = Query(False, description="Solo partidos de equipos asignados al usuario actual"),
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    query = select(Partido).where(Partido.club_id == club_id)
    if temporada_id is not None:
        query = query.where(Partido.temporada_id == temporada_id)
    if equipo_id is not None:
        query = query.where(Partido.equipo_id == equipo_id)
    if estado is not None:
        query = query.where(Partido.estado == estado)
    if solo_mios:
        query = query.join(
            EquipoUsuario, EquipoUsuario.equipo_id == Partido.equipo_id
        ).where(
            EquipoUsuario.usuario_id == membership.usuario_id,
            EquipoUsuario.activo.is_(True),
        )
    result = await db.execute(query.order_by(Partido.fecha_partido.desc()))
    return result.scalars().all()


@router.get("/{partido_id}", response_model=PartidoResponse)
async def obtener_partido(
    club_id: uuid.UUID,
    partido_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    return await _get_partido_del_club(db, club_id, partido_id)


@router.patch("/{partido_id}", response_model=PartidoResponse)
async def actualizar_partido(
    club_id: uuid.UUID,
    partido_id: uuid.UUID,
    payload: PartidoUpdate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor_or_entrenador),
):
    partido = await _get_partido_del_club(db, club_id, partido_id)
    await _require_equipo_asignado(db, membership, partido.equipo_id, "editar")

    data = payload.model_dump(exclude_unset=True)

    if data.get("rival_equipo_id") is not None:
        await _check_rival_equipo(db, club_id, data["rival_equipo_id"], partido.temporada_id)

    if data.get("competicion_id") is not None:
        await _check_competicion(db, club_id, data["competicion_id"], partido.temporada_id)

    for key, value in data.items():
        setattr(partido, key, value)

    await db.commit()
    await db.refresh(partido)
    return partido


@router.delete("/{partido_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancelar_partido(
    club_id: uuid.UUID,
    partido_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_gestor),
):
    partido = await _get_partido_del_club(db, club_id, partido_id)
    partido.estado = EstadoPartido.CANCELADO
    await db.commit()


@router.get("/{partido_id}/estadisticas", response_model=PartidoEstadisticasResponse)
async def estadisticas_partido(
    club_id: uuid.UUID,
    partido_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    """Estadísticas agregadas del partido, derivadas de estadisticas_jugador_partido.

    No existe (todavía) una tabla de agregados de equipo separada: el total
    del equipo se calcula sumando las filas de cada jugador, así que siempre
    es coherente con las fichas individuales.
    """
    partido = await _get_partido_del_club(db, club_id, partido_id)

    result = await db.execute(
        select(EstadisticaJugadorPartido, Jugador, JugadorEquipo)
        .join(Jugador, Jugador.id == EstadisticaJugadorPartido.jugador_id)
        .outerjoin(
            JugadorEquipo,
            (JugadorEquipo.jugador_id == Jugador.id)
            & (JugadorEquipo.equipo_id == partido.equipo_id)
            & (JugadorEquipo.temporada_id == partido.temporada_id),
        )
        .where(EstadisticaJugadorPartido.partido_id == partido_id)
    )
    filas = result.all()

    jugadores = [
        JugadorPartidoStats(
            jugador_id=jugador.id,
            nombre=jugador.nombre,
            apellidos=jugador.apellidos,
            dorsal=asignacion.dorsal if asignacion else None,
            posicion_principal=jugador.posicion_principal,
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
        for stat, jugador, asignacion in filas
    ]
    jugadores.sort(key=lambda j: j.goles, reverse=True)

    totales = EstadisticasEquipoTotales(
        goles=sum(j.goles for j in jugadores),
        lanzamientos=sum(j.lanzamientos for j in jugadores),
        asistencias=sum(j.asistencias for j in jugadores),
        paradas=sum(j.paradas for j in jugadores),
        goles_recibidos=sum(j.goles_recibidos for j in jugadores),
        perdidas=sum(j.perdidas for j in jugadores),
        robos=sum(j.robos for j in jugadores),
        blocajes=sum(j.blocajes for j in jugadores),
        exclusiones=sum(j.exclusiones for j in jugadores),
    )
    if totales.lanzamientos > 0:
        totales.eficacia_lanzamiento = round(totales.goles / totales.lanzamientos * 100, 2)
    denom = totales.paradas + totales.goles_recibidos
    if denom > 0:
        totales.porcentaje_paradas = round(totales.paradas / denom * 100, 2)

    return PartidoEstadisticasResponse(
        partido_id=partido.id,
        estado=partido.estado,
        rival_nombre=partido.rival_nombre,
        goles_equipo=partido.goles_equipo,
        goles_rival=partido.goles_rival,
        totales=totales,
        jugadores=jugadores,
    )


@router.get("/{partido_id}/eventos", response_model=list[EventoPartidoResponse])
async def eventos_partido(
    club_id: uuid.UUID,
    partido_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    """Timeline cronológico de eventos del partido (goles, paradas, pérdidas...).

    Todavía no existe una pantalla de captura en directo: los eventos de
    partidos de ejemplo se insertan manualmente, pero el endpoint ya lee
    del esquema real y queda listo para cuando exista esa captura.
    """
    await _get_partido_del_club(db, club_id, partido_id)

    jugador_asist = aliased(Jugador)
    jugador_portero = aliased(Jugador)

    result = await db.execute(
        select(EventoPartido, Jugador, jugador_asist, jugador_portero)
        .outerjoin(Jugador, Jugador.id == EventoPartido.jugador_id)
        .outerjoin(jugador_asist, jugador_asist.id == EventoPartido.jugador_asistencia_id)
        .outerjoin(jugador_portero, jugador_portero.id == EventoPartido.portero_id)
        .where(
            EventoPartido.partido_id == partido_id,
            EventoPartido.eliminado.is_(False),
        )
    )
    filas = result.all()

    def nombre_completo(j: Jugador | None) -> Optional[str]:
        return f"{j.nombre} {j.apellidos}" if j else None

    eventos = [
        EventoPartidoResponse(
            id=evento.id,
            origen=evento.origen,
            equipo_id=evento.equipo_id,
            jugador_id=evento.jugador_id,
            jugador_nombre=nombre_completo(jugador),
            jugador_asistencia_id=evento.jugador_asistencia_id,
            asistencia_nombre=nombre_completo(asistente),
            portero_id=evento.portero_id,
            portero_nombre=nombre_completo(portero),
            periodo=evento.periodo,
            tiempo_ms=evento.tiempo_ms,
            goles_equipo=evento.goles_equipo,
            goles_rival=evento.goles_rival,
            tipo=evento.tipo,
            resultado_lanzamiento=evento.resultado_lanzamiento,
            resultado=evento.resultado,
        )
        for evento, jugador, asistente, portero in filas
    ]
    eventos.sort(key=lambda e: (_PERIODO_ORDEN[e.periodo], e.tiempo_ms))
    return eventos
