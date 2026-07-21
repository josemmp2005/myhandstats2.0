import uuid
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import (
    EstadoPartido,
    FaseJuego,
    OrigenEvento,
    PeriodoPartido,
    ResultadoEvento,
    ResultadoLanzamiento,
    SistemaAtaque,
    SistemaDefensa,
    SituacionNumerica,
    TipoEvento,
    TipoLanzamiento,
    ZonaCampo,
    ZonaPorteria,
)

ESTADOS_LIVEMATCH = (EstadoPartido.EN_DIRECTO, EstadoPartido.FINALIZADO)


class EstadoLiveUpdate(BaseModel):
    """Transición de estado permitida desde la captura en directo.

    Solo cubre arrancar/finalizar el partido — cancelar o aplazar sigue
    siendo una acción de gestión (`PATCH /partidos/{id}`, solo Gestor/Entrenador).
    """

    estado: EstadoPartido

    def validar(self) -> None:
        if self.estado not in ESTADOS_LIVEMATCH:
            raise ValueError("Solo se puede arrancar (EN_DIRECTO) o finalizar (FINALIZADO) desde livematch")


class EventoCreate(BaseModel):
    """Payload para registrar una acción durante la captura en directo.

    `goles_equipo`/`goles_rival` no se aceptan aquí: el marcador lo calcula
    el servidor a partir de `partido.goles_equipo/goles_rival` para que sea
    siempre la fuente de verdad, sin depender de lo que envíe el cliente.
    """

    origen: OrigenEvento = OrigenEvento.EQUIPO_PROPIO
    equipo_id: Optional[uuid.UUID] = None
    jugador_id: Optional[uuid.UUID] = None
    jugador_asistencia_id: Optional[uuid.UUID] = None
    portero_id: Optional[uuid.UUID] = None
    jugador_texto: Optional[str] = None
    periodo: PeriodoPartido
    tiempo_ms: int = Field(..., ge=0)
    tipo: TipoEvento
    subtipo: Optional[str] = None
    fase: Optional[FaseJuego] = None
    situacion_numerica: Optional[SituacionNumerica] = None
    sistema_ataque: Optional[SistemaAtaque] = None
    sistema_defensa: Optional[SistemaDefensa] = None
    tipo_lanzamiento: Optional[TipoLanzamiento] = None
    resultado_lanzamiento: Optional[ResultadoLanzamiento] = None
    resultado: Optional[ResultadoEvento] = None
    campo_x: Optional[float] = Field(None, ge=0, le=100)
    campo_y: Optional[float] = Field(None, ge=0, le=100)
    zona_campo: Optional[ZonaCampo] = None
    zona_porteria: Optional[ZonaPorteria] = None
    metadata: dict = Field(default_factory=dict)


class EventoLiveResponse(BaseModel):
    id: uuid.UUID
    partido_id: uuid.UUID
    origen: OrigenEvento
    equipo_id: Optional[uuid.UUID]
    jugador_id: Optional[uuid.UUID]
    jugador_asistencia_id: Optional[uuid.UUID]
    portero_id: Optional[uuid.UUID]
    jugador_texto: Optional[str]
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
    tipo_lanzamiento: Optional[TipoLanzamiento]
    resultado_lanzamiento: Optional[ResultadoLanzamiento]
    resultado: Optional[ResultadoEvento]
    campo_x: Optional[float]
    campo_y: Optional[float]
    zona_campo: Optional[ZonaCampo]
    zona_porteria: Optional[ZonaPorteria]
    eliminado: bool

    model_config = {"from_attributes": True}
