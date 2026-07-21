import uuid
from collections import Counter
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.club_access import require_live_stats, require_member
from app.core.database import get_db
from app.models.club_usuario import ClubUsuario
from app.models.convocatoria import Convocatoria
from app.models.enums import EstadoPartido, RolClub
from app.models.equipo_usuario import EquipoUsuario
from app.models.jugador import Jugador
from app.models.jugador_equipo import JugadorEquipo
from app.models.partido import Partido
from app.schemas.convocatoria import ConvocatoriaItem, ConvocatoriaJugadorInput

_ESTADOS_BLOQUEADOS = (EstadoPartido.FINALIZADO, EstadoPartido.CANCELADO)

router = APIRouter(
    prefix="/clubes/{club_id}/partidos/{partido_id}/convocatoria", tags=["convocatorias"]
)


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
    """Entrenador y ayudante solo pueden gestionar convocatorias de sus equipos asignados."""
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
            status_code=403, detail=f"Solo puedes {accion} de tus equipos asignados"
        )


async def _listar_items(db: AsyncSession, partido_id: uuid.UUID) -> list[ConvocatoriaItem]:
    result = await db.execute(
        select(Convocatoria, Jugador, JugadorEquipo)
        .join(Jugador, Jugador.id == Convocatoria.jugador_id)
        .outerjoin(
            JugadorEquipo,
            (JugadorEquipo.jugador_id == Convocatoria.jugador_id)
            & (JugadorEquipo.equipo_id == Convocatoria.equipo_id)
            & (JugadorEquipo.activo.is_(True)),
        )
        .where(Convocatoria.partido_id == partido_id)
        .order_by(Convocatoria.dorsal)
    )
    return [
        ConvocatoriaItem(
            jugador_id=jugador.id,
            nombre=jugador.nombre,
            apellidos=jugador.apellidos,
            foto_url=jugador.foto_url,
            dorsal=conv.dorsal,
            posicion_principal=jugador.posicion_principal,
            disponible=conv.disponible,
            es_portero=conv.es_portero,
            titular=conv.titular,
            disponible_para_jugar=asignacion.disponible_para_jugar if asignacion else True,
        )
        for conv, jugador, asignacion in result.all()
    ]


@router.get("", response_model=list[ConvocatoriaItem])
async def listar_convocatoria(
    club_id: uuid.UUID,
    partido_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_member),
):
    await _get_partido_del_club(db, club_id, partido_id)
    return await _listar_items(db, partido_id)


@router.put("", response_model=list[ConvocatoriaItem])
async def guardar_convocatoria(
    club_id: uuid.UUID,
    partido_id: uuid.UUID,
    payload: list[ConvocatoriaJugadorInput],
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_live_stats),
):
    partido = await _get_partido_del_club(db, club_id, partido_id)
    await _require_equipo_asignado(db, membership, partido.equipo_id, "gestionar la convocatoria")

    if partido.estado in _ESTADOS_BLOQUEADOS:
        raise HTTPException(
            status_code=409,
            detail="No se puede modificar la convocatoria de un partido finalizado o cancelado",
        )

    # Los jugadores convocados deben pertenecer a la plantilla activa de este equipo.
    jugador_ids = [item.jugador_id for item in payload]
    result = await db.execute(
        select(JugadorEquipo, Jugador)
        .join(Jugador, Jugador.id == JugadorEquipo.jugador_id)
        .where(
            JugadorEquipo.equipo_id == partido.equipo_id,
            JugadorEquipo.jugador_id.in_(jugador_ids),
            JugadorEquipo.activo.is_(True),
        )
    )
    plantilla = {je.jugador_id: (je, j) for je, j in result.all()}
    faltantes = set(jugador_ids) - set(plantilla.keys())
    if faltantes:
        raise HTTPException(
            status_code=422,
            detail="Alguno de los jugadores no pertenece a la plantilla de este equipo",
        )

    no_disponibles = [
        item.jugador_id
        for item in payload
        if item.disponible and not plantilla[item.jugador_id][0].disponible_para_jugar
    ]
    if no_disponibles:
        raise HTTPException(
            status_code=422,
            detail="No se puede convocar a un jugador marcado como no disponible en la plantilla",
        )

    # Dorsal efectivo: el indicado para este partido, o si no se indica, el de plantilla.
    dorsales_por_jugador: dict[uuid.UUID, Optional[int]] = {
        item.jugador_id: item.dorsal if item.dorsal is not None else plantilla[item.jugador_id][0].dorsal
        for item in payload
    }
    conteo_dorsales = Counter(
        dorsales_por_jugador[item.jugador_id]
        for item in payload
        if item.disponible and dorsales_por_jugador[item.jugador_id] is not None
    )
    duplicados = sorted(dorsal for dorsal, veces in conteo_dorsales.items() if veces > 1)
    if duplicados:
        raise HTTPException(
            status_code=422,
            detail=f"Dorsal duplicado en la convocatoria: {', '.join(str(d) for d in duplicados)}",
        )

    existentes = await db.execute(select(Convocatoria).where(Convocatoria.partido_id == partido_id))
    por_jugador = {c.jugador_id: c for c in existentes.scalars().all()}

    for item in payload:
        asignacion, jugador = plantilla[item.jugador_id]
        dorsal = dorsales_por_jugador[item.jugador_id]
        conv = por_jugador.get(item.jugador_id)
        if conv:
            conv.disponible = item.disponible
            conv.es_portero = item.es_portero
            conv.titular = item.titular
            conv.dorsal = dorsal
        else:
            db.add(
                Convocatoria(
                    partido_id=partido_id,
                    equipo_id=partido.equipo_id,
                    jugador_id=item.jugador_id,
                    dorsal=dorsal,
                    posicion=jugador.posicion_principal,
                    disponible=item.disponible,
                    es_portero=item.es_portero,
                    titular=item.titular,
                )
            )

    await db.commit()
    return await _listar_items(db, partido_id)
