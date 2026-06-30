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
    │   ├── deps.py          # get_current_user (dependencia FastAPI)
    │   └── club_access.py   # require_member / require_gestor (autorización por club)
    ├── models/
    │   ├── base.py          # DeclarativeBase de SQLAlchemy
    │   ├── enums.py         # RolClub, CategoriaEquipo, GeneroEquipo, PosicionJugador…
    │   ├── usuario.py       # ORM → usuarios
    │   ├── club.py          # ORM → clubes
    │   ├── club_usuario.py  # ORM → club_usuarios (N:M usuario↔club)
    │   ├── temporada.py     # ORM → temporadas
    │   ├── equipo.py        # ORM → equipos
    │   ├── jugador.py       # ORM → jugadores
    │   └── jugador_equipo.py# ORM → jugadores_equipos (N:M jugador↔equipo)
    ├── schemas/             # Pydantic por recurso (auth, usuario, club, temporada, equipo, jugador…)
    └── routers/
        ├── health.py        # GET /health, GET /health/db
        ├── auth.py          # POST /auth/login|refresh|logout
        ├── usuarios.py      # CRUD /usuarios + /usuarios/me
        ├── clubes.py        # CRUD /clubes
        ├── temporadas.py    # CRUD /clubes/{id}/temporadas
        ├── equipos.py       # CRUD /clubes/{id}/equipos + plantilla
        └── jugadores.py     # CRUD /clubes/{id}/jugadores
```

> Temporadas, equipos y jugadores cuelgan del club (`/clubes/{club_id}/...`) y exigen ser **miembro activo** del club (dependencia `require_member`).

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
| GET | `/usuarios/me` | 🔒 Perfil del usuario autenticado |
| PATCH | `/usuarios/me` | 🔒 Editar el propio perfil (no permite tocar `activo`) |
| GET | `/usuarios/{id}` | Obtener usuario por ID |
| PATCH | `/usuarios/{id}` | Actualizar usuario (parcial) |
| DELETE | `/usuarios/{id}` | Desactivar usuario (soft delete: `activo = false`) |

🔒 = requiere `Authorization: Bearer <access_token>`.

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

---

### Clubes

Gestión de la tabla `clubes` y su relación con los usuarios (`club_usuarios`). **Todos los endpoints requieren autenticación.**

Al crear un club, el usuario autenticado se inserta automáticamente en `club_usuarios` con rol `GESTOR_CLUB` (en una única transacción atómica). Solo un gestor puede editar o desactivar el club.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/clubes` |  Crear club (el creador queda como `GESTOR_CLUB`) |
| GET | `/clubes` |  Listar los clubes del usuario autenticado (incluye su `rol`) |
| GET | `/clubes/{id}` |  Obtener un club (solo si es miembro) |
| PATCH | `/clubes/{id}` |  Editar club (solo `GESTOR_CLUB`) |
| DELETE | `/clubes/{id}` |  Desactivar club, soft delete (solo `GESTOR_CLUB`) |

**Body `POST /clubes`**
```json
{
  "nombre": "Balonmano Ejemplo",
  "slug": "balonmano-ejemplo",
  "ciudad": "Madrid",
  "pais": "España",
  "logo_url": null,
  "color_primario": "#0055A4",
  "color_secundario": "#FFFFFF"
}
```
> `slug` debe ser url-friendly: minúsculas, números y guiones (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).

**Respuesta `GET /clubes`** (lista, cada item incluye el rol del usuario):
```json
[
  {
    "id": "uuid",
    "nombre": "Balonmano Ejemplo",
    "slug": "balonmano-ejemplo",
    "ciudad": "Madrid",
    "pais": "España",
    "logo_url": null,
    "color_primario": "#0055A4",
    "color_secundario": "#FFFFFF",
    "activo": true,
    "creado_en": "2026-06-30T10:45:39Z",
    "actualizado_en": "2026-06-30T10:45:39Z",
    "rol": "GESTOR_CLUB"
  }
]
```

**Códigos de error**
| Código | Causa |
|--------|-------|
| 401 | Falta token o es inválido |
| 403 | El usuario no es `GESTOR_CLUB` del club |
| 404 | Club no encontrado o el usuario no es miembro |
| 409 | El slug ya está en uso |
| 422 | Validación fallida (slug con formato inválido…) |

---

### Temporadas

Sub-recurso del club. `🔒` miembro del club. Una temporada agrupa equipos, jugadores y partidos.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/clubes/{club_id}/temporadas` | Crear temporada |
| GET | `/clubes/{club_id}/temporadas` | Listar temporadas del club |
| GET | `/clubes/{club_id}/temporadas/{id}` | Obtener temporada |
| PATCH | `/clubes/{club_id}/temporadas/{id}` | Editar (incluye flag `activa`) |

**Body `POST`**: `{ "nombre": "2026/27", "fecha_inicio": "2026-09-01", "fecha_fin": "2027-06-30", "activa": true }`
Constraints: `nombre` único por club (409); `fecha_inicio <= fecha_fin` (422).

---

### Equipos

Sub-recurso del club. **Un equipo pertenece a un club Y a una temporada** (ambos obligatorios). `tipo`: `PROPIO` | `RIVAL`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/clubes/{club_id}/equipos` | Crear equipo (valida que la temporada sea del club) |
| GET | `/clubes/{club_id}/equipos` | Listar (filtros: `?temporada_id=`, `?tipo=`) |
| GET | `/clubes/{club_id}/equipos/{id}` | Obtener equipo |
| PATCH | `/clubes/{club_id}/equipos/{id}` | Editar equipo |
| DELETE | `/clubes/{club_id}/equipos/{id}` | Desactivar (soft delete) |

**Body `POST`**:
```json
{
  "temporada_id": "uuid",
  "nombre": "Senior Masculino",
  "nombre_corto": "SEN-M",
  "categoria": "SENIOR",
  "genero": "MASCULINO",
  "tipo": "PROPIO"
}
```
`categoria`: SENIOR·JUVENIL·CADETE·INFANTIL·ALEVIN·BENJAMIN·OTRO · `genero`: MASCULINO·FEMENINO·MIXTO.
Único `(club, temporada, nombre)` → 409.

#### Plantilla (jugadores ↔ equipo)

Asigna jugadores **ya existentes en el club** a un equipo. La temporada se hereda automáticamente del equipo.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/clubes/{club_id}/equipos/{equipo_id}/jugadores` | Asignar jugador al equipo |
| GET | `/clubes/{club_id}/equipos/{equipo_id}/jugadores` | Listar plantilla (asignación + datos del jugador) |
| PATCH | `/clubes/{club_id}/equipos/{equipo_id}/jugadores/{jugador_id}` | Editar dorsal / tipo / disponibilidad |
| DELETE | `/clubes/{club_id}/equipos/{equipo_id}/jugadores/{jugador_id}` | Quitar de la plantilla (soft delete) |

**Body `POST`**: `{ "jugador_id": "uuid", "dorsal": 7, "tipo_asignacion": "PRINCIPAL" }`
`dorsal` 0–99 · `tipo_asignacion`: PRINCIPAL·REFUERZO·DISPONIBLE. El jugador debe ser del club (422); no se puede duplicar `(jugador, equipo, temporada)` (409).

---

### Jugadores

Sub-recurso del club. **El jugador pertenece al club, no al equipo** (se asigna a equipos vía la plantilla). `tipo`: `PROPIO` | `RIVAL` (rivales para scouting).

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/clubes/{club_id}/jugadores` | Crear jugador |
| GET | `/clubes/{club_id}/jugadores` | Listar (filtros: `?tipo=`, `?activo=`) |
| GET | `/clubes/{club_id}/jugadores/{id}` | Obtener jugador |
| PATCH | `/clubes/{club_id}/jugadores/{id}` | Editar jugador |
| DELETE | `/clubes/{club_id}/jugadores/{id}` | Desactivar (soft delete) |

**Body `POST`**:
```json
{
  "nombre": "Ana",
  "apellidos": "López",
  "fecha_nacimiento": "2001-04-12",
  "mano_dominante": "DERECHA",
  "posicion_principal": "CENTRAL",
  "altura_cm": 178,
  "peso_kg": 72
}
```
`posicion_*`: PORTERO·EXTREMO_IZQUIERDO·EXTREMO_DERECHO·LATERAL_IZQUIERDO·LATERAL_DERECHO·CENTRAL·PIVOTE·UNIVERSAL · `mano_dominante`: DERECHA·IZQUIERDA·AMBAS·DESCONOCIDA. `altura_cm`/`peso_kg` > 0.
