import uuid
from typing import Optional

from pydantic import BaseModel

from app.models.enums import EstadoPartido, PosicionJugador


class EstadisticasEquipoTotales(BaseModel):
    goles: int = 0
    lanzamientos: int = 0
    asistencias: int = 0
    paradas: int = 0
    goles_recibidos: int = 0
    perdidas: int = 0
    robos: int = 0
    blocajes: int = 0
    exclusiones: int = 0
    eficacia_lanzamiento: Optional[float] = None
    porcentaje_paradas: Optional[float] = None


class JugadorPartidoStats(BaseModel):
    jugador_id: uuid.UUID
    nombre: str
    apellidos: str
    dorsal: Optional[int]
    posicion_principal: Optional[PosicionJugador]
    goles: int
    lanzamientos: int
    asistencias: int
    paradas: int
    goles_recibidos: int
    perdidas: int
    robos: int
    blocajes: int
    exclusiones: int
    eficacia_lanzamiento: Optional[float]
    porcentaje_paradas: Optional[float]


class PartidoEstadisticasResponse(BaseModel):
    partido_id: uuid.UUID
    estado: EstadoPartido
    rival_nombre: str
    goles_equipo: int
    goles_rival: int
    totales: EstadisticasEquipoTotales
    jugadores: list[JugadorPartidoStats]
