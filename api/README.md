# MyHandStats API

Backend de MyHandStats2.0. Construido con **FastAPI + SQLAlchemy async + asyncpg + PostgreSQL**.

## Arranque local

```powershell
cd api
.\.venv\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8000
```

Docs interactivas: http://127.0.0.1:8000/docs

## Variables de entorno

Copia `.env.example` a `.env` y ajusta si es necesario:

```env
DATABASE_URL=postgresql+asyncpg://myhandstats:myhandstats@localhost:5433/myhandstats
SECRET_KEY=<genera_uno_con: python -c "import secrets; print(secrets.token_hex(32))">
```

> El puerto es **5433** porque el 5432 está ocupado por una instancia PostgreSQL nativa del sistema.

## Base de datos

El contenedor Docker se levanta desde la raíz del proyecto:

```powershell
docker compose -f docker/docker-compose.yml up -d
```

El schema se aplica automáticamente al crear el volumen (`db/schema.sql`).

## Estructura

```
api/
├── main.py                  # Entrada de la aplicación, registro de routers
├── requirements.txt
├── .env / .env.example
└── app/
    ├── core/
    │   ├── config.py        # Settings (pydantic-settings, lee .env)
    │   ├── database.py      # Engine async, sesión, check_db_connection()
    │   ├── security.py      # hash/verify password, create/decode JWT
    │   └── deps.py          # get_current_user (dependencia FastAPI)
    ├── models/
    │   ├── base.py          # DeclarativeBase de SQLAlchemy
    │   └── usuario.py       # ORM model → tabla usuarios
    ├── schemas/
    │   ├── auth.py          # LoginRequest, TokenResponse
    │   └── usuario.py       # UsuarioCreate, UsuarioUpdate, UsuarioResponse
    └── routers/
        ├── health.py        # GET /health, GET /health/db
        ├── auth.py          # POST /auth/login|refresh|logout
        └── usuarios.py      # CRUD /usuarios
```

---

## Endpoints implementados

### Health

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Confirma que la API está en pie |
| GET | `/health/db` | Verifica la conexión con PostgreSQL |

**`GET /health`**
```json
{ "status": "ok" }
```

**`GET /health/db`**
```json
{ "status": "ok", "database": "connected" }
```
En caso de fallo devuelve `503`:
```json
{ "status": "error", "database": "unreachable" }
```

---

### Auth

Autenticación basada en **JWT**. El access token dura 30 min y se envía en el body. El refresh token dura 7 días y se almacena en una cookie `httpOnly` (inaccesible desde JS).

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Obtener access + refresh token |
| POST | `/auth/refresh` | Renovar access token (usa cookie automáticamente) |
| POST | `/auth/logout` | Invalidar refresh token (borra la cookie) |

**`POST /auth/login`**
```json
// Request
{ "email": "entrenador@club.com", "password": "minimo8chars" }

// Response 200
{ "access_token": "<jwt>", "token_type": "bearer" }
```
Además se establece la cookie `refresh_token` (httpOnly).

**`POST /auth/refresh`** — sin body; el navegador envía la cookie automáticamente.
```json
// Response 200
{ "access_token": "<jwt_nuevo>", "token_type": "bearer" }
```
El refresh token rota: se emite uno nuevo en cada llamada.

**`POST /auth/logout`** — sin body. Respuesta `204 No Content`. Borra la cookie.

**Códigos de error**
| Código | Causa |
|--------|-------|
| 401 | Credenciales incorrectas / token inválido o expirado |
| 403 | Usuario desactivado |

**Proteger un endpoint:**
```python
from app.core.deps import get_current_user
from app.models.usuario import Usuario

@router.get("/me")
async def me(usuario: Usuario = Depends(get_current_user)):
    return usuario
```
El cliente debe incluir `Authorization: Bearer <access_token>` en la cabecera.

---

### Usuarios

Gestión de la tabla `usuarios`. El rol del usuario dentro de un club se gestiona en `club_usuarios` (no aquí).
La contraseña nunca se devuelve en la respuesta.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/usuarios` | Crear usuario |
| GET | `/usuarios` | Listar usuarios (filtro opcional: `?activo=true/false`) |
| GET | `/usuarios/{id}` | Obtener usuario por ID |
| PATCH | `/usuarios/{id}` | Actualizar usuario (parcial) |
| DELETE | `/usuarios/{id}` | Desactivar usuario (soft delete: `activo = false`) |

**Body `POST /usuarios`**
```json
{
  "email": "entrenador@club.com",
  "nombre": "Juan",
  "apellidos": "García",
  "password": "minimo8chars",
  "avatar_url": null
}
```

**Respuesta `UsuarioResponse`**
```json
{
  "id": "uuid",
  "email": "entrenador@club.com",
  "nombre": "Juan",
  "apellidos": "García",
  "avatar_url": null,
  "activo": true,
  "creado_en": "2026-06-30T10:45:39Z",
  "actualizado_en": "2026-06-30T10:45:39Z"
}
```

**Códigos de error**
| Código | Causa |
|--------|-------|
| 409 | Email ya registrado |
| 404 | Usuario no encontrado |
| 422 | Validación fallida (password < 8 chars, email inválido…) |
