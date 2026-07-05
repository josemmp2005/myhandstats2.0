import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.enums import EstadoPartido


class EstadisticaPartidoItem(BaseModel):
    """Fila de estadísticas de un jugador en un partido concreto."""

    partido_id: uuid.UUID
    fecha_partido: datetime
    rival_nombre: str
    estado_partido: EstadoPartido
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


class EstadisticasTotales(BaseModel):
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


class JugadorEstadisticasResponse(BaseModel):
    jugador_id: uuid.UUID
    partidos_jugados: int
    totales: EstadisticasTotales
    por_partido: list[EstadisticaPartidoItem]
