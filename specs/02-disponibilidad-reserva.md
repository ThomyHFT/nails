# SPEC 02 — Configuración de disponibilidad y reserva de hora

> **Estado:** Implemented
> **Depende de:** SPEC 01
> **Fecha:** 2026-07-31
> **Objetivo:** Permitir que la profesional configure su disponibilidad mes a mes y que la clienta reserve hora dentro de esos horarios, con confirmación manual y registro de cancelaciones por clienta.

---

## Alcance

**Dentro:**

- CRUD de `availability_rules` desde `/admin`: la profesional carga, por mes, qué días de la semana trabaja y su rango horario (`start_time`–`end_time`). Cada regla queda atada a un mes (`effective_month`) — no hay recurrencia indefinida.
- CRUD de `availability_exceptions` desde `/admin`: bloqueo de un día puntual (`blocked`) o extensión de horario puntual (`extra`), independiente del mes cargado.
- Campo `buffer_minutes` configurable por la profesional en `/admin` (tiempo de gracia entre citas consecutivas).
- Cálculo dinámico de slots disponibles según la duración del `service_variant` elegido y el `buffer_minutes` vigente — sin grilla fija.
- Ventana de reserva: solo dentro del mes con reglas ya cargadas por la profesional. Si el mes siguiente no tiene reglas, no se puede reservar en él todavía.
- Anticipación mínima de 2 horas para reservar.
- Flujo de reserva de la clienta: elegir servicio → variante → fecha → hora disponible → confirmar. `design_id` queda `null` (se integra en SPEC 03).
- Reserva nace en `pending`.
- La profesional confirma (`pending → confirmed`) con un botón simple desde `/admin`.
- La profesional marca manualmente `completed` o `no_show` después de la hora de la cita, desde `/admin`.
- La clienta puede cancelar su propia reserva desde `/cuenta`, sin corte de tiempo.
- Registro de strikes: cada cancelación hecha por la clienta (`cancelled_by = 'client'`) suma un strike en la relación clienta-profesional (no cruza entre profesionales). Visible para la profesional en `/admin`, sin bloqueo automático.
- Listado de reservas en `/admin` (por estado) y en `/cuenta` (historial de la clienta).
- Tests con Vitest sobre generación de slots, creación/cancelación de reserva y conteo de strikes.

**Fuera de alcance (para specs futuros):**

- Diseño de uñas asociado a la reserva. Va en el SPEC 03; `design_id` queda nulo en este spec.
- Notificaciones por email de confirmación, recordatorio o cancelación. Requiere Resend, fuera de este spec.
- Bloqueo automático o límite de reservas para clientas con muchos strikes. Solo visibilidad en este spec.
- Autocompletado automático de reservas pasadas sin marcar. Se mantiene manual.
- Reglas de disponibilidad recurrentes indefinidas o plantillas mensuales reutilizables. Cada mes se carga a mano.
- Reprogramación de una reserva existente (cambiar fecha/hora sin cancelar y crear una nueva).

---

## Modelo de datos

Cambios sobre el esquema del SPEC 01. No se agregan tablas nuevas — el conteo de strikes se calcula por consulta sobre `bookings`, no se materializa.

**`professionals`** — agrega columna:

| Columna           | Tipo                    | Nota                                        |
| ----------------- | ----------------------- | -------------------------------------------- |
| `buffer_minutes`  | integer, default `0`    | Minutos de gracia entre citas consecutivas   |

**`availability_rules`** — agrega columna, deja de ser recurrencia indefinida:

| Columna            | Tipo         | Nota                                                                 |
| ------------------ | ------------ | --------------------------------------------------------------------- |
| `effective_month`  | date         | Primer día del mes al que aplica la regla (ej. `2026-08-01`)          |

Índice único sobre `(professional_id, weekday, effective_month)` — evita cargar la misma regla dos veces para el mismo mes.

`availability_exceptions` y `bookings` no cambian de forma; `bookings.status = 'no_show'` y `bookings.cancelled_by = 'client'` (ya existentes en SPEC 01) son los campos que este spec empieza a usar.

Tipo usado internamente por el cálculo de slots (no persiste en base):

```ts
type AvailableSlot = {
  startsAt: string; // ISO, America/Santiago
  endsAt: string;
};
```

Conteo de strikes: `SELECT count(*) FROM bookings WHERE professional_id = ? AND client_user_id = ? AND cancelled_by = 'client'`. Se resuelve en el caso de uso que arma el listado de `/admin`, no se persiste como columna aparte.

---

## Plan de implementación

1. **Migración de esquema.** Agregar `buffer_minutes` a `professionals` y `effective_month` a `availability_rules`, más el índice único `(professional_id, weekday, effective_month)`. Generar y aplicar la migración. Verificación: `db:studio` muestra ambas columnas.

2. **Dominio: entidades y puertos.** Crear `src/server/domain/availability/availability-rule.entity.ts`, `availability-exception.entity.ts`, `availability-repository.port.ts`, y `src/server/domain/booking/booking.entity.ts`, `booking-repository.port.ts`. Puro TypeScript, sin Drizzle ni Next.js. Verificación: compila sin depender de `infrastructure/`.

3. **Repositorios de infraestructura.** Crear `src/server/infrastructure/repositories/drizzle-availability.repository.ts` y `drizzle-booking.repository.ts` implementando los puertos del paso 2. Verificación: script manual inserta una regla y una reserva y las lee de vuelta como entidades de dominio.

4. **Cálculo de slots.** Crear `src/server/application/booking/generate-available-slots.use-case.ts`: dado `professional_id`, `service_variant_id` y fecha, combina `availability_rules` del mes, resta `availability_exceptions`, resta bloques ya ocupados por `bookings` activas (`pending`/`confirmed`), aplica `buffer_minutes` entre bloques, y descarta horarios a menos de 2 horas de ahora. Verificación: test con repositorios fake cubre regla simple, excepción `blocked`, excepción `extra`, reserva existente con buffer, y corte de 2 horas.

5. **Configuración de disponibilidad (admin).** Crear casos de uso `configure-availability-rules.use-case.ts`, `configure-availability-exceptions.use-case.ts`, `update-buffer-minutes.use-case.ts`. Crear rutas `src/app/api/availability/rules/route.ts`, `exceptions/route.ts`, `buffer/route.ts`, y página `src/app/[slug]/admin/disponibilidad/page.tsx` con formularios para cargar los días del mes, excepciones puntuales y el buffer. Verificación: la profesional carga días para el mes actual y quedan guardados; sin reglas cargadas, el mes siguiente no ofrece slots.

6. **Flujo de reserva (clienta).** Crear `create-booking.use-case.ts` (valida slot vigente contra `generate-available-slots`, calcula `price_clp` y `duration_minutes` desde el `service_variant`, crea en `pending`). Crear ruta `src/app/api/bookings/route.ts` y página `src/app/[slug]/reservar/page.tsx`: elegir servicio → variante → fecha → hora → confirmar. Verificación: reservar un slot válido crea la fila; reintentar el mismo slot inmediatamente después falla porque ya está ocupado.

7. **Acciones de la profesional.** Crear casos de uso `confirm-booking.use-case.ts`, `complete-booking.use-case.ts`, `mark-no-show.use-case.ts` (cada uno valida que la reserva pertenezca a la profesional autenticada). Crear rutas correspondientes y página `src/app/[slug]/admin/reservas/page.tsx` listando reservas por estado con botones de acción. Verificación: confirmar cambia `pending→confirmed`; marcar completada o no-show solo está disponible después de `ends_at`.

8. **Cancelación y strikes.** Crear `cancel-booking.use-case.ts` (solo la clienta dueña, setea `status='cancelled'`, `cancelled_by='client'`, `cancelled_at=now()`). Agregar botón de cancelar en `src/app/[slug]/cuenta/page.tsx`. Agregar conteo de strikes por clienta al listado de `/admin/reservas` (consulta descrita en el modelo de datos). Verificación: cancelar como clienta libera el slot y sube el contador de strikes visible en `/admin/reservas`; cancelar por la profesional no suma strike.

9. **Tests.** Cubrir `generate-available-slots`, `create-booking` (slot ocupado, anticipación mínima), `cancel-booking` (strike solo si `cancelled_by='client'`), y los guards de pertenencia en las acciones de la profesional. Verificación: `npm test` pasa en verde.

10. **Deploy.** Aplicar la migración contra Neon en producción. Verificación: la profesional carga disponibilidad del mes y una clienta completa una reserva en la URL pública.

---

## Criterios de aceptación

### Esquema

- [x] `npm run db:migrate` aplica la migración de `buffer_minutes` y `effective_month` sin errores.
- [x] Insertar dos filas en `availability_rules` con el mismo `(professional_id, weekday, effective_month)` es rechazado por la base de datos.

### Configuración de disponibilidad

- [x] La profesional carga reglas de disponibilidad para el mes actual desde `/admin/disponibilidad` y quedan guardadas.
- [x] Un mes sin reglas cargadas no ofrece slots disponibles.
- [x] La profesional bloquea un día puntual (`blocked`) y ese día deja de ofrecer slots, sin importar el mes cargado.
- [x] La profesional agrega una excepción `extra` y ese horario extra aparece disponible.
- [x] La profesional configura `buffer_minutes` y el valor se refleja en el cálculo de slots.

### Cálculo de slots

- [x] Los slots ofrecidos respetan la duración del `service_variant` elegido, sin grilla fija.
- [x] Entre dos slots consecutivos se respeta el `buffer_minutes` configurado.
- [x] No se ofrecen slots a menos de 2 horas de la hora actual.
- [x] Un horario ya ocupado por otra reserva `pending` o `confirmed` no aparece como disponible.

### Reserva (clienta)

- [x] La clienta completa el flujo servicio → variante → fecha → hora → confirmar y la reserva queda en `pending` con `design_id = null`.
- [x] `price_clp` y `duration_minutes` de la reserva creada coinciden con los de la variante elegida al momento de reservar.
- [x] Reservar un slot que ya fue tomado por otra reserva es rechazado.
- [x] La clienta ve su historial de reservas en `/cuenta`.

### Acciones de la profesional

- [x] La profesional confirma una reserva `pending` desde `/admin/reservas` y pasa a `confirmed`.
- [x] La profesional marca una reserva como `completed` o `no_show` solo después de `ends_at`.
- [x] Una profesional no puede accionar sobre una reserva de otro tenant.

### Cancelación y strikes

- [x] La clienta cancela su propia reserva desde `/cuenta`, sin corte de tiempo, y el slot vuelve a estar disponible.
- [x] Cancelar como clienta suma un strike visible en `/admin/reservas`, específico de la relación con esa profesional.
- [x] Cancelar por parte de la profesional no suma strike.
- [x] Una clienta no puede cancelar la reserva de otra clienta.

### Tests

- [x] `npm test` pasa en verde e incluye tests de generación de slots, creación y cancelación de reserva, y conteo de strikes.

---

## Decisiones

### Disponibilidad

- **Sí:** `availability_rules` atada a `effective_month`, sin recurrencia indefinida. Refleja que los días de trabajo rotan mes a mes.
- **No:** recurrencia semanal indefinida con excepciones para cubrir la rotación. Con rotación mensual real, las excepciones terminarían cubriendo la mayoría de las semanas — más trabajo que cargar el mes directo.
- **Sí:** el mes se habilita solo cuando la profesional carga sus reglas. Sin reglas, no hay slots.
- **No:** fallback automático que reutiliza las reglas del mes anterior. La profesional pidió cargar mes a mes a propósito porque los días cambian.
- **Sí:** `buffer_minutes` como campo único en `professionals`, configurable desde `/admin`.
- **No:** buffer por regla o por servicio. Un valor global es suficiente para el caso de uso descrito y evita una UI más compleja.
- **Sí:** slots calculados dinámicamente según la duración de la variante elegida, sin grilla fija de 15/30 min.
- **No:** grilla fija. Con duraciones variables por variante, una grilla fija deja huecos muertos o corta reservas a la mitad.

### Reservas

- **Sí:** `design_id` queda `null` en toda reserva creada por este spec. El diseño se integra en el SPEC 03 sin tocar el flujo de reserva ya construido.
- **Sí:** anticipación mínima de 2 horas para reservar.
- **No:** ventana de anticipación configurable por la profesional. Fija por ahora; se revisita si hace falta.
- **Sí:** confirmación, completado y no-show son acciones manuales de la profesional, sin automatismo por tiempo.
- **No:** autocompletar reservas pasadas sin marcar. Un automatismo por tiempo puede marcar como completada una cita que en realidad no se hizo.
- **Sí:** botón simple para confirmar, sin mensaje ni notificación asociada. No hay email en este spec.

### Cancelación y strikes

- **Sí:** la clienta puede cancelar sin corte de tiempo.
- **No:** ventana de cancelación (ej. 24h antes). No se pidió, y agregarla ahora es una regla de producto que puede ajustarse después sin tocar el esquema.
- **Sí:** el strike solo cuenta cancelaciones con `cancelled_by = 'client'`. Cancelar por parte de la profesional (ej. imprevisto) no debe penalizar a la clienta.
- **Sí:** el conteo de strikes es específico de la relación clienta-profesional, no global. Una clienta puede tener buen historial con una profesional y strikes con otra.
- **No:** materializar el conteo en una columna o tabla aparte. Se calcula por consulta sobre `bookings`; el volumen esperado no justifica la complejidad de mantenerlo sincronizado.
- **Sí:** los strikes son solo visibles, sin bloqueo ni límite automático. La profesional decide caso a caso si da menos preferencia.
- **No:** bloqueo automático de reservas para clientas con muchos strikes. Cambia el producto de "visibilidad para decidir" a "rechazo automático", que no fue lo pedido.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Condición de carrera: dos clientas reservan el mismo slot casi al mismo tiempo. | `create-booking` valida el slot contra reservas activas dentro de la misma transacción antes de insertar; el índice y la validación en la capa de aplicación rechazan el segundo intento. |
| La profesional olvida cargar las reglas del mes siguiente y queda sin reservas habilitadas por varios días. | El mes se deshabilita explícitamente, no silenciosamente: `/admin/disponibilidad` muestra un aviso claro cuando el mes en curso o el próximo no tiene reglas cargadas. |
| El conteo de strikes por consulta (`count(*)` sobre `bookings`) puede volverse costoso si el historial crece mucho. | A la escala de una profesional el volumen es bajo; si crece, se evalúa materializar el conteo en ese momento. |
| Cancelar sin corte de tiempo permite cancelar minutos antes de la cita repetidamente sin más consecuencia que el strike. | Aceptado en este spec — el strike es la señal; un límite duro queda para un spec futuro si el problema se vuelve real. |
| El buffer global no distingue servicios que en la práctica necesitan más o menos tiempo de preparación entre citas. | Aceptado por ahora; se revisita si la profesional pide buffer por servicio. |
