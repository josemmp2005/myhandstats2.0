from fastapi import FastAPI
from app.routers import health, usuarios

app = FastAPI(title="MyHandStats API", version="0.1.0")

app.include_router(health.router)
app.include_router(usuarios.router)
