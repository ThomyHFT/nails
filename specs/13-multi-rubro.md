# SPEC 13 — Multi-rubro

**Estado:** Draft (Fase 1 implementada; Fase 2 pasos 1-3 implementados, paso 4 pendiente de confirmar en producción; Fase 3 — portada conmuta rubro implementada, dominio/marca pausado a la espera de la decisión del dueño)
**Alcance:** convertir el producto de "agenda para manicuristas" en "agenda para profesionales independientes que atienden por hora", sin bifurcar el código, sin una base por rubro y sin un dominio por rubro. Tres fases: rubro y módulos opcionales, vocabulario y eje de variantes, marca neutra.

Aparecieron un barbero y una masajista podóloga interesados en lo mismo que ya existe. El producto que necesitan es el que ya está construido —agenda, reservas, micrositio con su marca, opiniones, portafolio, correos— salvo por tres puntos donde el oficio de las uñas quedó incrustado. Este spec los desincrusta.

La tentación es un sitio por rubro. No: el aislamiento por `professional_id` y el ruteo por path ya sostienen tenants heterogéneos, y `agendaunas.cl/barberia-juan` convive con `agendaunas.cl/karla` sin tocar una línea de infraestructura. Lo único incompatible es que el dominio *diga* "uñas".

---

## 1. Diagnóstico: qué está atado y qué no

Medido sobre el código, no estimado.

**Ya es agnóstico al rubro y no se toca:** tenants y slug, `tenant_branding` y arquetipos, disponibilidad y slots, reservas, reviews, portafolio, notificaciones por correo, auth, registro con código de invitación, período de prueba y panel de superadmin.

**Atado a uñas, en tres lugares:**

| Qué | Dónde | Naturaleza |
| --- | --- | --- |
| Módulo diseñador | `design_elements`, `designs`, [NailDesigner.tsx](src/app/[slug]/(public)/reservar/NailDesigner.tsx), [/admin/diseno](src/app/[slug]/admin/diseno/page.tsx), `domain/design/` | Vertical completo, ya aislado |
| Eje de variantes | `service_variants.nail_length` (enum + índice único) | Una columna mal nombrada |
| Copy y marca | "AgendaUñas", `agendaunas.cl`, portada, seed, catálogo por defecto | Textos |

Dos hechos del código actual cambian el orden del trabajo:

- **`bookings.design_id` ya es nullable** y `designPayload` ya es opcional en
  [create-booking.use-case.ts](src/server/application/booking/create-booking.use-case.ts). El diseñador ya es un añadido y no un requisito; lo único que lo vuelve obligatorio es el arreglo fijo de cuatro pasos de
  [ReservarForm.tsx](src/app/[slug]/(public)/reservar/ReservarForm.tsx).
- **`nail_length` ya admite `"single"`** y el catálogo por defecto ya lo usa para "Retiro de esmalte". Un servicio sin eje ya es representable hoy.

De ahí la decisión de secuencia: **la fase 1 no migra `service_variants`**. Un barbero entra usando `"single"` mientras la columna sigue llamándose `nail_length`, que es feo por dentro pero invisible por fuera. El renombre viene después, sin nadie esperando.

---

## 2. Decisiones de diseño

### 2.1 El rubro es del tenant, no del usuario ni del servicio

`professionals.vertical`. Una profesional es de un rubro; sus servicios son texto libre y puede ofrecer lo que quiera dentro de él. La masajista podóloga es **un** tenant que ofrece masaje y podología, no dos.

### 2.2 `vertical` es un enum, no una tabla

Un rubro nuevo no es un dato: trae catálogo por defecto, vocabulario y decisiones de módulos, y todo eso es código. Una tabla de rubros daría la ilusión de que se agrega uno desde `db:studio` y quedaría a medias. Agregar un valor a un enum de Postgres es aditivo y ya lo hicimos con `admin` en el SPEC 12.

Valores de arranque:

| Valor | Etiqueta | Para |
| --- | --- | --- |
| `nails` | Uñas | lo que existe hoy |
| `barbershop` | Barbería | el barbero |
| `wellness` | Masaje y podología | la masajista podóloga |

`wellness` cubre dos oficios a propósito: comparten forma (sesión por hora, sin eje de largo, sin diseñador) y separarlos sería un enum más largo sin ninguna diferencia de comportamiento. Si algún día divergen, se parten.

### 2.3 El diseñador pasa a ser un módulo, no una etapa

Una función pura decide qué módulos tiene un rubro:

```
verticalModules(vertical) -> { designer: boolean }
```

Devuelve un objeto y no un booleano suelto porque el segundo módulo opcional va a llegar, y cambiar la forma del retorno después obliga a tocar cada sitio que lo consulta.

Se aplica en cinco puntos, y los cinco importan:

1. **`/reservar`**: los pasos se arman desde el módulo. Sin diseñador son `seleccionar → agendar → confirmado`.
2. **Navegación del admin**: "Catálogo de diseño" desaparece de [admin-nav-items.tsx](src/app/[slug]/admin/admin-nav-items.tsx).
3. **La ruta `/admin/diseno`**: `notFound()` si el rubro no tiene diseñador. Esconder el link no es protegerlo.
4. **Aprovisionamiento**: el alta no inserta `design_elements` para un rubro sin diseñador.
5. **`POST /api/bookings`**: rechaza un `designPayload` para un tenant sin diseñador. Es la única de las cinco que protege datos y no solo la vista.

`design_elements` y `designs` **no se migran ni se renombran**: quedan vacías para los tenants que no las usan. Una tabla sin filas no cuesta nada; una migración de dos tablas para no ganar nada, sí.

### 2.4 El vocabulario vive en el dominio, no repartido en JSX

```
verticalCopy(vertical) -> { label, variantAxisLabel, designerNoun? }
```

Solo entra acá lo que **de verdad** cambia entre rubros. "Reservar hora", "Opiniones" o "Portafolio" son iguales en los tres y no se parametrizan: un diccionario que traduce todo termina siendo un i18n casero y hace que nadie pueda leer la UI sin saltar a un mapa.

Lo que cambia hoy es el eje de las variantes:

| Rubro | `variantAxisLabel` |
| --- | --- |
| `nails` | Largo |
| `barbershop` | Servicio |
| `wellness` | Duración |

### 2.5 El eje de variantes se generaliza con expand/contract, no de un golpe

`service_variants.nail_length` es un enum `NOT NULL` con índice único sobre `(service_id, nail_length)`. Cambiarlo en una migración deja una ventana donde el código deployado no calza con el esquema — y en este proyecto **la migración corre antes del push** (ver CLAUDE.md), o sea que esa ventana existe de verdad.

Cuatro pasos, cada uno deployable solo:

1. Agregar `service_variants.label text` nullable.
2. Backfill: `short→"Corta"`, `medium→"Media"`, `long→"Larga"`, `single→"Única"`.
3. El código pasa a leer y escribir `label`. `nail_length` queda escrito pero sin leerse.
4. `label NOT NULL`, índice único a `(service_id, label)`, y recién ahí se dropea `nail_length` y su índice.

El paso 4 va **después** de confirmar en producción que el 3 quedó bien. Es la única parte de este spec que puede perder datos si se apura.

**Estado (implementado):** pasos 1-3 en producción (migración `0018_mushy_aqueduct.sql`). Mientras el paso 4 no corra, `nail_length` sigue `NOT NULL` con su índice único, así que crear una variante todavía ocupa uno de sus 4 valores por debajo — invisible para quien la crea, vía `DrizzleServicesRepository.createVariant` y el mismo cálculo por posición en `DrizzleTenantProvisioningRepository`. Un quinto variante por servicio no cabe hasta el paso 4 y devuelve `VariantLimitDuringMigrationError`; no es una regresión, es el mismo techo de 4 que ya existía con el enum visible.

**Paso 4 pendiente** — ejecutar cuando se confirme que el paso 3 no tuvo incidentes:

```sql
ALTER TABLE service_variants ALTER COLUMN label SET NOT NULL;
DROP INDEX service_variants_service_id_nail_length_idx;
CREATE UNIQUE INDEX service_variants_service_id_label_idx ON service_variants (service_id, label);
ALTER TABLE service_variants DROP COLUMN nail_length;
```

Junto con el esquema: quitar `nailLengthEnum` de `enums.ts`, la columna `nailLength` de `services.ts`, `LEGACY_NAIL_LENGTHS`/`LEGACY_LABEL_FALLBACK` de `drizzle-services.repository.ts`, y `LEGACY_NAIL_LENGTHS` de `drizzle-tenant-provisioning.repository.ts` — en ese momento `VariantLimitDuringMigrationError` deja de ser alcanzable y el límite de 4 variantes por servicio desaparece.

### 2.6 La marca neutra es el bloqueo comercial, no técnico

"AgendaUñas" no le vende a un barbero, y ningún trabajo de las fases 1 y 2 lo arregla. Pero tampoco lo bloquea: las dos primeras fases se pueden hacer y deployar bajo el dominio actual.

Criterios para el nombre: sin rubro, pronunciable en español chileno, **sin ñ** (por lo mismo que ya nos mordió con `agendaunas.cl` — DNS, punycode y tipeo), `.cl` disponible, y que no obligue a explicar qué hace.

La elección del nombre queda pendiente y es del dueño. No bloquea nada hasta la fase 3.

Mecánica del cambio, cuando se decida: dominio nuevo, `agendaunas.cl` con redirección 301 permanente, `AUTH_URL` y `EMAIL_FROM_ADDRESS` nuevos, dominio verificado en Resend, `reserved-slugs.ts` reservando la marca nueva (y manteniendo la vieja reservada), y `SiteFooter` con el "Hecho con —" actualizado.

### 2.7 La portada conmuta rubro, no solo estilo

La portada del commit `76a2cc2` ya se re-tematiza en vivo con un conmutador de arquetipo. Extenderlo a conmutar **rubro** —que cambie el micrositio de demostración, el titular y los servicios de ejemplo— resuelve el problema comercial completo: el barbero entra y se ve a sí mismo, sin una landing por rubro que mantener.

Es la misma pieza y el mismo estado. No es una página nueva.

---

## 3. Esquema

Todo aditivo. Ninguna columna existente cambia de tipo ni se vuelve obligatoria en las fases 1 y 2 (el `NOT NULL` de `label` es el paso 4, deliberadamente separado).

### 3.1 Fase 1 — `vertical`

```sql
CREATE TYPE vertical AS ENUM ('nails', 'barbershop', 'wellness');
ALTER TABLE professionals ADD COLUMN vertical vertical NOT NULL DEFAULT 'nails';
```

`DEFAULT 'nails'` no es pereza: los tenants que existen hoy **son** de uñas, y el default los deja correctos sin backfill.

### 3.2 Fase 2 — `label`

```sql
ALTER TABLE service_variants ADD COLUMN label text;           -- paso 1
-- paso 2: backfill desde nail_length
ALTER TABLE service_variants ALTER COLUMN label SET NOT NULL; -- paso 4
DROP INDEX service_variants_service_id_nail_length_idx;       -- paso 4
CREATE UNIQUE INDEX ... ON service_variants (service_id, label);
ALTER TABLE service_variants DROP COLUMN nail_length;         -- paso 4
```

---

## 4. Dominio

### 4.1 `src/server/domain/tenant/vertical.ts`

Funciones puras, con tests. `VERTICALS` con etiqueta por rubro, `verticalModules()` y `verticalCopy()` de §2.3 y §2.4.

### 4.2 `default-catalog.ts` pasa a recibir el rubro

Hoy `defaultDesignElements()` y `defaultServices()` no reciben nada y devuelven uñas. Pasan a `defaultServices(vertical)` y `defaultDesignElements(vertical)` — esta última devolviendo `[]` para un rubro sin diseñador.

Catálogos de arranque, en la línea de lo que ya existe para uñas (borradores para editar, no recomendaciones de precio):

- **`barbershop`**: corte, corte + barba, barba, corte de niño.
- **`wellness`**: masaje descontracturante 60/90 min, podología clínica, masaje relajante.

Los consumen el registro y `scripts/seed.ts`, igual que hoy, para que ambos produzcan el mismo punto de partida.

### 4.3 `Professional` gana `vertical`

La entidad, `toDomain()` de los repositorios y los fakes en memoria.

---

## 5. Casos de uso y API

- **`RegisterProfessionalUseCase`** recibe `vertical` y lo pasa a `ProvisionTenantInput`. Rubro inválido o ausente: se rechaza en el borde con zod, no se asume `nails` — asumir el default en el registro sería crear tenants de uñas por accidente.
- **`DrizzleTenantProvisioningRepository`** siembra el catálogo del rubro y omite `design_elements` cuando el rubro no lleva diseñador (el `db.batch` deja de tener esa inserción, no la hace con lista vacía).
- **`CreateBookingUseCase`** rechaza `designPayload` si el rubro del tenant no tiene diseñador. Error tipado en dominio: `DesignerNotAvailableError`.
- **Panel de superadmin (SPEC 12)**: la tabla de profesionales muestra el rubro. Sin filtros — el volumen sigue sin justificarlos.

---

## 6. UI

### 6.1 `/registro-profesional`

Un campo más, arriba de todo: **"¿A qué te dedicas?"** con las tres opciones sobre `OptionCard` o `SelectChip`. Va primero porque decide qué catálogo recibe la cuenta, y preguntarlo al final después de haber elegido slug y contraseña se lee como un trámite extra en vez de como la primera decisión.

### 6.2 `/reservar`

`StepIndicator` y el flujo se arman desde `verticalModules().designer`. Con tres pasos en vez de cuatro el indicador no cambia de forma, solo de largo.

### 6.3 Admin

"Catálogo de diseño" fuera de la navegación y la ruta en `notFound()` para rubros sin diseñador. En `/admin/servicios`, el encabezado de la columna de variantes usa `variantAxisLabel`.

### 6.4 Portada

Conmutador de rubro junto al de estilo, cambiando el micrositio de demostración de [landing-preview.tsx](src/app/landing-preview.tsx) (nombre del negocio, servicio, precio) y el titular. Los servicios de ejemplo salen del mismo `defaultServices(vertical)` que usa el registro, para que lo que se promete y lo que se entrega no puedan separarse.

---

## 7. Criterios de aceptación

**Fase 1**

1. Alguien se registra eligiendo Barbería y su cuenta queda con servicios de barbería y **sin** `design_elements`.
2. Su `/reservar` tiene tres pasos y en ninguno aparece el diseñador.
3. `/{slug}/admin/diseno` responde 404 para ese tenant, aunque se escriba la URL a mano.
4. `POST /api/bookings` con `designPayload` para ese tenant se rechaza.
5. Los tenants de uñas que ya existen siguen con cuatro pasos, diseñador y catálogo intactos.
6. `/admin` (superadmin) muestra el rubro de cada profesional.

**Fase 2**

7. Un servicio de barbería muestra su variante como "Servicio" y uno de uñas como "Largo". ✅ (`verticalCopy().variantAxisLabel`, aplicado en `/admin/servicios`, `/reservar` y `/cuenta`)
8. Terminado el paso 4, ninguna consulta referencia `nail_length` y las variantes existentes conservan su etiqueta y su precio. — pendiente del paso 4.

**Fase 3**

9. El dominio nuevo sirve la app y `agendaunas.cl` redirige con 301 permanente. — pausado: requiere que el dueño elija y compre el dominio (§2.6).
10. Los correos salen del remitente del dominio nuevo y con la marca nueva. — mismo bloqueo que el criterio 9.
11. La portada conmuta rubro y el micrositio de demostración cambia con él. ✅ (conmutador junto al eyebrow del hero; cambia copy del hero, el subtítulo de beneficios, el segundo beneficio, el tagline del pie y `LandingPreview` — nombre, servicio, precio y si muestra o no la chip de diseño)

---

## 8. Fuera de alcance

Un tenant con más de un rubro; rubros creados desde el panel sin tocar código; traducción o i18n; dominio propio por tenant (`karla.cl` apuntando a su micrositio); planes o precios distintos por rubro; y migrar `design_elements`/`designs` a un modelo genérico de "personalización" — mientras el diseñador sea el único módulo de su tipo, generalizarlo es diseñar para un caso que todavía no existe.
