# SPEC 19 — Reglas de reserva, recordatorios, reagendar y vista de agenda (fase 2)

**Estado:** Implemented
**Alcance:** que la profesional decida cómo se reserva (confirmación automática, intervalo de horarios, anticipación mínima y máxima, plazo para cancelar), que las clientas reciban un recordatorio el día antes, que cualquiera de las dos pueda reagendar sin cancelar, y que la profesional vea su semana como una agenda y no como una lista.

Roadmap y contexto: [SPEC 18](18-agenda-confiable.md).

---

## 1. Reglas de reserva (`BookingPolicy`)

Columnas nuevas en `professionals` (migración 0023), expuestas en el dominio como `professional.bookingPolicy`:

| Regla | Columna | Default | Efecto |
|---|---|---|---|
| Confirmación automática | `auto_confirm` | `false` | La reserva de la clienta nace `confirmed` en vez de `pending`. |
| Intervalo de horarios | `slot_interval_minutes` | `NULL` | Cada cuánto se ofrece un horario. `NULL` = cada duración del servicio (comportamiento de hoy). Con 30, un servicio de 45 min se ofrece 9:00, 9:30, 10:00… |
| Anticipación mínima | `min_lead_minutes` | `120` | Hoy era fijo en 2 h. |
| Anticipación máxima | `max_advance_days` | `NULL` | Cuántos días hacia adelante se puede reservar. `NULL` = sin límite. |
| Plazo para cancelar | `cancellation_deadline_hours` | `0` | La clienta puede cancelar o reagendar hasta N horas antes. `0` = siempre. Pasado el plazo, se le ofrece escribir por WhatsApp. |

`computeDaySlots` recibe intervalo, anticipación mínima y máxima. Toda la generación de horarios (días con cupo, horarios de un día, validación al crear) pasa por ahí, así que las reglas valen en todos lados.

La pantalla `/admin/disponibilidad` suma la sección "Reglas de reserva". El plazo de cancelación se muestra a la clienta al reservar y en "Mis reservas".

## 2. Recordatorio el día antes

- `bookings.reminder_sent_at` (migración 0023) hace el envío idempotente.
- `GET /api/cron/reminders`, protegido con `Authorization: Bearer $CRON_SECRET` (el header que envía Vercel Cron).
- Un cron diario (`vercel.json`, 14:00 hora de Chile = 17:00 UTC) busca las reservas `confirmed` de **mañana** en la zona horaria de cada profesional que no tengan recordatorio, envía el correo y marca `reminder_sent_at`. Diario y no horario porque el plan Hobby de Vercel solo permite crons diarios.
- El correo incluye la hora, el servicio, el enlace a "Mis reservas" (cancelar o reagendar) y el WhatsApp de la profesional.
- Sin `CRON_SECRET` configurada, el endpoint responde 503: nunca queda abierto.

## 3. Reagendar

`POST /api/bookings/[id]/reschedule` con `{ date, time }`, para reservas `pending` o `confirmed`.

- **Clienta:** solo dentro del plazo de cancelación, y solo a un horario que ofrezca el motor de horarios. Su propia reserva no cuenta como ocupada (`excludeBookingId`), así puede moverla media hora.
- **Profesional:** a cualquier hora que no choque con otra reserva (mismo criterio que la reserva manual); el constraint `bookings_no_overlap` lo garantiza.
- Escritura condicional (`WHERE status IN ('pending','confirmed')`), igual que el resto de los cambios de estado.
- Avisos: si reagenda la clienta, correo a la profesional; si reagenda la profesional, correo a la clienta. Google Calendar se actualiza (borra y vuelve a crear el evento), best effort.
- `reminder_sent_at` se limpia: la nueva hora merece su propio recordatorio.
- UI: botón "Reagendar" en "Mis reservas" (elige día y horario libre) y en el panel de reservas (fecha y hora libres).

## 4. Vista de agenda

`/admin/agenda`: semana en columnas (lunes a domingo) con las reservas pendientes y confirmadas ordenadas por hora, nombre de la clienta, servicio y estado. Navegación por semana y botón "Hoy". En el teléfono se ve un día a la vez. Entra al menú del panel después de "Resumen".

---

## Criterios de aceptación

1. Con confirmación automática, la reserva de la clienta queda confirmada y recibe el correo de confirmación; la profesional igual recibe el aviso de reserva nueva.
2. Con intervalo de 30 min, un servicio de 45 min en un horario 9:00–11:00 ofrece 9:00, 9:30, 10:00.
3. Con anticipación máxima de 14 días, no se ofrecen días más allá.
4. Con plazo de 24 h, la clienta no puede cancelar ni reagendar una reserva de mañana temprano; la profesional sí.
5. El cron envía un solo recordatorio por reserva confirmada de mañana, aunque corra dos veces.
6. Reagendar mueve la reserva, avisa a la otra parte y limpia el recordatorio.
7. La agenda semanal muestra cada reserva activa en su día y hora.
