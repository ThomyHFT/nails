# SPEC 12 — Panel de superadmin

**Estado:** Implemented
**Alcance:** panel `/admin` para el dueño del producto: ver profesionales, activar/desactivar cuentas, extender período de prueba, generar y listar códigos de invitación. Cierra el hueco que el SPEC 11 dejó abierto a propósito ("cuando haya ~20 tenants, el panel será su propio spec").

Hoy toda operación pasa por `npm run db:studio`: generar un código, extender un `trial_ends_at`, apagar un `active` abusivo. Funciona, pero cada alta es una sesión de terminal contra la base de producción. Este spec reemplaza eso por una UI mínima, sin construir facturación ni un sistema de roles genérico.

---

## 1. Decisiones de diseño

### 1.1 Rol `admin` nuevo en el enum

`userRoleEnum` pasa de `["client", "professional"]` a `["client", "professional", "admin"]`. Migración aditiva (agregar valor a un enum de Postgres no rompe filas existentes).

La alternativa —gatear por una lista de correos en variable de entorno— evita la migración pero crea un segundo mecanismo de autorización paralelo a los guards existentes (`requireProfessional`, `requireTenantOwner`). Con el rol en el enum, `requireAdmin` es el mismo patrón que ya existe en `src/server/interface`, no uno nuevo. Un solo dueño hoy, pero el guard no le importa cuántos haya.

Un usuario `admin` no tiene fila en `professionals`: es cuenta pura de acceso, se crea a mano con `db:studio` (bcrypt del hash, igual que hoy). No hay auto-registro de admins — coherente con que el SPEC 11 tampoco lo contempla.

### 1.2 `/admin` es la ruta, ya está reservada

`reserved-slugs.ts` (SPEC 11) ya bloquea `admin` como slug de tenant. La ruta estática `src/app/admin/` gana sobre `[slug]` en el router de Next, mismo mecanismo que `/registro-profesional`.

### 1.3 Qué hace el panel y qué no

Cuatro acciones, todas ya descritas como operación manual en el SPEC 11 §6:

| Acción | Reemplaza |
| --- | --- |
| Listar profesionales con su estado (activo, publicado, prueba) | `SELECT` a mano en `db:studio` |
| Activar / desactivar (`professionals.active`) | `UPDATE` a mano |
| Extender `trial_ends_at` (+7/+30 días, o quitar vencimiento) | `UPDATE` a mano |
| Generar código de invitación (con nota y vencimiento opcional) | `INSERT` a mano |

Fuera: editar catálogo o servicios de un tenant ajeno, eliminar una cuenta, facturación, métricas. El dueño sigue sin necesitar impersonar a una profesional — si hace falta debuguear su panel, entra por `db:studio` como hasta ahora.

### 1.4 Sin sofisticación: tabla y formularios, sin dashboard

Una sola página con dos secciones (profesionales, códigos), primitivas `AdminPageHeader` + `Panel` para la estructura, `Button`/`Input`/`Table` de shadcn para las filas y formularios — mismo criterio que el resto del admin (CLAUDE.md: "shadcn queda para los formularios densos del admin"). Sin paginación (no hay volumen que la justifique todavía), sin filtros, sin gráficos.

---

## 2. Esquema

### 2.1 `user_role` enum — un valor nuevo

```
ALTER TYPE user_role ADD VALUE 'admin';
```

Sin columnas nuevas. `professionals` y `invite_codes` ya tienen todo lo que este panel necesita (SPEC 11).

---

## 3. Dominio y aplicación

### 3.1 Guard — `src/server/interface/guards/require-admin.ts`

Mismo patrón que `requireTenantOwner`: lee la sesión, verifica `role === "admin"`, si no `redirect` a `/login`. Sin lógica de tenant (el admin no tiene `professional_id`).

### 3.2 Casos de uso — `src/server/application/admin/`

- `list-professionals.use-case.ts`: trae todas las filas de `professionals` con `active`, `trialEndsAt`, `publishedAt`, `slug`, `businessName`, `createdAt`. Lectura simple, sin paginación.
- `toggle-professional-active.use-case.ts`: flip de `active`. Sin validación de negocio adicional — es un booleano.
- `extend-trial.use-case.ts`: recibe `professionalId` y `days | null` (`null` = sin vencimiento). Si `days` es un número, `trial_ends_at = greatest(now, trial_ends_at actual) + days`, para que extender no pierda días ya otorgados si se hace antes del vencimiento.
- `create-invite-code.use-case.ts`: recibe `note?`, `expiresInDays?`. Genera `code` legible (ej. `crypto.randomBytes` a base32, 8 caracteres, sin caracteres ambiguos) y lo inserta. Reutiliza el mismo repositorio de `invite_codes` que ya existe del SPEC 11.
- `list-invite-codes.use-case.ts`: trae todos los códigos con su estado (usado / vigente / vencido), calculado en la función pura `inviteCodeStatus(code, now)` en domain — mismo criterio de "una función decide, nadie la reimplementa" que `canPublish` del SPEC 11.

### 3.3 Puertos

Los repositorios ya existen (`ProfessionalRepositoryPort`, el de `invite_codes` del SPEC 11); si falta un método (`findAll`, `update` parcial), se agrega ahí, no un repositorio paralelo.

---

## 4. API

Todas bajo `src/app/api/admin/*`, protegidas por `requireAdmin` en cada route handler (guards de `interface/` no aplican solos a route handlers — se llaman explícitamente, mismo patrón que el resto del admin).

| Método y ruta | Acción |
| --- | --- |
| `GET /api/admin/professionals` | listar (o Server Component directo, ver 5.1) |
| `PATCH /api/admin/professionals/[id]/active` | `{ active: boolean }` |
| `PATCH /api/admin/professionals/[id]/trial` | `{ days: number \| null }` |
| `POST /api/admin/invite-codes` | `{ note?: string, expiresInDays?: number }` → código creado |
| `GET /api/admin/invite-codes` | listar (o Server Component directo) |

Las dos lecturas (`GET`) pueden resolverse directo en el Server Component de `/admin` vía `application/*`, sin pasar por route handler — regla del CLAUDE.md ("un Server Component puede importar `application/*` para lecturas simples"). Las escrituras si van por route handler.

---

## 5. UI

### 5.1 `/admin`

Página protegida por `requireAdmin`. Dos `Panel` en columna:

**Profesionales** — tabla: negocio, slug (link a `/[slug]`), estado (`Activo` / `Inactivo`, `Publicado` / `Sin publicar`), días de prueba restantes (o "sin vencimiento"), y por fila: toggle activo/inactivo, botón "+7 días" / "+30 días" / "quitar vencimiento".

**Códigos de invitación** — formulario arriba (nota opcional, vencimiento opcional en días) que crea uno nuevo y lo muestra para copiar; tabla abajo con todos los códigos existentes y su estado (vigente / usado por *tal profesional* / vencido).

Sin navegación cruzada hacia el panel de una profesional específica — el admin no impersona.

---

## 6. Criterios de aceptación

1. Un usuario con `role = "admin"` entra a `/admin` y ve la lista completa de profesionales.
2. Un usuario `client` o `professional` que visita `/admin` es redirigido a `/login`, sin ver contenido.
3. Desactivar una profesional desde el panel hace que su micrositio público deje de verse (mismo `active` que ya consume `GetProfessionalBySlugUseCase`).
4. Extender el trial suma días desde el mayor entre "ahora" y el vencimiento actual, nunca resta días ya otorgados.
5. Generar un código de invitación lo deja disponible de inmediato en `/registro-profesional`.
6. Un código usado o vencido se ve marcado como tal en la tabla, sin necesitar refrescar cálculos a mano.
7. `admin` sigue sin poder registrarse solo — se crea únicamente por `db:studio`.

---

## 7. Fuera de alcance

Impersonar el panel de una profesional, editar su catálogo o servicios, eliminar cuentas, métricas o dashboard de negocio, multi-admin con permisos distintos, auto-registro de admins, facturación.
