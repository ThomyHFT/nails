# nails

App de agendamiento para profesionales independientes (uñas, barbería, masaje/podología). Cada profesional tiene su micrositio en `/<slug>`: sus clientas reservan hora, diseñan su manicure antes de llegar y dejan opiniones. Pago presencial, sin pagos en línea. En producción en [citaya.cl](https://www.citaya.cl).

Next.js (App Router) · Drizzle ORM · Neon Postgres · Auth.js v5 · Tailwind + shadcn/ui · Vitest · Vercel.

> La arquitectura, las convenciones y las cosas que ya nos mordieron están en [CLAUDE.md](CLAUDE.md). Léelo antes de tocar código.

## Requisitos

- Node.js 20.9 o superior (se desarrolla con Node 24).
- Una base Postgres de Neon **que no sea la de producción** (ver abajo).

## Primeros pasos

```bash
git clone https://github.com/ThomyHFT/nails.git
cd nails
npm ci
cp .env.example .env
```

Completa `.env` (cada variable está explicada en [.env.example](.env.example)). Lo mínimo:

- `DATABASE_URL`: tu base de desarrollo.
- `AUTH_SECRET`: cualquier cadena aleatoria, por ejemplo `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

Después:

```bash
npm run db:migrate   # crea las tablas
npm run db:seed      # tenant demo "karla", una clienta y opiniones
npm run dev          # http://localhost:3000
```

El seed imprime la contraseña de la profesional demo (`profesional@misunas.cl`) la primera vez, salvo que definas `SEED_PASSWORD`. Con eso puedes entrar en `/ingresar` o en `/karla/login`, y ver `/karla`, `/karla/reservar` y el panel en `/karla/admin`.

Sin `DATABASE_URL` igual cargan las páginas que no tocan la base: `/`, `/registro-profesional` y `/estilo` (la referencia visual del design system).

### Base de desarrollo

No pruebes contra producción: cada reserva, cuenta o foto que crees queda en datos reales. En la consola de Neon, crea una **branch** de la base de producción (por ejemplo `dev`). Es una copia copy-on-write, gratis e independiente, que se puede borrar y recrear cuando quieras. Usa su connection string como `DATABASE_URL`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Tests (Vitest, ~1 s, sin base: usan fakes en memoria) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Chequeo de tipos |
| `npm run build` | Build de producción |
| `npm run db:generate` | Genera una migración desde el esquema de Drizzle |
| `npm run db:migrate` | Aplica las migraciones a la base de `DATABASE_URL` |
| `npm run db:studio` | Inspector de la base |
| `npm run db:seed` | Seed idempotente del tenant demo |

La CI de GitHub Actions corre tipos, lint y tests en cada push y pull request.

## Cómo se trabaja

- Cada feature se define primero en `specs/NN-slug.md`; el índice y el estado de cada spec están en [CLAUDE.md](CLAUDE.md#specs).
- Deploy: Vercel publica cada push a `main`. Las migraciones van **antes** del push (`npm run db:migrate` contra producción), porque el build de Vercel no las corre.
