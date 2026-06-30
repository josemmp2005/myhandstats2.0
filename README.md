# MyHandStats 2.0

Plataforma SaaS para clubes de balonmano: gestión de clubes/temporadas/equipos/jugadores/partidos, toma de estadísticas en directo y dashboards de análisis en tiempo real.

> Este documento es la fuente de verdad de producto y diseño para el desarrollo del frontend. Se actualiza a medida que avanza el proyecto. Sirve para que cualquier sesión de trabajo (humana o asistida por IA) recupere el contexto completo sin tener que releer el hilo original.

## Estado actual del repositorio

**Greenfield.** A fecha 2026-06-29 el directorio del proyecto está vacío (no hay `package.json`, no hay git inicializado, no hay Next.js/Tailwind/shadcn instalados). Todo lo descrito en este documento es el plan a implementar, no el estado actual del código.

Antes de escribir cualquier pantalla habrá que:
1. Inicializar git.
2. Bootstrap Next.js (App Router) + TypeScript.
3. Instalar y configurar Tailwind CSS.
4. Instalar shadcn/ui y los componentes base necesarios.
5. Definir estructura de carpetas (ver más abajo).

No se debe conectar a un backend real todavía — todo con datos mock bien tipados, diseñado para enchufar luego a una API FastAPI.

## Visión de producto

MyHandStats2.0 tiene dos grandes zonas funcionales:

### 1. Club Manager
Gestión administrativa y de contenido del club:
- Clubes
- Temporadas
- Equipos propios / Equipos rivales (los rivales son reutilizables dentro de una temporada, no se duplican por partido)
- Jugadores propios / Jugadores rivales
- Partidos
- Informes
- Estadísticas agregadas

### 2. Match Live Stats
Toma de estadísticas durante un partido en tiempo real, **optimizada para tablet**, con captura rápida de acciones de juego y un dashboard de análisis en vivo.

La identidad visual debe transmitir: velocidad, control, datos, decisión táctica. Nada de "dashboard administrativo genérico". Referencia: herramientas de análisis de rendimiento deportivo, no SaaS corporativo.

## MVP 1 — Alcance

Primer alcance funcional acordado. Todo lo que no esté aquí (informes, IA, analítica avanzada, multi-club, etc.) queda fuera de MVP1 y se retoma en fases posteriores.

| # | Requisito | Dónde vive |
|---|---|---|
| 1 | Login básico | `/login` |
| 2 | Gestión de usuarios | `/usuarios` (solo Admin) |
| 3 | Gestión de club | `/club` |
| 4 | Gestión de temporadas | `/temporadas` |
| 5 | Gestión de equipos propios y rivales | `/equipos` |
| 6 | Gestión de jugadores propios y rivales | `/jugadores` |
| 7 | Relación jugador-equipo | Desde ficha de jugador o de equipo (alta/baja de relación) |
| 8 | Creación de partidos | `/partidos/nuevo` |
| 9 | Convocatoria de partido | `/partidos/[partidoId]/convocatoria` |
| 10 | Toma de estadísticas en directo | `/partidos/[partidoId]/live` |
| 11 | Dos modos de toma de datos | `EQUIPO_PROPIO` / `SCOUTING_COMPLETO` (ver sección dedicada) |
| 12 | Registro de eventos | Parte de Live Stats (`EventTimeline` + `ActionButton`) |
| 13 | Corrección / eliminación lógica de eventos | Editar/anular evento desde `EventTimeline` (borrado lógico, nunca físico) |
| 14 | Dashboard básico de partido | `/partidos/[partidoId]/dashboard` (versión reducida vs. visión completa) |
| 15 | Estadísticas básicas por equipo y jugador | Integradas en la ficha de equipo (`/equipos/[equipoId]`) y de jugador (`/jugadores/[jugadorId]`), no como página aparte |

### Roles de usuario (MVP1)

Definidos en el ENUM `rol_club` del esquema PostgreSQL:

- **`GESTOR_CLUB`**: control total del club. Gestiona usuarios, club, temporadas, todos los equipos, todos los jugadores, todos los partidos. Acceso global vía `club_usuarios`.
- **`ENTRENADOR`**: control completo (CRUD) solo de los equipos asignados — jugadores, partidos, convocatorias, live stats y dashboard de esos equipos. Sin gestión de usuarios, club ni temporadas.
- **`AYUDANTE`**: acceso únicamente a la parte de partido (Live Stats + dashboard de partido) de los equipos asignados. Sin gestión de jugadores, equipos ni convocatorias.
- **`ANALISTA`**: rol adicional presente en el esquema. Alcance a definir en iteraciones futuras.

La relación usuario–club global es `club_usuarios` (rol general en el club). La asignación específica a equipos es `equipo_usuarios` N:M — un usuario puede estar asignado a varios equipos con fechas de vigencia.

### Decisiones de alcance tomadas

- **Convocatoria de partido**: alcance mínimo para MVP1 — solo `convocado` / `no convocado` por jugador. Titularidad, dorsal de partido y capitán quedan para una fase posterior.
- **Portal de entrada**: la tarjeta "Informes e IA" **se retira** del portal en MVP1 (no forma parte del alcance). El portal muestra solo **Club Manager** y **Match Live Stats**. Se reincorporará cuando exista esa funcionalidad.
- **Relación jugador-equipo**: se permite **doble ficha** — un jugador puede pertenecer a más de un equipo propio a la vez dentro de la misma temporada (ej. juvenil que también entrena con el senior). Es una relación N:M, no 1:1.

## Modos de toma de datos

Concepto central del producto. Todo el diseño de la pantalla Live debe dejar este contraste muy claro.

### `EQUIPO_PROPIO`
- Solo se selecciona y gestiona plantilla **propia**.
- El rival se registra **indirectamente**, nunca seleccionando jugadores rivales (no hace falta cargar su plantilla).
- Ejemplos de mapeo:
  - Nuestro portero **recibe gol** → se contabiliza como **gol del rival**.
  - Nuestro portero **hace parada** → se contabiliza como **lanzamiento fallado del rival**.
- Prioriza UI simple y muy rápida: gol propio, lanzamiento propio, pérdida propia, parada de nuestro portero, gol recibido, exclusión propia, 7m provocado, 7m cometido.
- Caso de uso: equipos que solo quieren analizarse a sí mismos sin invertir tiempo en scouting del rival.

### `SCOUTING_COMPLETO`
- Se registran acciones de **ambos equipos** explícitamente.
- La UI debe permitir alternar claramente entre "Nuestro equipo" / "Rival" (selector de contexto siempre visible).
- Al seleccionar un equipo aparecen sus jugadores reales.
- Soporta: lanzamientos y goles de ambos equipos, paradas de ambos porteros, asistencias, pérdidas, zonas de lanzamiento (`CourtMap`), fases del juego, situación numérica.
- Caso de uso: análisis táctico completo, informes de scouting del rival.

El selector de modo (`ModeSelector`), usado en "Crear partido", debe explicar visualmente la diferencia — no un simple toggle sin contexto.

## Acciones de juego (vocabulario de dominio)

Lanzamiento, Gol, Parada, Pérdida, Robo, Blocaje, Asistencia, 7 metros, Exclusión, Tiempo muerto, Cambio, Pasivo.

Nombres de dominio en español (mantener consistencia: `partido`, `jugador`, `equipo`, `rival`, `propio`, `temporada`, `club`, `informe`, `lanzamiento`, `parada`, `exclusión`, `pérdida`, `robo`, `blocaje`, `pasivo`).

## Entidades de dominio (esquema real PostgreSQL)

Fuente de verdad: [sql.sql](sql.sql). Resumen de las tablas y su propósito para el frontend. Los mocks de TypeScript deben tener la misma forma que devolvería la API FastAPI.

### Tablas principales

| Tabla | Propósito |
|---|---|
| `usuarios` | Personas que acceden a la plataforma. Sin `club_id`/`rol` propios — esos van en `club_usuarios`. |
| `clubes` | Entidad raíz. Tiene `slug`, `ciudad`, `pais`, `logo_url`, `color_primario`, `color_secundario`. |
| `club_usuarios` | N:M usuario–club con `rol` (`GESTOR_CLUB` / `ENTRENADOR` / `AYUDANTE` / `ANALISTA`). Rol global dentro del club. |
| `temporadas` | Por club. Con `fecha_inicio`, `fecha_fin`, `activa`. Constraint: nombre único por club. |
| `equipos` | Por club + temporada. `tipo` = `PROPIO` \| `RIVAL`. Los rivales son reutilizables en la misma temporada. Tiene `nombre_corto`, `logo_url`. |
| `equipo_usuarios` | N:M usuario–equipo + temporada con `rol` y `fecha_inicio`/`fecha_fin`. Para asignar entrenadores/ayudantes/analistas a equipos concretos. |
| `jugadores` | Por club (no por equipo directo). `tipo` = `PROPIO` \| `RIVAL`. Tiene `apellidos`, `fecha_nacimiento`, `posicion_principal`, `posicion_secundaria`, `altura_cm`, `peso_kg`, `foto_url`. **El dorsal va en `jugadores_equipos`, no aquí.** |
| `jugadores_equipos` | N:M jugador–equipo–temporada. `dorsal`, `equipo_principal` (boolean), `tipo_asignacion` (`PRINCIPAL` / `REFUERZO` / `DISPONIBLE`), `fecha_inicio`/`fecha_fin`. Permite doble ficha. |
| `competiciones` | Por club + temporada. `nombre`, `categoria`, `nivel`. Se selecciona al crear partido (opcional). |
| `partidos` | Tiene `equipo_id` (nuestro equipo), `rival_equipo_id` (nullable si `EQUIPO_PROPIO`), `rival_nombre` (histórico, no cambia si el rival se renombra), `modo_toma_datos`, `estado`, `goles_equipo`, `goles_rival`. Constraint: `SCOUTING_COMPLETO` exige `rival_equipo_id NOT NULL`. |
| `convocatorias_partido` | Jugadores convocados para un partido concreto. La presencia de fila = convocado. Campos: `dorsal`, `posicion`, `titular`, `es_portero`, `capitan`, `disponible`. |
| `eventos_partido` | Tabla principal de stats. Ver detalle abajo. |
| `correcciones_evento_partido` | Trazabilidad de correcciones: `datos_anteriores` + `datos_nuevos` JSONB, `motivo`. Nunca se borra, solo se corrige. |
| `estadisticas_equipo_partido` | Agregados pre-calculados por equipo + partido (`goles`, `lanzamientos`, `paradas`, `perdidas`, `eficacia_ataque`, etc. + `desglose` JSONB). El dashboard los lee de aquí, no en tiempo real desde eventos. |
| `estadisticas_jugador_partido` | Ídem por jugador + equipo + partido. |
| `informes` | Fuera de MVP1. En esquema pero sin UI por ahora. |
| `conversaciones_ia` / `mensajes_ia` | Fuera de MVP1. |

### Detalle: `eventos_partido`

Es la tabla central del sistema. Cada acción del partido es una fila:

- `origen`: `EQUIPO_PROPIO` | `RIVAL` — a qué equipo pertenece la acción.
- `equipo_id`: equipo que actúa (puede ser `NULL` en modo `EQUIPO_PROPIO` para acciones rivales indirectas).
- `jugador_id`, `jugador_asistencia_id`, `portero_id`: todos opcionales.
- `jugador_texto`: texto libre para dorsal/referencia de jugador rival sin ficha (ej. `"#7 rival"`).
- `periodo`: `PRIMERA_PARTE` | `SEGUNDA_PARTE` | `PRORROGA_1` | `PRORROGA_2` | `PENALTIS`.
- `tiempo_ms`: tiempo del partido en milisegundos.
- `goles_equipo` / `goles_rival`: snapshot del marcador en el momento del evento.
- `tipo`: acción (ver ENUM `tipo_evento` — 24 tipos).
- `fase`, `situacion_numerica`, `sistema_ataque`, `sistema_defensa`: contexto táctico.
- `tipo_lanzamiento`, `resultado_lanzamiento`, `resultado`: detail de lanzamiento.
- `campo_x`, `campo_y`: coordenadas normalizadas 0–100 para el `CourtMap`.
- `zona_campo`, `zona_porteria`: enums de zona (13 zonas de campo, 9 zonas de portería).
- `metadata`: JSONB para extender sin cambiar esquema.
- `eliminado` (boolean): **soft delete**. Flag de eliminación lógica — nunca se borra físicamente. Los filtros de stats excluyen `WHERE eliminado = FALSE`.
- `corregido` (boolean): marca que el evento fue modificado (ver `correcciones_evento_partido`).
- `id_local` + `dispositivo_id` + `sincronizado_en`: soporte de **sincronización offline** desde tablet. El frontend puede registrar eventos sin conexión y sincronizar después. MVP1 no implementa offline completo, pero el modelo ya lo soporta.

### Convocatoria: alineación UI vs esquema

El esquema `convocatorias_partido` ya tiene `titular`, `es_portero`, `capitan` aunque el MVP1 acordó "convocatoria mínima". Criterio de compromiso:

- **UI MVP1 expone**: `disponible` (convocado o no) + **`es_portero`** (necesario para Live Stats — distinguir quién para las paradas/goles recibidos).
- **Titular/capitán**: campos en DB, ocultos en UI por ahora.
- Si hay tiempo: añadir `titular` toggle en la misma pantalla sin coste extra.

### Competiciones: ruta pendiente

`competiciones` no estaba en los 15 requisitos MVP1 pero es FK en `partidos`. Solución MVP1: gestión inline desde "Crear partido" (crear competición al vuelo con solo `nombre`) o seleccionar de un listado ligero. **No hace falta ruta `/competiciones` independiente para MVP1** salvo que el volumen de competiciones lo justifique.

## Stack objetivo

- Next.js (App Router)
- TypeScript estricto
- Tailwind CSS
- shadcn/ui (si se instala, no reinventar primitives que ya cubra)
- Componentes reutilizables, archivos pequeños (evitar archivos gigantes)
- Cliente API preparado para FastAPI, pero no conectado todavía (datos mock con la misma forma que tendría la respuesta real)

## Dirección visual

**No genérico.** SaaS deportivo premium: táctico, tecnológico, limpio. Nada de plantilla de admin dashboard plana.

### Paleta (punto de partida, se puede afinar)
- Fondo principal: gris azulado muy claro / slate suave.
- Superficies: blanco, blanco roto, o azul muy oscuro según contexto (ej. modo partido).
- Color principal: azul petróleo / navy deportivo.
- Color secundario: cyan / azul eléctrico discreto.
- Éxito: verde lima / verde pista.
- Alerta: naranja intenso.
- Error / rival / peligro: rojo coral.
- Neutro: slate.

La pantalla de toma de estadísticas (Live Stats) puede usar una estética más oscura ("modo partido") para maximizar contraste y concentración bajo luz de pabellón / uso en tablet.

### Tipografía y estilo
- Sans-serif moderna, jerarquía visual fuerte.
- Métricas grandes y legibles (números de marcador, porcentajes).
- Botones grandes en pantallas de partido (uso táctil en tablet, bajo presión de tiempo real).
- Tarjetas con profundidad sutil, bordes redondeados consistentes.
- Microinteracciones suaves, estados hover/focus cuidados, buen contraste, accesibilidad correcta (no solo color para distinguir propio/rival, también texto/icono).

## Componentes reutilizables a construir

`AppShell`, `Sidebar`, `Topbar`, `PageHeader`, `MetricCard`, `StatCard`, `PlayerCard`, `PlayerTable`, `TeamCard`, `MatchCard`, `ModeSelector`, `Scoreboard`, `MatchClock`, `ActionButton`, `CourtMap`, `EventTimeline`, `LiveStatsPanel`, `ShotMap`, `EmptyState`, `LoadingState`.

`CourtMap`: representación estilizada de pista de balonmano con zonas: extremo izquierdo, lateral izquierdo 9m, central 9m, lateral derecho 9m, extremo derecho, zona pivote, 6m izquierda, 6m centro, 6m derecha, 7m. No requiere precisión geométrica perfecta, sí debe ser reconocible y usable (clicable/seleccionable por zona).

## Mapa de rutas (App Router)

| Ruta | Pantalla |
|---|---|
| `/login` | Login |
| `/portal` | Portal de entrada (MVP1: 2 tarjetas — Club Manager, Match Live Stats) |
| `/dashboard` | Dashboard Club Manager |
| `/usuarios` | Gestión de usuarios (solo Admin) |
| `/club` | Gestión de club |
| `/temporadas` | Gestión de temporadas |
| `/jugadores` | Gestión de jugadores |
| `/jugadores/[jugadorId]` | Ficha de jugador + estadísticas básicas |
| `/equipos` | Gestión de equipos |
| `/equipos/[equipoId]` | Ficha de equipo + estadísticas básicas |
| `/partidos/nuevo` | Crear partido |
| `/partidos/[partidoId]` | Detalle de partido |
| `/partidos/[partidoId]/convocatoria` | Convocatoria de partido |
| `/partidos/[partidoId]/live` | Toma de estadísticas en directo (tablet) |
| `/partidos/[partidoId]/dashboard` | Dashboard de partido en tiempo real |

## Detalle por pantalla

### Login
Branding "MyHandStats2.0", claim "Análisis en tiempo real para clubes de balonmano", form email/password, CTA principal, fondo abstracto deportivo (sin depender de imágenes externas), estética premium.

### Portal de entrada
MVP1: 2 tarjetas grandes (Club Manager / Match Live Stats) — "Informes e IA" queda fuera de alcance y se retira del portal por ahora. Cada tarjeta con icono, título, descripción, CTA y una métrica/detalle contextual (ej. "3 partidos esta semana"). El acceso a cada tarjeta respeta el rol del usuario (un Ayudante, por ejemplo, entra directo a Match Live Stats de sus equipos asignados).

### Dashboard Club Manager
Sidebar + topbar. Muestra: club activo, temporada activa, próximo partido, equipos activos, jugadores activos, partidos registrados, informes recientes, accesos rápidos (crear partido, jugadores, equipos). Contenido visible filtrado por rol (Admin ve todo el club; Entrenador/Ayudante ven solo sus equipos asignados).

### Gestión de usuarios
Solo accesible para Admin. Tabla de usuarios del club con nombre, email, rol (`Admin` / `Entrenador` / `Ayudante`) y, para Entrenador/Ayudante, los equipos asignados (`UsuarioEquipo`). Alta/baja de usuario y edición de rol y equipos asignados.

### Gestión de club
Datos básicos del club (nombre, etc.). Pantalla simple, probablemente un formulario único más que un listado.

### Gestión de temporadas
Listado de temporadas del club (ej. `2026/27`), con la temporada activa destacada. Alta de nueva temporada, marcar como activa.

### Gestión de jugadores
Tabla/grid con filtros (equipo, posición, tipo, estado). Diferenciar visualmente `PROPIO` vs `RIVAL`. Botón "Crear jugador". Cards: nombre, dorsal, posición, mano dominante, equipo(s) — un jugador puede mostrar más de un equipo si tiene doble ficha —, tipo. Click en jugador → `/jugadores/[jugadorId]` con ficha y estadísticas básicas (goles, lanzamientos, eficacia, etc.) y gestión de sus relaciones `JugadorEquipo` (añadir/quitar equipo).

### Gestión de equipos
Separar propios/rivales. Categoría, género, temporada, nº jugadores, badge `PROPIO`/`RIVAL`. Dejar claro que los rivales son reutilizables dentro de la temporada (no se duplican). Click en equipo → `/equipos/[equipoId]` con plantilla (vía `JugadorEquipo`, puede incluir jugadores con doble ficha) y estadísticas básicas del equipo.

### Crear partido
Selector de equipo propio, selector/creación rápida de rival, fecha/hora, pabellón, localización (local/visitante/neutral), competición, selector de modo (`EQUIPO_PROPIO` / `SCOUTING_COMPLETO`) con explicación visual de la diferencia. Al guardar, lleva a la convocatoria del partido recién creado.

### Convocatoria de partido
Lista de la plantilla del equipo propio (incluye jugadores con doble ficha) con un toggle `convocado` / `no convocado` por jugador. Alcance mínimo MVP1: sin titularidad ni dorsal de partido. Solo los jugadores convocados aparecen disponibles en Live Stats.

### Live Stats (pantalla más importante, optimizada para tablet)
- **Arriba:** marcador grande (`Scoreboard`), cronómetro grande (`MatchClock`), propio vs rival, estado del partido, pausa, deshacer última acción.
- **Centro:** selector de modo si procede, fase de juego, situación numérica, sistema ataque/defensa, `CourtMap` interactivo.
- **Lateral/inferior:** jugadores en pista, botones de acción grandes y diferenciados (`ActionButton`), historial de últimos eventos (`EventTimeline`).
- En `EQUIPO_PROPIO`: prioriza jugadores y acciones propias, parada de nuestro portero, gol recibido.
- En `SCOUTING_COMPLETO`: selector explícito Nuestro equipo / Rival siempre visible.
- Solo se listan jugadores con fila en `convocatorias_partido` (presencia = convocado) + `disponible = true`.
- Cada evento en `EventTimeline` es editable/anulable: eliminación lógica vía `eliminado = true` (nunca físico). Las correcciones generan fila en `correcciones_evento_partido` con `datos_anteriores` / `datos_nuevos` para trazabilidad completa.

### Dashboard de partido en tiempo real
Goles, lanzamientos, eficacia de lanzamiento, pérdidas, paradas, % de parada, goles recibidos por zona, eficacia por fase, parcial de últimos minutos, alertas tácticas generadas a partir de los datos (ej. "El rival ha marcado 4 de sus últimos 5 lanzamientos desde extremo derecho").

## Datos mock de referencia

Los mocks deben respetar los tipos del esquema PostgreSQL para que el reemplazo por llamadas reales a FastAPI sea un simple cambio de fuente de datos.

- **Club**: `BM Ciudad`, `slug: "bm-ciudad"`, con `color_primario` y `color_secundario` definidos.
- **Temporada activa**: `2026/27`.
- **Equipo propio**: `Senior Masculino` (`tipo: PROPIO`, `categoria: SENIOR`, `genero: MASCULINO`).
- **Equipo rival**: `BM Norte Senior` (`tipo: RIVAL`) — reutilizable en varios partidos de la temporada.
- **Competición**: `Liga Territorial 2026/27`.
- **Jugadores propios**: al menos 16 (dorsal 1–16) con posiciones variadas, incluido al menos 1 portero.
- **Jugadores rivales**: al menos 6–8 (para modo `SCOUTING_COMPLETO`).
- **`jugadores_equipos`**: con `tipo_asignacion`, `equipo_principal`, `dorsal` por equipo.
- **Partido de ejemplo**: en estado `EN_DIRECTO` (para probar Live Stats) con `modo_toma_datos: EQUIPO_PROPIO`.
- **Convocatoria del partido**: 14 jugadores convocados, 2 porteros marcados con `es_portero: true`.
- **Eventos recientes**: 10–15 eventos con `tiempo_ms`, `origen`, `tipo`, `resultado_lanzamiento`, `zona_campo`, `goles_equipo`/`goles_rival` snapshot.
- **`estadisticas_equipo_partido`**: fila precalculada para el partido de ejemplo.
- **`estadisticas_jugador_partido`**: filas por jugador convocado.
- **Usuarios mock**: 1 `GESTOR_CLUB`, 1 `ENTRENADOR` (asignado al Senior Masculino), 1 `AYUDANTE`.

## Reglas de implementación

1. Inspeccionar estructura antes de modificar (aplica tanto a este bootstrap inicial como a cambios futuros).
2. No romper estructura existente.
3. Diseño funcional primero, con datos mock bien tipados.
4. Componentes reutilizables, archivos pequeños.
5. TypeScript estricto.
6. Nombres de dominio en español.
7. Sin conexión a backend real salvo que ya exista cliente configurado (hoy no existe).
8. Sin dependencias innecesarias.

## Criterios de aceptación

- El frontend arranca sin errores.
- Las páginas principales cargan correctamente.
- El diseño no parece una plantilla genérica de dashboard.
- Live Stats está claramente optimizada para tablet.
- Se diferencian visualmente equipos/jugadores propios vs rivales.
- Los modos `EQUIPO_PROPIO` y `SCOUTING_COMPLETO` se entienden a simple vista.
- Componentes reutilizables, código ordenado y fácil de continuar.
- Experiencia visual a la altura de una plataforma real de análisis deportivo.

## Cómo arrancar (pendiente de bootstrap)

_Esta sección se completará en cuanto exista el proyecto Next.js inicializado._

## Próximos pasos

Alcance de MVP1 cerrado (ver sección "MVP 1 — Alcance"). Por petición explícita del usuario, **todavía no se ha escrito código** — esta fase es solo de definición/documentación. Pendiente de luz verde para arrancar la implementación: bootstrap del proyecto (Next.js + TS + Tailwind + shadcn/ui) y primeras pantallas.
