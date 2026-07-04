from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    health,
    usuarios,
    auth,
    clubes,
    temporadas,
    equipos,
    jugadores,
    invitaciones,
)

app = FastAPI(title="MyHandStats API", version="0.1.0")

# CORS: el frontend (Next.js) corre en otro origen y envía la cookie de refresh,
# por eso allow_credentials=True exige orígenes explícitos (no "*").
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(clubes.router)
app.include_router(temporadas.router)
app.include_router(equipos.router)
app.include_router(jugadores.router)
app.include_router(invitaciones.router)
app.include_router(invitaciones.redeem_router)
