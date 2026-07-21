import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.club_access import (
    require_gestor,
    require_gestor_or_entrenador,
    require_live_stats,
    require_member,
)
from app.core.database import get_db
from app.models.club_usuario import ClubUsuario
from app.models.competicion import Competicion
from app.models.enums import (
    EstadoPartido,
    OrigenEvento,
    PeriodoPartido,
    ResultadoLanzamiento,
    RolClub,
    TipoEvento,
)
from app.models.equipo import Equipo
from app.models.equipo_usuario import EquipoUsuario
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
    """Entrenador y ayudante solo pueden operar sobre partidos de sus equipos asignados."""
    if membership.rol not in (RolClub.ENTRENADOR, RolClub.AYUDANTE):
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
    membership: ClubUsuario = Depends(require_live_stats),
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


def _es_gol_stats(evento: EventoPartido) -> bool:
    return evento.tipo == TipoEvento.GOL or (
        evento.tipo == TipoEvento.LANZAMIENTO
        and evento.resultado_lanzamiento == ResultadoLanzamiento.GOL
    )


def _es_parada_stats(evento: EventoPartido) -> bool:
    return evento.tipo == TipoEvento.PARADA or (
        evento.tipo == TipoEvento.LANZAMIENTO
        and evento.resultado_lanzamiento == ResultadoLanzamiento.PARADA
    )


def _agregar_stats_por_jugador(eventos: list[EventoPartido]) -> dict[uuid.UUID, dict]:
    """Deriva los totales por jugador directamente de los eventos del partido.

    Reemplaza la lectura de `estadisticas_jugador_partido`: esa tabla solo se
    rellenaba a mano para el partido de ejemplo sembrado por SQL, ningún
    partido capturado en directo (vía livematch.py) la alimenta. Los eventos
    son la única fuente que sí existe siempre para un partido real.
    """
    acumulado: dict[uuid.UUID, dict] = {}

    def _fila(jugador_id: uuid.UUID) -> dict:
        return acumulado.setdefault(
            jugador_id,
            {
                "goles": 0,
                "lanzamientos": 0,
                "asistencias": 0,
                "paradas": 0,
                "goles_recibidos": 0,
                "perdidas": 0,
                "robos": 0,
                "blocajes": 0,
                "exclusiones": 0,
            },
        )

    for e in eventos:
        if e.tipo in (TipoEvento.LANZAMIENTO, TipoEvento.GOL) and e.origen == OrigenEvento.EQUIPO_PROPIO:
            if e.jugador_id is not None:
                fila = _fila(e.jugador_id)
                fila["lanzamientos"] += 1
                if _es_gol_stats(e):
                    fila["goles"] += 1
            if e.jugador_asistencia_id is not None:
                _fila(e.jugador_asistencia_id)["asistencias"] += 1
        elif e.tipo in (TipoEvento.LANZAMIENTO, TipoEvento.PARADA) and e.origen == OrigenEvento.RIVAL:
            if e.portero_id is not None:
                fila = _fila(e.portero_id)
                if _es_parada_stats(e):
                    fila["paradas"] += 1
                elif _es_gol_stats(e):
                    fila["goles_recibidos"] += 1
        elif e.tipo == TipoEvento.PERDIDA and e.jugador_id is not None:
            _fila(e.jugador_id)["perdidas"] += 1
        elif e.tipo == TipoEvento.ROBO and e.jugador_id is not None:
            _fila(e.jugador_id)["robos"] += 1
        elif e.tipo == TipoEvento.BLOCAJE and e.jugador_id is not None:
            _fila(e.jugador_id)["blocajes"] += 1
        elif (
            e.tipo == TipoEvento.DOS_MINUTOS
            and e.origen == OrigenEvento.EQUIPO_PROPIO
            and e.jugador_id is not None
        ):
            _fila(e.jugador_id)["exclusiones"] += 1

    return acumulado


@router.get("/{partido_id}/estadisticas", response_model=PartidoEstadisticasResponse)
async def estadisticas_partido(
    club_id: uuid.UUID,
    partido_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    """Estadísticas agregadas del partido, derivadas en vivo de eventos_partido.

    No existe (todavía) una tabla de agregados de equipo separada: el total
    del equipo se calcula sumando las filas de cada jugador, así que siempre
    es coherente con las fichas individuales.
    """
    partido = await _get_partido_del_club(db, club_id, partido_id)

    result = await db.execute(
        select(EventoPartido).where(
            EventoPartido.partido_id == partido_id,
            EventoPartido.eliminado.is_(False),
        )
    )
    acumulado = _agregar_stats_por_jugador(result.scalars().all())

    jugadores_info: dict[uuid.UUID, tuple[Jugador, JugadorEquipo | None]] = {}
    if acumulado:
        info = await db.execute(
            select(Jugador, JugadorEquipo)
            .outerjoin(
                JugadorEquipo,
                (JugadorEquipo.jugador_id == Jugador.id)
                & (JugadorEquipo.equipo_id == partido.equipo_id)
                & (JugadorEquipo.temporada_id == partido.temporada_id),
            )
            .where(Jugador.id.in_(acumulado.keys()))
        )
        jugadores_info = {jugador.id: (jugador, asignacion) for jugador, asignacion in info.all()}

    jugadores = []
    for jugador_id, stat in acumulado.items():
        info = jugadores_info.get(jugador_id)
        if not info:
            continue
        jugador, asignacion = info
        lanzamientos = stat["lanzamientos"]
        denom_paradas = stat["paradas"] + stat["goles_recibidos"]
        jugadores.append(
            JugadorPartidoStats(
                jugador_id=jugador.id,
                nombre=jugador.nombre,
                apellidos=jugador.apellidos,
                dorsal=asignacion.dorsal if asignacion else None,
                posicion_principal=jugador.posicion_principal,
                goles=stat["goles"],
                lanzamientos=lanzamientos,
                asistencias=stat["asistencias"],
                paradas=stat["paradas"],
                goles_recibidos=stat["goles_recibidos"],
                perdidas=stat["perdidas"],
                robos=stat["robos"],
                blocajes=stat["blocajes"],
                exclusiones=stat["exclusiones"],
                eficacia_lanzamiento=round(stat["goles"] / lanzamientos * 100, 2)
                if lanzamientos > 0
                else None,
                porcentaje_paradas=round(stat["paradas"] / denom_paradas * 100, 2)
                if denom_paradas > 0
                else None,
            )
        )
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
    """Timeline cronológico de eventos del partido (goles, paradas, pérdidas...)."""
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
            subtipo=evento.subtipo,
            fase=evento.fase,
            situacion_numerica=evento.situacion_numerica,
            sistema_ataque=evento.sistema_ataque,
            sistema_defensa=evento.sistema_defensa,
            resultado_lanzamiento=evento.resultado_lanzamiento,
            resultado=evento.resultado,
            campo_x=float(evento.campo_x) if evento.campo_x is not None else None,
            campo_y=float(evento.campo_y) if evento.campo_y is not None else None,
            zona_campo=evento.zona_campo,
            zona_porteria=evento.zona_porteria,
        )
        for evento, jugador, asistente, portero in filas
    ]
    eventos.sort(key=lambda e: (_PERIODO_ORDEN[e.periodo], e.tiempo_ms))
    return eventos
