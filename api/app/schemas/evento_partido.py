import uuid
from typing import Optional

from pydantic import BaseModel

from app.models.enums import (
    FaseJuego,
    OrigenEvento,
    PeriodoPartido,
    ResultadoEvento,
    ResultadoLanzamiento,
    SistemaAtaque,
    SistemaDefensa,
    SituacionNumerica,
    TipoEvento,
    ZonaCampo,
    ZonaPorteria,
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
    subtipo: Optional[str]
    fase: Optional[FaseJuego]
    situacion_numerica: Optional[SituacionNumerica]
    sistema_ataque: Optional[SistemaAtaque]
    sistema_defensa: Optional[SistemaDefensa]
    resultado_lanzamiento: Optional[ResultadoLanzamiento]
    resultado: Optional[ResultadoEvento]
    campo_x: Optional[float]
    campo_y: Optional[float]
    zona_campo: Optional[ZonaCampo]
    zona_porteria: Optional[ZonaPorteria]
