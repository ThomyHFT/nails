# SPEC 01 — Cimientos: multi-tenant, esquema y autenticación

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-07-31
> **Objetivo:** Levantar la base del proyecto — Next.js, esquema completo en Postgres y autenticación con roles aislada por tenant — sobre la que se construyen los specs 02, 03 y 04.

---

## Por qué existe este spec

El producto completo es una plataforma de agendamiento para manicuristas independientes, con un diseñador de uñas dinámico como diferenciador. Ese alcance toca seis áreas del sistema y no cabe en un spec.

La división acordada:

| Spec | Contenido                                                                 |
| ---- | ------------------------------------------------------------------------- |
| 01   | Cimientos: stack, esquema completo, autenticación y aislamiento por tenant |
| 02   | Configuración de disponibilidad y reserva de hora                         |
| 03   | Diseñador de uñas dinámico                                                |
| 04   | Catálogos públicos: precios, portafolio y reviews                         |

Este spec no entrega funcionalidad visible para la clienta más allá de registrarse e iniciar sesión. Su valor es que los tres specs siguientes no tengan que renegociar el modelo de datos ni el modelo de permisos.

Dos decisiones se toman aquí y se justifican en la sección de decisiones, porque son las que más caro cuesta revertir:

1. El esquema se escribe completo desde el inicio, incluyendo tablas que ningún código de este spec consulta.
2. El sistema es multi-tenant desde la primera migración, aunque en producción opere una sola profesional.

---

## Alcance

**Dentro:**

- Proyecto Next.js 15 (App Router) con TypeScript, ESLint y Prettier.
- Tailwind CSS y shadcn/ui instalados y configurados.
- Conexión a Postgres (Neon) mediante Drizzle ORM, con migraciones versionadas en el repositorio.
- Esquema completo de base de datos, incluyendo las tablas que consumen los specs 02, 03 y 04.
- Script de seed que crea el tenant de la profesional piloto, su usuario y sus servicios de ejemplo.
- Autenticación con Auth.js v5, provider de credenciales (email y contraseña), hash con bcrypt.
- Sesión en JWT dentro de cookie `httpOnly`.
- Dos roles: `client` y `professional`.
- Registro, inicio de sesión y cierre de sesión de clienta.
- Inicio de sesión de profesional.
- Ruteo multi-tenant por path: `/[slug]`.
- Página pública `/[slug]` con el nombre del negocio y nada más.
- Ruta protegida `/[slug]/cuenta` que muestra el email de la clienta autenticada.
- Ruta protegida `/[slug]/admin` con layout y navegación vacía, accesible solo con rol `professional`.
- Middleware que bloquea acceso cruzado: una clienta no entra a `/admin`, y una profesional no entra al `/admin` de otro tenant.
- Tests con Vitest sobre la lógica de autenticación y sobre los guards de tenant y de rol.
- Deploy en Vercel con las variables de entorno configuradas y la aplicación accesible en una URL pública.

**Fuera de alcance (para specs futuros):**

- Configuración de disponibilidad y generación de slots. Va en el SPEC 02.
- Flujo de reserva de hora. Va en el SPEC 02.
- Diseñador de uñas y cotización por elementos. Va en el SPEC 03.
- Catálogo de precios visible, portafolio de trabajos y reviews en interfaz. Va en el SPEC 04.
- Recuperación de contraseña por email. Requiere infraestructura de correo, que ningún flujo de este spec necesita.
- Verificación de email. La columna `email_verified_at` existe en el esquema, pero ningún flujo la escribe ni la exige.
- Envío de cualquier correo electrónico, y por lo tanto la integración con Resend.
- Subida y almacenamiento de imágenes, y por lo tanto la integración con Cloudflare R2.
- Registro self-service de profesionales. Los tenants se crean por seed o por script.
- Pagos en línea. El pago es presencial en todo el producto.
- Panel de super-administración para gestionar tenants.
- Subdominios o dominios propios por profesional.
- OAuth, magic links y segundo factor.
- Internacionalización. El sitio es solo en español, moneda CLP, zona horaria `America/Santiago`.

---

## Modelo de datos

### Convenciones globales

- Llaves primarias: `uuid`, generadas con `gen_random_uuid()`. Evitan URLs enumerables.
- Timestamps: `timestamptz`, siempre almacenados en UTC. La presentación en `America/Santiago` es responsabilidad de la capa de UI.
- Dinero: enteros en pesos chilenos. El peso no tiene decimales, así que no se usa `numeric`.
- Duraciones: enteros en minutos.
- Toda tabla de negocio lleva `professional_id`. Ese es el eje de aislamiento entre tenants.
- Toda tabla lleva `created_at`; las que se editan llevan además `updated_at`.

### Identidad

**`users`** — identidad global, no está scopeada a un tenant.

| Columna            | Tipo                | Nota                                                          |
| ------------------ | ------------------- | ------------------------------------------------------------- |
| `id`               | uuid PK             |                                                               |
| `email`            | text, único         | Normalizado a minúsculas antes de insertar                    |
| `password_hash`    | text                | bcrypt, cost 12                                               |
| `name`             | text                |                                                               |
| `phone`            | text, nulo          |                                                               |
| `role`             | enum `user_role`    | `client` \| `professional`                                    |
| `email_verified_at`| timestamptz, nulo   | Existe para el futuro. Ningún flujo del SPEC 01 la escribe    |
| `created_at`       | timestamptz         |                                                               |
| `updated_at`       | timestamptz         |                                                               |

**`professionals`** — el tenant.

| Columna             | Tipo                                | Nota                                                        |
| ------------------- | ----------------------------------- | ----------------------------------------------------------- |
| `id`                | uuid PK                             |                                                             |
| `slug`              | text, único                         | Segmento de URL: `/karla`                                   |
| `owner_user_id`     | uuid FK → `users.id`, único         | El usuario con rol `professional` dueño del tenant          |
| `business_name`     | text                                |                                                             |
| `bio`               | text, nulo                          |                                                             |
| `phone`             | text, nulo                          |                                                             |
| `instagram_handle`  | text, nulo                          |                                                             |
| `timezone`          | text, default `'America/Santiago'`  |                                                             |
| `active`            | boolean, default `true`             |                                                             |
| `created_at`        | timestamptz                         |                                                             |
| `updated_at`        | timestamptz                         |                                                             |

No hay tablas `accounts` ni `sessions` de Auth.js. Con estrategia JWT y provider de credenciales, el adapter de base de datos no es necesario.

### Servicios y precios

**`services`**

| Columna           | Tipo                              | Nota |
| ----------------- | --------------------------------- | ---- |
| `id`              | uuid PK                           |      |
| `professional_id` | uuid FK → `professionals.id`      |      |
| `name`            | text                              |      |
| `description`     | text, nulo                        |      |
| `sort_order`      | integer, default `0`              |      |
| `active`          | boolean, default `true`           |      |
| `created_at`      | timestamptz                       |      |
| `updated_at`      | timestamptz                       |      |

**`service_variants`** — el precio y la duración viven acá, no en `services`.

| Columna            | Tipo                       | Nota                                     |
| ------------------ | -------------------------- | ---------------------------------------- |
| `id`               | uuid PK                    |                                          |
| `service_id`       | uuid FK → `services.id`    |                                          |
| `nail_length`      | enum `nail_length`         | `short` \| `medium` \| `long` \| `single`|
| `price_clp`        | integer                    |                                          |
| `duration_minutes` | integer                    |                                          |
| `active`           | boolean, default `true`    |                                          |

Índice único sobre `(service_id, nail_length)`. El valor `single` representa un servicio cuyo precio no varía según el largo de la uña, como el retiro de esmalte; ese servicio tiene exactamente una variante.

### Disponibilidad

**`availability_rules`** — regla semanal recurrente.

| Columna           | Tipo                          | Nota                       |
| ----------------- | ----------------------------- | -------------------------- |
| `id`              | uuid PK                       |                            |
| `professional_id` | uuid FK → `professionals.id`  |                            |
| `weekday`         | smallint                      | 0 = domingo, 6 = sábado    |
| `start_time`      | time                          | Hora local del tenant      |
| `end_time`        | time                          | Hora local del tenant      |
| `active`          | boolean, default `true`       |                            |

**`availability_exceptions`** — quiebre puntual de la regla semanal.

| Columna           | Tipo                          | Nota                                                              |
| ----------------- | ----------------------------- | ----------------------------------------------------------------- |
| `id`              | uuid PK                       |                                                                   |
| `professional_id` | uuid FK → `professionals.id`  |                                                                   |
| `date`            | date                          |                                                                   |
| `kind`            | enum `exception_kind`         | `blocked` \| `extra`                                              |
| `start_time`      | time, nulo                    | Nulo con `kind = blocked` significa día completo bloqueado        |
| `end_time`        | time, nulo                    |                                                                   |
| `note`            | text, nulo                    |                                                                   |

### Diseño de uñas

**`design_elements`** — catálogo cerrado del que la clienta elige. Cada elemento carga su delta de precio y de tiempo.

| Columna           | Tipo                          | Nota                                                                |
| ----------------- | ----------------------------- | ------------------------------------------------------------------- |
| `id`              | uuid PK                       |                                                                     |
| `professional_id` | uuid FK → `professionals.id`  | Cada profesional define su propio catálogo y sus propios precios    |
| `category`        | enum `element_category`       | `finish` \| `decoration` \| `technique`                             |
| `code`            | text                          | Identificador estable usado dentro del JSON del diseño              |
| `label`           | text                          | Texto visible en español                                            |
| `price_delta_clp` | integer, default `0`          |                                                                     |
| `extra_minutes`   | integer, default `0`          |                                                                     |
| `sort_order`      | integer, default `0`          |                                                                     |
| `active`          | boolean, default `true`       |                                                                     |

Índice único sobre `(professional_id, code)`.

**`designs`**

| Columna               | Tipo                          | Nota                                                                 |
| --------------------- | ----------------------------- | -------------------------------------------------------------------- |
| `id`                  | uuid PK                       |                                                                      |
| `professional_id`     | uuid FK → `professionals.id`  |                                                                      |
| `client_user_id`      | uuid FK → `users.id`, nulo    | Nulo cuando es una plantilla creada por la profesional               |
| `source`              | enum `design_source`          | `client` \| `template`                                               |
| `name`                | text, nulo                    | Solo se usa en plantillas                                            |
| `payload`             | jsonb                         | Estructura versionada, definida abajo                                |
| `extra_price_clp`     | integer                       | Suma de los deltas al momento de guardar                             |
| `extra_minutes`       | integer                       | Suma de los minutos extra al momento de guardar                      |
| `reference_image_url` | text, nulo                    | Foto de referencia opcional. La subida se implementa en el SPEC 03   |
| `created_at`          | timestamptz                   |                                                                      |

Forma del campo `payload`:

```ts
type NailDesignPayload = {
  version: 1;
  shape: 'almond' | 'coffin' | 'square' | 'round' | 'stiletto';
  length: 'short' | 'medium' | 'long';
  // Exactamente 10 entradas.
  // Índices 0–4: mano izquierda, del pulgar al meñique.
  // Índices 5–9: mano derecha, del pulgar al meñique.
  nails: {
    baseColorHex: string;    // '#RRGGBB'
    finish: string;          // design_elements.code, categoría 'finish'
    decorations: string[];   // design_elements.code, categoría 'decoration'
  }[];
};
```

El campo `version` permite migrar la estructura sin romper diseños ya guardados.

### Reservas

**`bookings`**

| Columna              | Tipo                                | Nota                                                              |
| -------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `id`                 | uuid PK                             |                                                                   |
| `professional_id`    | uuid FK → `professionals.id`        |                                                                   |
| `client_user_id`     | uuid FK → `users.id`                |                                                                   |
| `service_variant_id` | uuid FK → `service_variants.id`     |                                                                   |
| `design_id`          | uuid FK → `designs.id`, nulo        |                                                                   |
| `starts_at`          | timestamptz                         |                                                                   |
| `ends_at`            | timestamptz                         |                                                                   |
| `status`             | enum `booking_status`               | `pending` \| `confirmed` \| `completed` \| `cancelled` \| `no_show`|
| `price_clp`          | integer                             | Precio total congelado al reservar: variante más deltas del diseño|
| `duration_minutes`   | integer                             | Duración total congelada al reservar                              |
| `client_note`        | text, nulo                          |                                                                   |
| `professional_note`  | text, nulo                          |                                                                   |
| `cancelled_at`       | timestamptz, nulo                   |                                                                   |
| `cancelled_by`       | enum `actor`, nulo                  | `client` \| `professional`                                        |
| `created_at`         | timestamptz                         |                                                                   |
| `updated_at`         | timestamptz                         |                                                                   |

`price_clp` y `duration_minutes` son fotografías, no cálculos en vivo. Si la profesional sube sus precios mañana, la reserva de hoy conserva lo que se le cotizó a la clienta.

### Contenido público

**`portfolio_items`**

| Columna           | Tipo                          | Nota                                                                    |
| ----------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `id`              | uuid PK                       |                                                                         |
| `professional_id` | uuid FK → `professionals.id`  |                                                                         |
| `image_url`       | text                          |                                                                         |
| `caption`         | text, nulo                    |                                                                         |
| `service_id`      | uuid FK → `services.id`, nulo |                                                                         |
| `design_id`       | uuid FK → `designs.id`, nulo  | Permite ofrecer un trabajo del portafolio como plantilla de diseño      |
| `sort_order`      | integer, default `0`          |                                                                         |
| `published`       | boolean, default `false`      |                                                                         |
| `created_at`      | timestamptz                   |                                                                         |

**`reviews`**

| Columna           | Tipo                              | Nota                                        |
| ----------------- | --------------------------------- | ------------------------------------------- |
| `id`              | uuid PK                           |                                             |
| `professional_id` | uuid FK → `professionals.id`      |                                             |
| `booking_id`      | uuid FK → `bookings.id`, único    | Una review por reserva                      |
| `client_user_id`  | uuid FK → `users.id`              |                                             |
| `rating`          | smallint                          | Restricción `CHECK (rating BETWEEN 1 AND 5)`|
| `body`            | text                              |                                             |
| `photo_url`       | text, nulo                        |                                             |
| `status`          | enum `review_status`              | `pending` \| `approved` \| `rejected`       |
| `created_at`      | timestamptz                       |                                             |
| `moderated_at`    | timestamptz, nulo                 |                                             |

La regla de que solo se puede opinar sobre una reserva en estado `completed` se aplica en la capa de aplicación, en el SPEC 04. El esquema no la fuerza.

---

## Arquitectura de carpetas

Un solo proyecto Next.js, un solo deploy. La separación entre front y back es de código, no de proceso ni de repositorio: DDD y Clean Architecture aplicados dentro del monolito.

```
src/
  app/                          # FRONT. Páginas, layouts, componentes. Cero import de Drizzle.
    [slug]/
      page.tsx                  # público
      registro/page.tsx
      login/page.tsx
      cuenta/page.tsx           # protegida
      admin/layout.tsx          # protegida, rol professional
      admin/page.tsx
    api/
      auth/[...nextauth]/route.ts
      clients/route.ts          # registro — controller delgado (interface layer)
  server/                        # BACK. No lo importa un componente de UI directo; solo route handlers y Server Components de lectura.
    domain/                      # Entidades y puertos (interfaces). Cero import de Drizzle, cero import de Next.js.
      user/
        user.entity.ts
        user-repository.port.ts
        password-hasher.port.ts
      professional/
        professional.entity.ts
        professional-repository.port.ts
    application/                 # Casos de uso. Dependen solo de los puertos de domain/.
      auth/
        register-client.use-case.ts
        authenticate-user.use-case.ts
      tenant/
        get-professional-by-slug.use-case.ts
    infrastructure/               # Implementaciones concretas. Aquí y solo aquí vive Drizzle.
      config/env.ts
      db/
        client.ts
        schema/                  # enums.ts, users.ts, services.ts, availability.ts, designs.ts, bookings.ts, content.ts
      repositories/
        drizzle-user.repository.ts
        drizzle-professional.repository.ts
      security/
        bcrypt-password-hasher.ts
    interface/                    # Guards y wiring de sesión. Arman casos de uso con implementaciones concretas.
      guards.ts                   # requireProfessional, requireTenantOwner
      auth-config.ts               # configuración de Auth.js; su authorize() llama a AuthenticateUserUseCase
```

**Regla dura:** ningún archivo bajo `src/app/` importa `src/server/infrastructure/*` directo. Un Server Component puede importar `src/server/application/*` (casos de uso) para lecturas simples; cualquier escritura pasa por un Route Handler en `src/app/api/*`.

---

## Plan de implementación

Cada paso deja el proyecto en estado ejecutable y es commiteable por sí solo.

1. **Andamiaje.** Crear el proyecto con `create-next-app` (App Router, TypeScript, usando `src/`). Configurar ESLint y Prettier. Crear las carpetas vacías `src/app`, `src/server/domain`, `src/server/application`, `src/server/infrastructure`, `src/server/interface`. Verificación: `npm run dev` levanta y `http://localhost:3000` responde.

2. **Estilos.** Instalar y configurar Tailwind CSS y shadcn/ui. Agregar un componente `Button` de prueba en la home. Verificación: el botón se ve con estilos de shadcn.

3. **Entorno validado.** Crear `src/server/infrastructure/config/env.ts` que parsea `process.env` con Zod y exporta un objeto tipado. Variables: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`. Crear `.env.example`. Verificación: borrar `DATABASE_URL` del `.env` hace que la app falle al arrancar con un mensaje que nombra la variable faltante.

4. **Conexión a base de datos.** Instalar Drizzle y el driver de Neon. Crear `drizzle.config.ts` en la raíz y `src/server/infrastructure/db/client.ts` exportando el cliente. Agregar los scripts `db:generate`, `db:migrate` y `db:studio` al `package.json`. Verificación: un script que ejecuta `select 1` imprime el resultado.

5. **Dominio: entidades y puertos.** Crear `src/server/domain/user/user.entity.ts`, `user-repository.port.ts`, `password-hasher.port.ts`, `src/server/domain/professional/professional.entity.ts` y `professional-repository.port.ts`. Puro TypeScript, sin import de Drizzle ni de Next.js. Verificación: el paquete compila sin depender de `infrastructure/`.

6. **Esquema, parte 1: identidad.** Crear `src/server/infrastructure/db/schema/enums.ts` con todos los enums del modelo de datos. Crear `src/server/infrastructure/db/schema/users.ts` con `users` y `professionals`. Generar y aplicar la migración. Verificación: `db:studio` muestra ambas tablas con sus columnas.

7. **Repositorios de infraestructura, parte 1.** Crear `src/server/infrastructure/repositories/drizzle-user.repository.ts` y `drizzle-professional.repository.ts` implementando los ports del paso 5. Verificación: un script manual invoca `findByEmail` y devuelve una entidad de dominio, no una fila cruda de Drizzle.

8. **Esquema, parte 2: servicios.** Crear `src/server/infrastructure/db/schema/services.ts` con `services` y `service_variants`, incluyendo el índice único `(service_id, nail_length)`. Generar y aplicar la migración.

9. **Esquema, parte 3: disponibilidad.** Crear `src/server/infrastructure/db/schema/availability.ts` con `availability_rules` y `availability_exceptions`. Generar y aplicar la migración.

10. **Esquema, parte 4: diseños.** Crear `src/server/infrastructure/db/schema/designs.ts` con `design_elements` y `designs`, incluyendo el índice único `(professional_id, code)` y el tipo TypeScript `NailDesignPayload` para el campo `jsonb`. Generar y aplicar la migración.

11. **Esquema, parte 5: reservas y contenido.** Crear `src/server/infrastructure/db/schema/bookings.ts` con `bookings`, y `src/server/infrastructure/db/schema/content.ts` con `portfolio_items` y `reviews`, incluyendo el `CHECK` de `rating`. Generar y aplicar la migración. Verificación: las once tablas del modelo de datos existen en la base.

12. **Seed.** Crear `scripts/seed.ts` que inserta: un usuario con rol `professional`, un tenant con slug real, tres servicios con sus variantes, y un catálogo inicial de `design_elements` con acabados y decoraciones con precios. Agregar el script `db:seed`. El script debe ser idempotente. Verificación: correr `db:seed` dos veces seguidas no duplica filas ni falla.

13. **Casos de uso de autenticación.** Crear `src/server/application/auth/register-client.use-case.ts` y `authenticate-user.use-case.ts`, ambos recibiendo `UserRepository` y `PasswordHasher` por inyección. Crear `src/server/infrastructure/security/bcrypt-password-hasher.ts` implementando el port. Verificación: un test invoca `RegisterClientUseCase` con un repositorio fake en memoria y comprueba que hashea antes de guardar.

14. **Auth.js.** Instalar Auth.js v5. Crear `src/server/interface/auth-config.ts` con el provider de credenciales cuyo `authorize()` arma `AuthenticateUserUseCase` con las implementaciones concretas de infraestructura y lo invoca. Configurar estrategia JWT y los callbacks que llevan `id` y `role` al token y a la sesión. Crear `src/app/api/auth/[...nextauth]/route.ts`. Verificación: un `POST` al endpoint de sign-in con las credenciales del seed devuelve una cookie de sesión.

15. **Registro de clienta.** Crear `src/app/api/clients/route.ts`: controller delgado que valida con Zod, arma `RegisterClientUseCase` con los repositorios concretos, lo invoca, y mapea el resultado a una respuesta HTTP legible si el email ya existe. Crear `src/app/[slug]/registro/page.tsx` con el formulario, que llama a ese endpoint. Verificación: registrar un email nuevo crea la fila; repetir el mismo email muestra el error y no crea una segunda fila.

16. **Login y logout.** Crear `src/app/[slug]/login/page.tsx` usando `signIn`/`signOut` de `next-auth/react`. Página de front puro, no toca Drizzle. Verificación: iniciar sesión deja la cookie `httpOnly` en el navegador; cerrar sesión la elimina.

17. **Página pública del tenant.** Crear `src/server/application/tenant/get-professional-by-slug.use-case.ts` y `src/app/[slug]/page.tsx`, un Server Component que lo invoca y muestra el `business_name`. Un slug inexistente o un tenant con `active = false` devuelve 404. Verificación: `/karla` muestra el nombre del negocio; `/noexiste` devuelve 404.

18. **Cuenta de la clienta.** Crear `src/app/[slug]/cuenta/page.tsx`, protegida. Muestra el email de la sesión. Verificación: sin sesión redirige a `/[slug]/login`; con sesión muestra el email correcto.

19. **Shell de administración.** Crear `src/server/interface/guards.ts` con `requireProfessional`, y `src/app/[slug]/admin/layout.tsx` más `page.tsx` con la navegación vacía. Verificación: una clienta autenticada que entra a `/[slug]/admin` es rechazada; la profesional dueña ve el shell.

20. **Aislamiento entre tenants.** Extender `src/server/interface/guards.ts` con `requireTenantOwner`, que compara `professionals.owner_user_id` contra el id de la sesión usando `ProfessionalRepository`. Crear `middleware.ts` que protege el prefijo `/[slug]/admin`. Verificación: una profesional autenticada que entra al `/admin` de un slug ajeno es rechazada. El escenario se prueba agregando un segundo tenant temporal por seed.

21. **Tests.** Instalar Vitest. Escribir tests para: entidades de dominio, `RegisterClientUseCase` y `AuthenticateUserUseCase` con repositorios fake en memoria (sin Drizzle), `requireProfessional` rechazando rol `client`, y `requireTenantOwner` rechazando a la profesional de otro tenant. Verificación: `npm test` pasa en verde.

22. **Deploy.** Crear el proyecto en Vercel, cargar las variables de entorno de producción, apuntar a la base de Neon y ejecutar las migraciones contra ella. Verificación: la URL pública sirve `/[slug]` y permite iniciar sesión con el usuario del seed.

---

## Criterios de aceptación

### Proyecto

- [x] `npm run dev` levanta la aplicación sin errores en la consola del servidor ni del navegador.
- [x] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [x] Arrancar la aplicación sin `DATABASE_URL` definida falla con un mensaje que nombra la variable faltante.

### Esquema

- [x] `npm run db:migrate` aplica todas las migraciones sobre una base vacía sin errores.
- [x] Existen las once tablas: `users`, `professionals`, `services`, `service_variants`, `availability_rules`, `availability_exceptions`, `design_elements`, `designs`, `bookings`, `portfolio_items`, `reviews`.
- [x] No existen las tablas `accounts` ni `sessions`.
- [x] Insertar dos filas en `users` con el mismo email es rechazado por la base de datos.
- [x] Insertar dos filas en `service_variants` con el mismo par `(service_id, nail_length)` es rechazado por la base de datos.
- [x] Insertar dos filas en `design_elements` con el mismo par `(professional_id, code)` es rechazado por la base de datos.
- [x] Insertar una fila en `reviews` con `rating = 6` es rechazado por la base de datos.

### Seed

- [x] `npm run db:seed` ejecutado dos veces seguidas termina sin error y deja la misma cantidad de filas en todas las tablas.
- [x] Tras el seed existe un tenant con slug, un usuario con rol `professional` asociado a él, al menos tres servicios con sus variantes, y al menos seis `design_elements`.

### Registro y autenticación

- [x] Registrar una clienta con un email nuevo crea una fila en `users` con `role = 'client'`.
- [x] El valor guardado en `password_hash` no coincide con la contraseña en texto plano.
- [x] Registrar con un email ya existente muestra un error en pantalla y no crea una segunda fila.
- [x] Registrarse con el email en mayúsculas y luego iniciar sesión con el mismo email en minúsculas funciona.
- [x] Iniciar sesión con credenciales correctas deja una cookie de sesión marcada `httpOnly`.
- [x] Iniciar sesión con contraseña incorrecta muestra un error y no deja cookie de sesión.
- [x] Cerrar sesión elimina la cookie y `/[slug]/cuenta` vuelve a redirigir al login.

### Ruteo multi-tenant

- [x] `/[slug]` con el slug del seed muestra el `business_name` del tenant.
- [x] Un slug inexistente devuelve 404.
- [x] Un slug cuyo tenant tiene `active = false` devuelve 404.

### Permisos

- [x] `/[slug]/cuenta` sin sesión redirige a `/[slug]/login`.
- [x] `/[slug]/cuenta` con sesión muestra el email de la clienta autenticada, no el de otra.
- [x] `/[slug]/admin` sin sesión redirige a `/[slug]/login`.
- [x] `/[slug]/admin` con sesión de rol `client` es rechazado.
- [x] `/[slug]/admin` con sesión de la profesional dueña del tenant muestra el shell de navegación.
- [x] Una profesional autenticada que abre el `/admin` de un slug que no le pertenece es rechazada.

### Tests y deploy

- [x] `npm test` pasa en verde e incluye tests de normalización de email, de hash y verificación de contraseña, de `requireProfessional` y de `requireTenantOwner`.
- [x] La URL pública de Vercel sirve `/[slug]` y permite iniciar sesión con el usuario del seed.

---

## Decisiones

### Arquitectura

- **Sí:** multi-tenant desde la primera migración, aunque en producción opere una sola profesional. El costo hoy es una columna `professional_id` por tabla; el costo de agregarlo después es reescribir todas las consultas del sistema.
- **No:** single-tenant con el negocio hardcodeado. Más rápido esta semana, caro el día que aparezca la segunda clienta.
- **Sí:** ruteo por path, `/[slug]`. Un dominio, un certificado, cero configuración de DNS al dar de alta un tenant.
- **No:** subdominio por tenant. Se ve más profesional pero exige DNS y TLS wildcard.
- **No:** dominio propio por profesional. Es argumento de venta futuro, no producto del piloto.
- **Sí:** escribir el esquema completo en este spec, incluyendo tablas que ningún código del SPEC 01 consulta. Evita que los specs 02, 03 y 04 produzcan migraciones que se contradigan entre sí.
- **No:** esquema incremental, una tanda de tablas por spec.
- **Sí:** separación de front y back por capas de código dentro de un único proyecto Next.js, con un único deploy. `src/app/` es front puro; `src/server/` implementa DDD y Clean Architecture (`domain/`, `application/`, `infrastructure/`, `interface/`). Mantiene el costo y la simplicidad de despliegue ya acordados en la sección de Stack, a cambio de disciplina de imports.
- **No:** monorepo con `apps/web` + `apps/api` como procesos separados. Sube la complejidad de deploy y ya no calza con Vercel Hobby de forma directa; deja de ser "monolito" en sentido estricto.
- **Sí:** Drizzle vive únicamente en `src/server/infrastructure/`. `domain/` y `application/` no importan Drizzle ni Next.js, solo los puertos (interfaces) que `infrastructure/` implementa. Permite testear casos de uso con repositorios fake en memoria, sin levantar Postgres.
- **No:** permitir a `application/` importar el cliente Drizzle directo "cuando no amerita un repositorio". Se decidió pureza estricta de capas sobre velocidad de escritura, porque este spec es la base de todo lo que sigue y el costo de una fuga de capas se paga en cada spec futuro.
- **Sí:** los Route Handlers de `src/app/api/*` son la capa `interface` (controllers delgados): parsean entrada, arman un caso de uso con las implementaciones concretas de infraestructura, lo invocan, mapean la salida a HTTP.
- **No:** Server Actions que llaman a Drizzle directo. El stack aprobado las mencionaba en el plan original; se reemplazan por Route Handlers para mantener la regla dura de que `src/app/` no importa infraestructura.

### Stack

- **Sí:** Next.js 15 con App Router, TypeScript, Tailwind y shadcn/ui.
- **Sí:** Postgres en Neon con Drizzle ORM. Nada en el código de aplicación depende de Neon en particular; la base es portable a cualquier Postgres, incluido uno propio en un VPS.
- **No:** Supabase. Resuelve auth y storage de una, pero amarra la capa de autenticación a un proveedor y su plan gratuito pausa el proyecto tras una semana sin tráfico. El costo de salida sería reescribir el auth completo.
- **No:** Prisma. Drizzle no arrastra un binario de motor, lo que abarata los arranques en frío en serverless.
- **Sí:** Vercel Hobby durante el piloto. Costo cero.
- **No:** VPS propio desde el día uno. El piloto no lo justifica, y la migración está prevista y es barata precisamente porque nada del stack es propietario.
- **Riesgo asumido y conocido:** los términos de servicio de Vercel Hobby prohíben el uso comercial. En el momento en que se le cobre a una manicurista hay que migrar a un VPS o a Vercel Pro.
- **Sí:** Cloudflare R2 para imágenes y Resend para correo quedan elegidos como piezas del producto, pero no se instalan en este spec porque ningún flujo del SPEC 01 los usa.

### Autenticación

- **Sí:** email y contraseña, con hash bcrypt cost 12. Cero dependencias externas para que una clienta entre.
- **No:** magic link por correo. Elimina las contraseñas, pero mete el correo como punto de falla en el camino crítico.
- **No:** OAuth de Google. Menos fricción, más dependencia externa y más configuración.
- **No:** OTP por SMS. Costo por mensaje en Chile.
- **Sí:** sesión en JWT dentro de cookie `httpOnly`. Sin consulta a la base en cada request.
- **No:** sesiones en tabla de Postgres. Permitirían revocar sesiones, a cambio de una consulta por request. A esta escala no se justifica.
- **Sí:** `users` es una tabla global, no scopeada por tenant. Una clienta se registra una vez y puede reservar con cualquier manicurista de la plataforma. Es la base del marketplace posterior.
- **Costo aceptado:** el email es único en toda la plataforma, así que una persona no puede ser clienta con el mismo correo con el que es profesional.
- **Sí:** la columna `email_verified_at` existe pero ningún flujo la exige. Activar la verificación después es un cambio de aplicación, no de esquema.
- **No:** verificación de email obligatoria en el piloto. Si el correo no llega, la clienta no reserva.
- **Sí:** registro abierto de clientas.
- **No:** registro por invitación de la manicurista.
- **Sí:** alta de tenants manual, por seed o script. El onboarding self-service es una función de venta y merece su propio spec.
- **Sí:** recuperación de contraseña queda fuera de este spec. Requiere correo, y el correo entra recién en el spec que lo necesite. Se deja anotado porque sin ella una clienta que olvida su clave queda bloqueada de forma permanente.

### Modelo de datos

- **Sí:** el precio y la duración viven en `service_variants`, no en `services`. El largo de la uña cambia ambos.
- **Sí:** el enum `nail_length` incluye el valor `single` para los servicios cuyo precio no varía según el largo.
- **No:** dejar `nail_length` en nulo para esos casos. Postgres permite múltiples nulos en un índice único, lo que dejaría el índice sin efecto.
- **Sí:** `bookings` congela `price_clp` y `duration_minutes` al momento de reservar.
- **No:** recalcular el precio al leer la reserva. Subir la lista de precios reescribiría el historial y las cuentas ya cotizadas.
- **Sí:** el diseño de uñas se guarda como composición estructurada en `jsonb`, con un campo `version`.
- **No:** canvas de dibujo libre exportado a PNG. Produce diseños que no se pueden cotizar automáticamente y que muchas veces no son ejecutables sobre una uña real.
- **No:** limitar el diseño a subir una foto de referencia con notas. Es exactamente la funcionalidad que no diferencia a este producto de cualquier otro.
- **Sí:** `design_elements` cuelga de `professional_id` y cada elemento carga su `price_delta_clp` y sus `extra_minutes`. El diseñador deja de ser un juguete y pasa a cotizar solo.
- **No:** catálogo global de elementos compartido entre profesionales. Se rompe con la segunda manicurista, que tiene otros precios.
- **Sí:** llaves primarias `uuid`.
- **No:** enteros seriales. Producen URLs enumerables.
- **Sí:** dinero como entero en pesos chilenos. El peso no tiene decimales.
- **Sí:** `timestamptz` almacenado en UTC, presentado en `America/Santiago`.
- **Sí:** disponibilidad modelada como reglas semanales recurrentes más excepciones por fecha.
- **No:** calendario configurado día por día. Trivial de programar, insoportable de usar todas las semanas.

### Producto

- **Sí:** las reservas nacen en estado `pending` y la profesional confirma. Un diseño con pedrería y degradé no toma el mismo tiempo que un esmaltado liso, y la profesional necesita ver el diseño antes de comprometer el bloque de agenda.
- **No:** auto-confirmación de reservas. Llenaría la agenda con bloques mal dimensionados.
- **Sí:** solo puede dejar review quien tenga una reserva en estado `completed`, con moderación previa de la profesional y foto opcional.
- **No:** reviews abiertas a cualquier usuario registrado y publicación inmediata. Sin el filtro de reserva llega spam; sin moderación, una review injusta queda pública para siempre.
- **Sí:** el pago es presencial en todo el producto.
- **No:** pasarela de pago en línea.
- **Sí:** las notificaciones serán por correo electrónico cuando lleguen.
- **No:** WhatsApp Business API. Tiene costo por conversación y proceso de verificación.

### Convenciones

- **Sí:** identificadores de código y de base de datos en inglés, interfaz y contenido en español.
- **Sí:** tests automatizados acotados a la lógica de autenticación y a los guards de rol y de tenant. Son el único lugar de este spec donde un error se traduce en filtración de datos entre clientas.
- **No:** suite de Playwright end-to-end en este spec.

---

## Riesgos

| Riesgo                                                                                                                                      | Mitigación                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El aislamiento entre tenants se aplica en la capa de aplicación, no en la base. Un `where` sin `professional_id` filtra datos de una clienta a otra profesional. | Los guards viven centralizados en `src/lib/guards.ts` y tienen tests. Si el producto crece, se evalúa activar Row Level Security en Postgres.                                            |
| Los términos de servicio de Vercel Hobby prohíben el uso comercial.                                                                          | Migrar a VPS con Coolify o a Vercel Pro antes de cobrarle a la primera manicurista. Ninguna pieza del stack es propietaria, así que la migración es solo de hosting.                     |
| El plan gratuito de Neon suspende la base tras inactividad, lo que produce un arranque frío en la primera visita del día.                     | Aceptable durante el piloto. Desaparece al pasar a plan pago o a Postgres propio en el VPS.                                                                                              |
| Sin flujo de recuperación de contraseña, una clienta que olvida su clave queda bloqueada de forma permanente.                                 | Mientras el flujo no exista, la contraseña se restablece con un script manual contra la base. El flujo real entra en el spec que traiga correo.                                          |
| La sesión en JWT no se puede revocar. Una cookie filtrada sigue siendo válida hasta que expire.                                              | Expiración de sesión de 7 días. Rotar `AUTH_SECRET` invalida todas las sesiones activas de golpe.                                                                                        |
| El esquema se escribe completo antes de implementar los specs 02 a 04, así que alguna tabla puede resultar mal modelada.                      | Las tablas que ningún spec consulta todavía están vacías. Alterarlas antes de que tengan datos cuesta una migración y nada más.                                                          |
| Un slug de tenant puede colisionar con una ruta reservada de la aplicación, como `api` o `login`.                                             | El script de alta valida el slug contra una lista de reservados antes de insertar.                                                                                                      |
| bcrypt con cost 12 consume CPU en cada inicio de sesión, y las funciones serverless tienen límite de tiempo.                                  | Medir la latencia del login en producción. Si supera el presupuesto, bajar el cost a 10.                                                                                                |

---

## Lo que **no** está en este spec

- Configuración de disponibilidad y generación de slots.
- Flujo de reserva de hora.
- Diseñador de uñas y cotización automática por elementos.
- Catálogo de precios visible, portafolio de trabajos y reviews en interfaz.
- Recuperación de contraseña y verificación de email.
- Envío de correo electrónico.
- Subida y almacenamiento de imágenes.
- Registro self-service de profesionales.
- Pagos en línea.
- Panel de super-administración.
- Subdominios o dominios propios por profesional.
- OAuth, magic links y segundo factor.
- Internacionalización.

Las tablas de varias de estas funciones existen en el esquema desde este spec. Que la tabla exista no significa que la función esté hecha. Cada una entra por su propio spec.
