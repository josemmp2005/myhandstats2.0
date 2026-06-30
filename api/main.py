from fastapi import FastAPI
from app.routers import (
    health,
    usuarios,
    auth,
    clubes,
    temporadas,
    equipos,
    jugadores,
)

app = FastAPI(title="MyHandStats API", version="0.1.0")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(clubes.router)
app.include_router(temporadas.router)
app.include_router(equipos.router)
app.include_router(jugadores.router)
