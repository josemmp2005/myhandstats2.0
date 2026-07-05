import uuid
from typing import Optional

from pydantic import BaseModel

from app.models.enums import (
    OrigenEvento,
    PeriodoPartido,
    ResultadoEvento,
    ResultadoLanzamiento,
    TipoEvento,
)


class EventoPartidoResponse(BaseModel):
    id: uuid.UUID
    origen: OrigenEvento
    equipo_id: Optional[uuid.UUID]
    jugador_id: Optional[uuid.UUID]
    jugador_nombre: Optional[str]
    jugador_asistencia_id: Optional[uuid.UUID]
    asistencia_nombre: Optional[str]
    portero_id: Optional[uuid.UUID]
    portero_nombre: Optional[str]
    periodo: PeriodoPartido
    tiempo_ms: int
    goles_equipo: int
    goles_rival: int
    tipo: TipoEvento
    resultado_lanzamiento: Optional[ResultadoLanzamiento]
    resultado: Optional[ResultadoEvento]
