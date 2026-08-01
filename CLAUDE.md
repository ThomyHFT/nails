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
| 06 (sin redactar) | Reviews: moderación, publicación y vista pública | — |

Sin redactar todavía, mencionado en specs anteriores como diferido: notificaciones por email con Resend. La subida de imágenes se resuelve en el SPEC 05 con Vercel Blob; `designs.reference_image_url` queda pendiente de enchufar esa infraestructura al flujo de reserva.

El esquema de las 11 tablas existe completo desde el SPEC 01. Que una tabla exista **no** significa que tenga lógica ni UI: `design_elements` y `designs` solo tienen filas de seed, y `portfolio_items` y `reviews` están vacías.

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
