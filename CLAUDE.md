# Contexto del proyecto

App de agendamiento para manicuristas. Multi-tenant por path (`/[slug]`), una profesional por tenant, clientas reservan hora y diseñan sus uñas. Español, CLP, `America/Santiago`. Pago presencial, sin pagos en línea.

## Stack

Next.js (App Router, TypeScript, `src/`) · Drizzle ORM · Neon Postgres · Auth.js v5 (credenciales, JWT en cookie `httpOnly`) · Tailwind + shadcn/ui · Vitest · deploy en Vercel.

## Comandos

```bash
npm run dev          # servidor de desarrollo
npm test             # vitest run
npm run lint         # eslint
npx tsc --noEmit     # chequeo de tipos
npm run db:generate  # genera migración desde el esquema
npm run db:migrate   # aplica migraciones (apunta a Neon según DATABASE_URL del .env)
npm run db:studio    # inspector de la base
npm run db:seed      # seed idempotente
```

## Arquitectura — regla dura

DDD y Clean Architecture dentro del monolito. Las dependencias apuntan hacia adentro:

```
src/app/            # UI y route handlers. NUNCA importa src/server/infrastructure/*
src/server/domain/         # entidades, puertos, funciones puras. Cero Drizzle, cero Next.js
src/server/application/    # casos de uso. Dependen solo de puertos de domain/
src/server/infrastructure/ # Drizzle vive acá y solo acá (db/schema, repositories, security, config)
src/server/interface/      # guards (requireProfessional, requireTenantOwner) y wiring de Auth.js
```

Un Server Component puede importar `src/server/application/*` para lecturas simples. **Toda escritura pasa por un Route Handler** en `src/app/api/*`.

Convenciones de nombres: `*.entity.ts`, `*-repository.port.ts`, `*.use-case.ts`, `drizzle-*.repository.ts`. Fakes de test en `__fakes__/in-memory-*.ts`.

## UI — design system

La UI se compone con las primitivas de `src/components/brand` (`Hero`, `Panel`, `Band`, `ServiceCard`, `SelectChip`, `ReviewCard`, `AdminPageHeader`…), no con clases sueltas. Son presentacionales: no importan nada de `server/`, no hacen fetch y reciben datos ya resueltos. `Button`/`Input` de shadcn quedan para los formularios densos del admin.

Los tokens viven en [globals.css](src/app/globals.css) y se derivan de los del tenant que resuelve el SPEC 04, así que una pieza se ve Minimal Nude, Glam, Editorial o Pastel sin ramas por arquetipo. La ruta `/estilo` es la referencia visual con conmutador de arquetipo y modo claro/oscuro; no la enlaza nadie desde la app.

Dos reglas que no se deducen leyendo el CSS:

- La escalera tonal (`--surface-1..4`) se tiñe con `--foreground`, no con `--primary`. Mezclar contra primary funcionaba con la paleta nude, pero un tenant de primary saturado convertía bandas y pie en bloques de color.
- Las cifras van en la familia de cuerpo, nunca en la de titular: un `0` en Playfair o Cormorant a tamaño display se lee como `o` minúscula.

## Convenciones de datos

- PK `uuid` con `gen_random_uuid()`. Timestamps `timestamptz` en UTC; la UI presenta en `America/Santiago`.
- Dinero: enteros en CLP, nunca `numeric`. Duraciones: enteros en minutos.
- Toda tabla de negocio lleva `professional_id`. Ese es el eje de aislamiento entre tenants.
- `bookings.price_clp` y `duration_minutes` son fotografías congeladas al reservar, no cálculos en vivo.

## Specs

El desarrollo es spec-driven: cada feature se define en `specs/NN-slug.md` antes de escribir código (`/spec` para redactar, `/spec-impl NN-slug` para implementar). Estados: `Draft` → `Approved` → `Implemented`.

| Spec | Alcance | Estado |
| --- | --- | --- |
| [01](specs/01-cimientos-auth-multitenant.md) | Esquema completo (11 tablas), auth, multi-tenant, guards | Implemented |
| [02](specs/02-disponibilidad-reserva.md) | Disponibilidad mensual, slots, reserva, confirmación, strikes | Implemented |
| [03](specs/03-disenador-unas-cotizacion.md) | Diseñador de uñas, catálogo `design_elements`, cotización | Implemented |
| [04](specs/04-personalizacion-marca-tenant.md) | Personalización de marca por tenant (`tenant_branding`, arquetipos, theming) y rediseño visual completo | Implemented |
| [05](specs/05-catalogo-portafolio-imagenes.md) | CRUD de servicios, subida de imágenes con Vercel Blob, portafolio, catálogo público | Implemented |
| [06](specs/06-reviews-moderacion-publica.md) | Reviews: moderación, publicación y vista pública | Implemented |
| [07](specs/07-notificaciones-email-foto-referencia.md) | Notificaciones por email (Resend) al confirmar/cancelar reserva, foto de referencia en el diseñador | Implemented |
| [08](specs/08-producto-listo-para-mostrar.md) | Registro alcanzable, recuperación de contraseña, metadata real, panel usable en teléfono, estados de error/carga, accesibilidad, seed de portafolio y tagline | Implemented |
| [09](specs/09-pulido-estetico.md) | Pulido estético | Implemented |
| [10](specs/10-pulido-admin.md) | Pulido admin | Implemented |
| [11](specs/11-registro-profesionales.md) | Auto-registro de profesionales, código de invitación, verificación de correo, período de prueba | Implemented |
| [12](specs/12-panel-superadmin.md) | Panel `/admin`: activar/desactivar cuentas, extender prueba, generar y listar códigos de invitación | Implemented |

El esquema de las 11 tablas existe completo desde el SPEC 01. Que una tabla exista **no** significa que tenga lógica ni UI: `design_elements` solo tiene filas de seed; `designs` ya tiene escritor real desde el SPEC 07 (`reference_image_url`). `professionals.tagline` existe desde el SPEC 08.

## Deploy

No hay PR ni CI: se pushea la rama del spec directo sobre `main` y Vercel detecta y redeploya solo.

```bash
npm run db:migrate                              # 1. migrar Neon primero
git push origin spec-NN-slug:main               # 2. después pushear
```

La migración va **antes** del push: las migraciones son aditivas y el build de Vercel no las corre, así que migrar primero evita que el código nuevo quede deployado contra un esquema viejo.

## Cosas que ya nos mordieron

- **`neon-http` no soporta `db.transaction()`.** [client.ts](src/server/infrastructure/db/client.ts) usa el driver HTTP. Para escrituras atómicas se usa `db.batch([...])` con los uuid generados en la aplicación con `crypto.randomUUID()`.
- **`getToken` en el middleware necesita `secureCookie`** cuando corre sobre https, o no encuentra la sesión en producción (commit `53d51ec`).
- El `.env` local apunta a la **base de Neon de producción**. No hay base de desarrollo separada: cuidado al probar con datos, y limpiar lo que se inserta a mano.
- **`notFound()` llamado dentro de un `layout.tsx` no usa el `not-found.tsx` del mismo segmento.** Next busca el de un segmento padre, porque el layout que lanza el error no puede envolver su propio boundary. El `not-found.tsx` de slug inexistente vive en `src/app/not-found.tsx` (raíz), no en `src/app/[slug]/`, por esto mismo (SPEC 08).
