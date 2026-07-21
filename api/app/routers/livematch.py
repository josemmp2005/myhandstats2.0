import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.club_access import require_live_stats
from app.core.database import get_db
from app.models.club_usuario import ClubUsuario
from app.models.correccion_evento_partido import CorreccionEventoPartido
from app.models.enums import OrigenEvento, ResultadoLanzamiento, RolClub, TipoEvento
from app.models.equipo_usuario import EquipoUsuario
from app.models.evento_partido import EventoPartido
from app.models.partido import Partido
from app.schemas.livematch import EstadoLiveUpdate, EventoCreate, EventoLiveResponse
from app.schemas.partido import PartidoResponse

router = APIRouter(
    prefix="/clubes/{club_id}/partidos/{partido_id}/livematch", tags=["livematch"]
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
    db: AsyncSession, membership: ClubUsuario, equipo_id: uuid.UUID
) -> None:
    """ENTRENADOR y AYUDANTE solo pueden tomar datos de sus equipos asignados."""
    if membership.rol == RolClub.GESTOR_CLUB:
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
            detail="Solo puedes tomar estadísticas de tus equipos asignados",
        )


def _es_gol(tipo: TipoEvento, resultado_lanzamiento: ResultadoLanzamiento | None) -> bool:
    return tipo == TipoEvento.GOL or (
        tipo == TipoEvento.LANZAMIENTO and resultado_lanzamiento == ResultadoLanzamiento.GOL
    )


def _snapshot(evento: EventoPartido) -> dict:
    """Copia serializable en JSON del estado actual del evento (para auditoría)."""
    return {
        "origen": evento.origen.value,
        "equipo_id": str(evento.equipo_id) if evento.equipo_id else None,
        "jugador_id": str(evento.jugador_id) if evento.jugador_id else None,
        "jugador_asistencia_id": str(evento.jugador_asistencia_id)
        if evento.jugador_asistencia_id
        else None,
        "portero_id": str(evento.portero_id) if evento.portero_id else None,
        "periodo": evento.periodo.value,
        "tiempo_ms": evento.tiempo_ms,
        "goles_equipo": evento.goles_equipo,
        "goles_rival": evento.goles_rival,
        "tipo": evento.tipo.value,
        "resultado_lanzamiento": evento.resultado_lanzamiento.value
        if evento.resultado_lanzamiento
        else None,
        "resultado": evento.resultado.value if evento.resultado else None,
        "eliminado": evento.eliminado,
    }


@router.patch("/estado", response_model=PartidoResponse)
async def cambiar_estado_live(
    club_id: uuid.UUID,
    partido_id: uuid.UUID,
    payload: EstadoLiveUpdate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_live_stats),
):
    """Arranca o finaliza el partido desde la captura en directo.

    Separado de `PATCH /partidos/{id}` (Gestor/Entrenador) porque el
    Ayudante también necesita poder arrancar/finalizar los partidos de
    sus equipos asignados, pero no editar el resto de campos del partido.
    """
    try:
        payload.validar()
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    partido = await _get_partido_del_club(db, club_id, partido_id)
    await _require_equipo_asignado(db, membership, partido.equipo_id)

    partido.estado = payload.estado
    await db.commit()
    await db.refresh(partido)
    return partido


@router.post("/eventos", response_model=EventoLiveResponse, status_code=status.HTTP_201_CREATED)
async def registrar_evento(
    club_id: uuid.UUID,
    partido_id: uuid.UUID,
    payload: EventoCreate,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_live_stats),
):
    partido = await _get_partido_del_club(db, club_id, partido_id)
    await _require_equipo_asignado(db, membership, partido.equipo_id)

    equipo_id = payload.equipo_id
    if equipo_id is None:
        equipo_id = (
            partido.equipo_id if payload.origen == OrigenEvento.EQUIPO_PROPIO else partido.rival_equipo_id
        )

    if _es_gol(payload.tipo, payload.resultado_lanzamiento):
        if payload.origen == OrigenEvento.EQUIPO_PROPIO:
            partido.goles_equipo += 1
        else:
            partido.goles_rival += 1

    data = payload.model_dump(exclude={"equipo_id", "metadata"})
    evento = EventoPartido(
        partido_id=partido_id,
        equipo_id=equipo_id,
        goles_equipo=partido.goles_equipo,
        goles_rival=partido.goles_rival,
        creado_por_usuario_id=membership.usuario_id,
        metadata_=payload.metadata,
        **data,
    )
    db.add(evento)
    await db.commit()
    await db.refresh(evento)
    return evento


@router.delete("/eventos/{evento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deshacer_evento(
    club_id: uuid.UUID,
    partido_id: uuid.UUID,
    evento_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: ClubUsuario = Depends(require_live_stats),
):
    """Deshace la última acción registrada (soft-delete + auditoría).

    Solo se puede deshacer el evento más reciente: para corregir acciones
    más antiguas hará falta un flujo de corrección puntual (no implementado
    todavía), no un simple "deshacer".
    """
    partido = await _get_partido_del_club(db, club_id, partido_id)
    await _require_equipo_asignado(db, membership, partido.equipo_id)

    result = await db.execute(
        select(EventoPartido)
        .where(EventoPartido.partido_id == partido_id, EventoPartido.eliminado.is_(False))
        .order_by(EventoPartido.creado_en.desc())
        .limit(1)
    )
    ultimo = result.scalar_one_or_none()
    if not ultimo or ultimo.id != evento_id:
        raise HTTPException(
            status_code=409,
            detail="Solo se puede deshacer la última acción registrada",
        )

    anterior = _snapshot(ultimo)

    if _es_gol(ultimo.tipo, ultimo.resultado_lanzamiento):
        if ultimo.origen == OrigenEvento.EQUIPO_PROPIO:
            partido.goles_equipo = max(partido.goles_equipo - 1, 0)
        else:
            partido.goles_rival = max(partido.goles_rival - 1, 0)

    ultimo.eliminado = True
    ultimo.corregido = True

    db.add(
        CorreccionEventoPartido(
            partido_id=partido_id,
            evento_id=ultimo.id,
            corregido_por_usuario_id=membership.usuario_id,
            motivo="Deshacer última acción",
            datos_anteriores=anterior,
            datos_nuevos={"eliminado": True},
        )
    )
    await db.commit()
