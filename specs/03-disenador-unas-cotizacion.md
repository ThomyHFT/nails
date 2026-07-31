# SPEC 03 — Diseñador de uñas y cotización por elementos

> **Estado:** Draft
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-07-31
> **Objetivo:** Permitir que la clienta diseñe sus uñas dentro del flujo de reserva, con cotización automática del precio y el tiempo extra a partir del catálogo de elementos que la profesional administra.

---

## Alcance

**Dentro:**

- Categoría `color` agregada al enum `element_category`, más la columna `color_hex` en `design_elements`. La profesional carga los esmaltes que realmente tiene.
- CRUD del catálogo `design_elements` desde `/admin`: crear, editar y desactivar elementos de las cuatro categorías (`color`, `finish`, `decoration`, `technique`), cada uno con su `price_delta_clp` y sus `extra_minutes`. Sin borrado duro.
- Diseñador de uñas en el flujo de reserva: vista SVG de las dos manos con las 10 uñas clickeables. Por uña se elige color base, acabado y decoraciones. Botón "aplicar a todas".
- Una `technique` opcional por diseño, global, no por uña.
- `NailDesignPayload` versión 2: se elimina `length` (lo define la variante) y se agrega `technique`. Cada uña guarda el `code` y el hex del color elegido.
- Cotización automática: `extra_price_clp` y `extra_minutes` calculados por una función pura de dominio sobre el payload y el catálogo vigente.
- Vista previa de disponibilidad antes de diseñar: calendario del mes marcando los días con al menos un slot para la duración base de la variante, con aviso de que el horario final depende del diseño.
- Flujo de reserva reordenado: servicio → variante → vista previa de días con cupo → diseño → fecha → hora → confirmar.
- Los slots reales se calculan con la duración total: `service_variants.duration_minutes` más `extra_minutes` del diseño.
- El diseño se inserta en `designs` dentro de la misma transacción que la reserva. `design_id` de la reserva queda apuntando a esa fila.
- `bookings.price_clp` y `bookings.duration_minutes` incluyen los deltas del diseño, congelados al reservar.
- El diseño es opcional: una reserva sin diseño sigue siendo válida y `design_id` queda `null`.
- Tests con Vitest sobre la cotización, el payload versión 2, la duración total en el cálculo de slots y la creación atómica de diseño más reserva.

**Fuera de alcance (para specs futuros):**

- Subida y almacenamiento de imágenes. `reference_image_url` queda `null` en este spec. El SPEC 01 anotaba que la subida iba acá; se mueve al spec que resuelva imágenes para diseños, portafolio y reviews de una sola vez.
- Plantillas de diseño de la profesional. `designs.source` es siempre `client` en este spec; `template` y `designs.name` quedan sin uso.
- Reutilizar o precargar un diseño de una reserva anterior. Cada reserva crea su propia fila en `designs`.
- Editar el diseño de una reserva ya creada. Sigue la decisión del SPEC 02: no hay reprogramación ni edición; se cancela y se reserva de nuevo.
- Listado o galería de diseños guardados en `/cuenta`.
- Borrado duro de elementos del catálogo.
- Notificaciones por email con el detalle del diseño. Requiere Resend, fuera de este spec.
- Catálogo de precios público, portafolio y reviews. Van en el SPEC 04.

---

## Modelo de datos

Cambios sobre el esquema del SPEC 01. No se agregan tablas nuevas.

**`element_category`** — agrega un valor al enum:

| Valor        | Nota                                                        |
| ------------ | ----------------------------------------------------------- |
| `color`      | Nuevo. Esmaltes que la profesional tiene disponibles        |
| `finish`     | Ya existía                                                  |
| `decoration` | Ya existía                                                  |
| `technique`  | Ya existía, empieza a usarse en este spec                   |

**`design_elements`** — agrega columna:

| Columna     | Tipo        | Nota                                                                              |
| ----------- | ----------- | --------------------------------------------------------------------------------- |
| `color_hex` | text, nulo  | Formato `#RRGGBB`. Obligatorio cuando `category = 'color'`, nulo en el resto       |

La obligatoriedad de `color_hex` para la categoría `color` se valida en la capa de aplicación, no con un `CHECK`. El esquema deja la columna nula para las otras tres categorías.

**`designs`** — no cambia de forma. Cambia lo que se escribe:

| Columna               | Valor en este spec                                                        |
| --------------------- | ------------------------------------------------------------------------- |
| `source`              | Siempre `client`                                                          |
| `name`                | Siempre `null` (solo se usa en plantillas, fuera de alcance)              |
| `client_user_id`      | Siempre la clienta que reserva, nunca nulo                                |
| `reference_image_url` | Siempre `null` (la subida es de otro spec)                                |
| `extra_price_clp`     | Resultado de la cotización, congelado al reservar                          |
| `extra_minutes`       | Resultado de la cotización, congelado al reservar                          |

**`bookings`** — no cambia de forma. Empieza a escribir `design_id`, que hasta el SPEC 02 quedaba `null`.

`price_clp` = `service_variants.price_clp` + `designs.extra_price_clp`.
`duration_minutes` = `service_variants.duration_minutes` + `designs.extra_minutes`.

Ambos siguen siendo fotografías: si la profesional cambia sus precios mañana, la reserva de hoy conserva lo cotizado.

### Payload versión 2

El campo `payload` de `designs` cambia de forma. La versión 1 documentada en el SPEC 01 nunca llegó a persistir filas, así que no hay datos que migrar.

```ts
type NailDesignPayload = {
  version: 2;
  shape: 'almond' | 'coffin' | 'square' | 'round' | 'stiletto';
  technique: string | null;  // design_elements.code, categoría 'technique'
  // Exactamente 10 entradas.
  // Índices 0–4: mano izquierda, del pulgar al meñique.
  // Índices 5–9: mano derecha, del pulgar al meñique.
  nails: {
    baseColorCode: string;   // design_elements.code, categoría 'color'
    baseColorHex: string;    // '#RRGGBB', copiado del catálogo al guardar
    finish: string;          // design_elements.code, categoría 'finish'
    decorations: string[];   // design_elements.code, categoría 'decoration'
  }[];
};
```

Diferencias contra la versión 1:

- Se elimina `length`. El largo lo define `service_variants.nail_length`, que la clienta ya eligió al elegir la variante. Una sola fuente de verdad.
- Se agrega `technique`, opcional y global al diseño.
- Cada uña guarda `baseColorCode` además del hex. El `code` permite saber qué esmalte del catálogo se pidió; el hex permite dibujar el diseño años después aunque la profesional haya cambiado el color asociado a ese code.
- `version: 2` en lugar de `1`. La versión 1 queda documentada en el SPEC 01 como histórica.

### Cotización

Función pura, sin acceso a base de datos:

```ts
type DesignQuote = { extraPriceClp: number; extraMinutes: number };

function calculateDesignQuote(
  payload: NailDesignPayload,
  catalog: DesignElement[],
): DesignQuote;
```

Reglas de suma:

- Los deltas de `color`, `finish` y `decoration` se cobran **una vez por uña donde se aplican**. Diez uñas con la misma decoración cobran diez veces ese delta.
- El delta de `technique` se cobra **una sola vez por diseño**, no por uña.
- Un `code` que no existe en el catálogo, o que existe con `active = false`, hace fallar la cotización. No se cotiza en silencio con delta cero.

---

## Plan de implementación

Cada paso deja el proyecto en estado ejecutable y es commiteable por sí solo.

1. **Migración de esquema.** Agregar el valor `color` al enum `element_category` y la columna `color_hex` a `design_elements`. Generar y aplicar la migración. Verificación: `db:studio` muestra la columna nueva y el enum con los cuatro valores.

2. **Dominio: tipo del payload.** Crear `src/server/domain/design/nail-design-payload.ts` con `NailDesignPayload` versión 2. Mover el tipo fuera de `src/server/infrastructure/db/schema/designs.ts`, que ahora lo importa desde dominio para su `$type<>()`. Verificación: `tsc --noEmit` limpio y el esquema sigue tipando el `jsonb`.

3. **Dominio: entidades y puerto.** Crear `src/server/domain/design/design-element.entity.ts`, `design.entity.ts` y `design-repository.port.ts`. Puro TypeScript, sin Drizzle ni Next.js. Verificación: compila sin depender de `infrastructure/`.

4. **Cotización.** Crear `src/server/domain/design/calculate-design-quote.ts`, función pura que recibe el payload y el catálogo y devuelve `{ extraPriceClp, extraMinutes }`. Aplica delta por uña para `color`, `finish` y `decoration`, y una sola vez para `technique`. Falla si un `code` no existe o está inactivo. Verificación: test cubre diez uñas con la misma decoración, técnica cobrada una vez, y `code` inexistente que lanza error.

5. **Repositorio de infraestructura.** Crear `src/server/infrastructure/repositories/drizzle-design.repository.ts` implementando el puerto del paso 3: listar el catálogo de una profesional y crear una fila en `designs`. Verificación: script manual lista el catálogo del seed y lo devuelve como entidades de dominio, no como filas crudas.

6. **Catálogo en admin: casos de uso y rutas.** Crear `src/server/application/design/configure-design-elements.use-case.ts` (crear, editar, desactivar; valida `color_hex` obligatorio cuando `category = 'color'`) y `list-design-elements.use-case.ts`. Crear `src/app/api/design-elements/route.ts` con `GET`, `POST` y `PATCH`, cada uno pasando por `requireTenantOwner`. Verificación: `POST` de un elemento `color` sin `color_hex` responde 400; con hex válido crea la fila.

7. **Catálogo en admin: página.** Crear `src/app/[slug]/admin/diseno/page.tsx` con la tabla del catálogo agrupada por categoría y el formulario de alta y edición. Desactivar es un toggle, no un borrado. Verificación: la profesional crea un color, lo edita, lo desactiva, y el elemento desactivado deja de aparecer en la lista activa.

8. **Vista previa de días con cupo.** Crear `src/server/application/booking/list-days-with-slots.use-case.ts`, que dado un mes y una duración devuelve qué días tienen al menos un slot. Reusa `generate-available-slots`. Crear `src/app/api/availability/days/route.ts`. Verificación: un mes sin reglas cargadas devuelve la lista vacía; un mes con reglas devuelve solo los días de los weekdays configurados.

9. **Diseñador: vista de las manos.** Crear `src/app/[slug]/reservar/NailDesigner.tsx` con el SVG de las dos manos y las 10 uñas clickeables, más el selector de `shape`. Estado local, sin persistir nada todavía. Verificación: clickear una uña la marca como seleccionada; el resto no.

10. **Diseñador: panel de edición y cotización en vivo.** Agregar al componente el panel de la uña seleccionada con color base, acabado y decoraciones desde el catálogo activo, el selector de `technique` global, y el botón "aplicar a todas". Mostrar el precio y los minutos extra recalculados con `calculateDesignQuote`. Verificación: aplicar una decoración a las diez uñas multiplica su delta por diez en el total mostrado; elegir una técnica lo suma una sola vez.

11. **Duración total en el cálculo de slots.** Extender `create-booking.use-case.ts` para recibir el payload del diseño opcional, cotizarlo, y usar `duration_minutes` de la variante más `extra_minutes` al pedir los slots. Verificación: test con repositorios fake comprueba que un diseño de 30 minutos extra descarta los slots que sí existían para la duración base.

12. **Creación atómica de diseño y reserva.** Extender `booking-repository.port.ts` con `createWithDesign` y su implementación en `drizzle-booking.repository.ts`. El caso de uso genera el `id` del diseño con `crypto.randomUUID()` y el repositorio ejecuta ambos inserts en un solo `db.batch([...])`, que Neon corre como una transacción. Extender `src/app/api/bookings/route.ts` para aceptar el payload del diseño, recotizarlo contra el catálogo vigente, y sumar los deltas a `price_clp` y `duration_minutes`. Verificación: una reserva con diseño deja las dos filas; un insert de `bookings` que falla no deja la fila de `designs`.

13. **Reordenar el flujo de reserva.** Modificar `src/app/[slug]/reservar/ReservarForm.tsx` al orden servicio → variante → días con cupo → diseño → fecha → hora → confirmar, con la opción de saltar el diseño. Verificación: reservar con diseño y sin diseño, ambas terminan en `pending`; la primera con `design_id`, la segunda con `null`.

14. **Tests.** Cubrir `calculateDesignQuote` (por uña, técnica una vez, code inválido), el payload versión 2, `create-booking` con diseño afectando la duración, `list-days-with-slots`, y la validación de `color_hex` en `configure-design-elements`. Verificación: `npm test` pasa en verde.

15. **Deploy.** Aplicar la migración contra Neon en producción. Verificación: la profesional carga un color en `/admin/diseno` y una clienta completa una reserva con diseño en la URL pública.

---

## Criterios de aceptación

### Esquema

- [ ] `npm run db:migrate` aplica la migración de `color_hex` y del valor `color` del enum sin errores.
- [ ] `design_elements` acepta una fila con `category = 'color'` y `color_hex = '#RRGGBB'`.
- [ ] Insertar dos filas en `design_elements` con el mismo par `(professional_id, code)` sigue siendo rechazado por la base de datos.

### Catálogo en admin

- [ ] La profesional crea un elemento de cada una de las cuatro categorías desde `/admin/diseno` y quedan guardados.
- [ ] Crear un elemento `color` sin `color_hex` es rechazado con 400 y no crea la fila.
- [ ] La profesional edita el `price_delta_clp` de un elemento y el valor nuevo queda guardado.
- [ ] Desactivar un elemento lo saca de la lista activa y no borra la fila.
- [ ] Un elemento desactivado no aparece como opción en el diseñador de la clienta.
- [ ] Una profesional no puede crear, editar ni desactivar elementos del catálogo de otro tenant.

### Diseñador

- [ ] El diseñador muestra las dos manos con 10 uñas clickeables y permite elegir `shape`.
- [ ] Clickear una uña la selecciona y el panel de edición muestra los valores de esa uña.
- [ ] Asignar color, acabado y decoraciones a una sola uña no modifica las otras nueve.
- [ ] El botón "aplicar a todas" copia la configuración de la uña seleccionada a las diez.
- [ ] La `technique` se elige una vez para todo el diseño, no por uña.
- [ ] Los colores ofrecidos son los del catálogo de la profesional, no un picker de hex libre.

### Cotización

- [ ] Aplicar una decoración a las diez uñas suma su `price_delta_clp` diez veces al total.
- [ ] Elegir una `technique` suma su `price_delta_clp` una sola vez, sin importar cuántas uñas hay.
- [ ] Los `extra_minutes` se suman con la misma regla que el precio: por uña para color, acabado y decoración; una vez para la técnica.
- [ ] Cotizar un payload con un `code` que no existe en el catálogo lanza error y no cotiza con delta cero.
- [ ] Cotizar un payload con un `code` de un elemento `active = false` lanza error.
- [ ] El precio y los minutos extra mostrados en el diseñador coinciden con los que quedan guardados en la reserva.

### Vista previa de disponibilidad

- [ ] Antes de diseñar, la clienta ve qué días del mes tienen al menos un slot para la duración base de la variante.
- [ ] Un mes sin reglas de disponibilidad cargadas no marca ningún día con cupo.
- [ ] La vista previa avisa que el horario final depende del diseño elegido.

### Integración con la reserva

- [ ] El flujo es servicio → variante → días con cupo → diseño → fecha → hora → confirmar.
- [ ] Los slots ofrecidos después de diseñar usan `duration_minutes` de la variante más `extra_minutes` del diseño.
- [ ] Un diseño que suma 30 minutos hace desaparecer slots que sí se ofrecían para la duración base.
- [ ] Reservar con diseño crea una fila en `designs` y una en `bookings` con `design_id` apuntando a ella.
- [ ] La fila creada en `designs` tiene `source = 'client'`, `name = null` y `reference_image_url = null`.
- [ ] `bookings.price_clp` es igual a `service_variants.price_clp` más `designs.extra_price_clp`.
- [ ] `bookings.duration_minutes` es igual a `service_variants.duration_minutes` más `designs.extra_minutes`.
- [ ] La clienta puede saltar el diseño y la reserva queda en `pending` con `design_id = null`.
- [ ] Un error al insertar la reserva no deja una fila huérfana en `designs`.
- [ ] Cambiar el `price_delta_clp` de un elemento después de reservar no altera el `price_clp` de la reserva ya creada.
- [ ] Enviar una reserva con un total de diseño que no coincide con la recotización del servidor es rechazado con 409 y no crea la reserva.
- [ ] Enviar una reserva cuyo diseño usa un elemento desactivado después de abrir el diseñador es rechazado y no crea la reserva.

### Tests

- [ ] `npm test` pasa en verde e incluye tests de cotización, payload versión 2, duración total en el cálculo de slots, días con cupo, y validación de `color_hex`.

---

## Decisiones

### Catálogo y colores

- **Sí:** categoría `color` en `element_category`, con el hex en `design_elements.color_hex`. La profesional carga los esmaltes que realmente tiene y la clienta no puede pedir un tono inexistente.
- **No:** picker de hex libre. Cero cambios de esquema, pero mueve el problema al chat: la clienta pide un color que no existe y alguien tiene que corregirlo a mano.
- **No:** paleta sugerida hardcodeada en el código. La profesional no la controla, y el catálogo por tenant ya es el patrón del proyecto.
- **Sí:** crear, editar y desactivar elementos. Sin borrado duro.
- **No:** borrado duro. Los payload guardan `code`; borrar un elemento dejaría diseños históricos apuntando a un `code` inexistente y sin forma de dibujarse.
- **Sí:** `color_hex` obligatorio para `category = 'color'` validado en la capa de aplicación.
- **No:** un `CHECK` en la base para esa condición. La regla es de negocio y cambia más fácil en el caso de uso que en una migración.

### Payload y modelo de datos

- **Sí:** eliminar `length` del payload. El largo lo define `service_variants.nail_length`, que la clienta ya eligió al elegir la variante.
- **No:** mantener `length` en el payload derivado de la variante. Es un dato duplicado que tarde o temprano queda en conflicto con su fuente.
- **Sí:** `version: 2`. La versión 1 nunca persistió filas, así que no hay datos que migrar, pero renumerar deja el rastro de que la forma cambió.
- **Sí:** cada uña guarda `baseColorCode` y `baseColorHex`. El `code` dice qué esmalte se pidió; el hex permite dibujar el diseño después aunque la profesional le cambie el color a ese `code`.
- **Sí:** `technique` es un campo global del diseño, no por uña. Una técnica como el degradé se aplica al conjunto, y cobrarla diez veces sería un error de cotización.
- **No:** tratar `technique` como una decoración por uña. Simple de implementar, pero cobra diez veces algo que se hace una vez.
- **No:** dejar `technique` sin uso. La categoría ya existe en el enum desde el SPEC 01; darle lugar ahora cuesta un campo.
- **Sí:** mover `NailDesignPayload` a `src/server/domain/design/`. Es un tipo de dominio puro; que viva en el archivo de esquema de Drizzle invierte la dirección de la dependencia que el SPEC 01 fijó como regla dura.

### Cotización

- **Sí:** función pura de dominio, sin acceso a base de datos. Recibe el payload y el catálogo y devuelve el par de totales. Testeable sin fakes ni mocks.
- **Sí:** los deltas de color, acabado y decoración se cobran por uña donde se aplican. Diez uñas decoradas son diez veces el trabajo.
- **Sí:** el delta de la técnica se cobra una vez por diseño.
- **No:** cobrar el color una sola vez por diseño. Si la profesional no quiere cobrar el color por uña, deja su `price_delta_clp` en `0`; es la palanca que ya tiene sin agregar otra columna.
- **Sí:** un `code` inexistente o inactivo hace fallar la cotización. Cotizar en silencio con delta cero le regalaría trabajo a la clienta sin que nadie se dé cuenta.

### Diseñador y flujo de reserva

- **Sí:** vista SVG de las dos manos con las 10 uñas clickeables. Es el diferenciador del producto y justifica el esfuerzo de UI.
- **No:** lista de 10 filas sin dibujo. Más rápido de construir, pero la clienta no ve cómo queda y el diseñador deja de ser una razón para usar el sitio.
- **No:** un solo set de opciones para las diez uñas. El payload ya está pensado para diez uñas distintas.
- **Sí:** botón "aplicar a todas". El caso común es la mano entera igual; sin ese atajo el flujo son diez configuraciones repetidas.
- **Sí:** el diseño se elige antes de la fecha y la hora. La duración total depende del diseño, así que los slots no se pueden calcular antes de conocerlo.
- **No:** diseñar después de elegir la hora. La cita duraría más que el slot reservado y se pisaría con la siguiente.
- **Sí:** vista previa de días con cupo antes de entrar al diseñador. Si no hay ningún día que le sirva, la clienta se enteraría después de diseñar y sería una pérdida de tiempo evidente.
- **No:** mostrar las horas exactas como referenciales antes de diseñar. Algunas de esas horas desaparecen al sumar los minutos del diseño, y eso se lee como un engaño.
- **Sí:** el diseño es opcional. Un esmaltado simple no necesita pasar por el diseñador, y `design_id` ya era nulable.
- **No:** flag `requires_design` por servicio. Agrega una columna y una decisión más de configuración para un problema que todavía no apareció.

### Persistencia

- **Sí:** la fila de `designs` se inserta en la misma transacción que la reserva. Sin diseños huérfanos de flujos abandonados.
- **No:** endpoint `/api/designs` aparte antes de reservar. Más fácil de testear por partes, pero cada clienta que abandona el flujo deja basura en la tabla.
- **Sí:** cada reserva crea su propia fila en `designs`, inmutable. Misma lógica que `price_clp`: es una fotografía de lo acordado.
- **No:** reutilizar o precargar el diseño de una reserva anterior. Buena UX, pero es una función aparte y no bloquea nada de este spec.
- **Sí:** `source` siempre `client` en este spec. Las plantillas se atan al portafolio (`portfolio_items.design_id`), que es SPEC 04.
- **No:** CRUD de plantillas en `/admin`. Agrega página, casos de uso y una UI de selección al flujo de reserva, todo para algo que se resuelve mejor junto al portafolio.
- **Sí:** mover la subida de imágenes fuera de este spec, contra lo anotado en el SPEC 01. Diseños, portafolio y reviews necesitan lo mismo; resolverlo una vez en un spec dedicado evita construir la integración tres veces.
- **No:** subir la foto de referencia acá con Cloudflare R2 o Vercel Blob. Es infraestructura nueva y suma un cuarto frente a un spec que ya toca catálogo, diseñador, cotización y reserva.
- **Sí:** `db.batch([...])` con el uuid del diseño generado en la aplicación. El driver `neon-http` no soporta `db.transaction()`, y `batch` corre ambos inserts en una sola transacción sin cambiar la conexión de todo el proyecto.
- **No:** migrar a `neon-serverless` con `Pool`. Da transacciones reales, pero cambia la conexión de la app entera y agrega handshake de WebSocket en cada invocación serverless para resolver un caso de dos inserts.
- **No:** insertar sin transacción y borrar el diseño en el `catch`. Si el proceso muere entre los dos inserts, la fila huérfana queda igual.
- **Sí:** el servidor recotiza el diseño al recibir la reserva y rechaza con 409 si el total no coincide con el enviado. El cliente no es fuente de verdad de un precio.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La clienta ve un día con cupo en la vista previa, diseña, y al sumar los minutos extra ese día ya no tiene ningún slot. | La vista previa avisa que el horario final depende del diseño. Si después de diseñar el día elegido queda sin slots, el mensaje dice cuántos minutos suma el diseño y ofrece volver a editarlo o elegir otro día. |
| La profesional desactiva un elemento o le cambia el precio mientras la clienta tiene el diseñador abierto. La cotización mostrada deja de ser válida. | El `POST` de la reserva recotiza el payload contra el catálogo vigente. Si el total no coincide con el que envió el cliente, responde 409 con el total nuevo y no crea la reserva. |
| Cobrar los deltas por uña puede dar totales sorpresivamente altos: diez decoraciones a $1.500 son $15.000 sobre el precio de la variante. | El diseñador muestra el desglose y el total en vivo, no solo al final. La clienta ve el número subir mientras decide. |
| `db.batch()` sirve para dos inserts con el uuid conocido de antemano, pero no para una transacción con lógica intermedia. Un spec futuro que la necesite se topa con el límite del driver `neon-http`. | El límite queda documentado acá. Si aparece ese caso, se evalúa migrar a `neon-serverless` con `Pool` en ese momento, no antes. |
| El SVG de diez uñas en pantalla de teléfono deja áreas de toque muy chicas. | Cada uña tiene un área de toque mínima de 44 px independiente de su tamaño visual. Se verifica en el viewport mobile antes de cerrar el paso 9. |
| El SPEC 01 documenta `NailDesignPayload` versión 1 con `length`. Alguien que lea solo ese spec escribe la forma vieja. | El tipo vive en un único archivo, `src/server/domain/design/nail-design-payload.ts`, y es la única fuente de verdad. El SPEC 01 queda como registro histórico. |
