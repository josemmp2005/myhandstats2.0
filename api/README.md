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
    │   └── security.py      # hash_password(), verify_password() con bcrypt
    ├── models/
    │   ├── base.py          # DeclarativeBase de SQLAlchemy
    │   └── usuario.py       # ORM model → tabla usuarios
    ├── schemas/
    │   └── usuario.py       # Pydantic: UsuarioCreate, UsuarioUpdate, UsuarioResponse
    └── routers/
        ├── health.py        # GET /health, GET /health/db
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
