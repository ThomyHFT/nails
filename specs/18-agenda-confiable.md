# SPEC 18 — Agenda confiable (fase 1 del roadmap de producto)

**Estado:** Implemented (migración 0022 pendiente de aplicar en Neon)
**Alcance:** que la agenda del sistema sea *la* agenda de la profesional, no una más al lado de WhatsApp y el cuaderno. Horario semanal que se repite solo, bloqueo de rangos de horas, reserva manual (incluida la clienta sin cuenta), teléfono y nota de la clienta, aviso a la profesional cuando la clienta cancela y enlaces de WhatsApp (`wa.me`, sin API).

Hoy una profesional que se olvida de cargar el mes queda con el sitio sin horas (le pasó a `/karla` en noviembre y diciembre de 2026); las reservas que llegan por Instagram o WhatsApp no se pueden anotar; no hay forma de bloquear "de 15 a 17 tengo trámite"; y la profesional no tiene el teléfono de sus clientas ni se entera cuando una cancela.

---

## Roadmap de producto (contexto)

| Fase | Spec | Contenido |
|---|---|---|
| 1 | **18 (este)** | Agenda confiable |
| 2 | 19 | Recordatorio 24 h, vista de calendario día/semana, reagendar, política de cancelación, confirmación automática, intervalo y anticipación configurables |
| 3 | 20 | Reservar sin contraseña (código por correo), ficha de clienta con notas privadas, cuenta (cambiar contraseña/correo), exportar CSV, reportes, PWA |
| 4 | 21 | Abono por transferencia, lista de espera, "vuelve a reservar", opiniones con foto compartibles, paquetes y gift cards, link corto |
| 5 | 22 | Plan Salón (varias profesionales por tenant) |
| — | — | Fuera por ahora: pasarela de pago y cobro de suscripción; API de WhatsApp |

Las migraciones de cada fase se escriben y se validan contra Postgres en memoria (PGlite), y se aplican a Neon a mano: no hay base de desarrollo todavía.

---

## 1. Horario semanal recurrente

### 1.1 `effective_month` pasa a ser opcional

`availability_rules.effective_month = NULL` es el **horario semanal**: se aplica a todos los meses. Una regla con mes es una **excepción mensual** que reemplaza al horario semanal en ese mes completo (vacaciones, temporada alta).

Resolución, en una función pura del dominio (`resolveRulesForMonth`): si el mes tiene reglas propias se usan esas; si no, las semanales. No se mezclan: un mes con reglas propias es un horario distinto, no un parche.

### 1.2 Migración

- `effective_month` deja de ser `NOT NULL`.
- Índice único parcial `(professional_id, weekday) WHERE effective_month IS NULL` para el horario semanal (el índice existente sigue cubriendo las reglas con mes).
- **Backfill:** para cada profesional, las reglas de su mes más reciente se copian como horario semanal. Ningún sitio queda sin horas el día que se despliega.

### 1.3 UI

`/admin/disponibilidad` edita por defecto el horario semanal ("se repite todos los meses"). Un interruptor "Solo para {mes}" guarda una excepción mensual, y "Volver al horario semanal" la borra. El aviso "mes sin cargar" desaparece: solo se avisa si no hay horario semanal.

## 2. Bloqueo de rangos de horas

`availability_exceptions` con `kind = 'blocked'` ya tiene `start_time`/`end_time` opcionales, pero hoy cualquier bloqueo tapa el día entero. Ahora: sin horas bloquea el día, con horas resta solo ese rango. Sin migración.

## 3. Teléfono y nota de la clienta

- **Registro de clienta:** el teléfono pasa a ser obligatorio.
- **Reservar:** campo "Nota para la profesional" (opcional, máx. 500 caracteres). Si la clienta no tiene teléfono (cuentas anteriores a este spec), se le pide y se guarda en su usuario.
- **Admin:** reservas y clientes muestran teléfono y nota, con un botón de WhatsApp (`wa.me`) cuando hay teléfono.

## 4. Reserva manual

`POST /api/bookings/manual` (solo la profesional dueña). La reserva nace `confirmed`, porque la profesional ya habló con la clienta.

- **Clienta existente:** se elige de su listado.
- **Clienta nueva:** nombre + teléfono (+ correo opcional). Si el correo ya existe se reutiliza esa cuenta; si no, se crea una clienta **sin contraseña** (hash inutilizable). Sin correo se usa uno de relleno `sin-correo+<uuid>@agenda.invalid` (`.invalid` es un TLD reservado, RFC 2606), y `isPlaceholderEmail` impide enviarle correos. Esa clienta puede activar su cuenta después con "Olvidé mi contraseña" si registra su correo real.
- **Horario:** la profesional puede agendar fuera de su horario publicado (es su agenda), pero no encima de otra reserva activa: el constraint `bookings_no_overlap` (migración 0021) lo impide y responde "ese horario ya está ocupado".

## 5. Aviso a la profesional cuando la clienta cancela

`SendBookingNotificationUseCase`, con `type = 'cancellation'` y `cancelled_by = 'client'`, además del correo a la clienta envía uno a la profesional con el nombre, la fecha y el WhatsApp de la clienta.

## 6. WhatsApp de la profesional en los correos

Los correos a la clienta (pendiente, confirmada, cancelada) incluyen "Escríbele por WhatsApp" con el `wa.me` de la profesional cuando su teléfono es visible (`isPhoneVisible`).

---

## Criterios de aceptación

1. Una profesional con horario semanal recibe reservas en cualquier mes futuro sin volver a cargar nada.
2. Una excepción mensual reemplaza el horario semanal solo en ese mes.
3. Un bloqueo 15:00–17:00 quita solo esos slots; un bloqueo sin horas, el día.
4. Una clienta nueva no puede registrarse sin teléfono; la profesional lo ve con botón de WhatsApp.
5. La nota que la clienta escribe al reservar aparece en el panel de reservas.
6. La profesional agenda a una clienta sin cuenta; la reserva queda confirmada, la clienta aparece en Clientes y no se envía correo a la dirección de relleno.
7. Una reserva manual encima de otra activa se rechaza.
8. La profesional recibe un correo cuando una clienta cancela.
