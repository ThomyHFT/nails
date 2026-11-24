# SPEC 21 — Abono por transferencia, lista de espera, vuelve a reservar, opiniones compartibles, paquetes, gift cards y link corto (fase 4)

**Estado:** Implemented
**Alcance:** que la profesional pueda pedir un abono contra las inasistencias sin pasarela de pago, que una hora que se libera no quede vacía, que las clientas recurrentes vuelvan solas, que las opiniones con foto se puedan compartir, que pueda vender paquetes y gift cards, y que tenga un link y un QR para Instagram y Google.

Roadmap y contexto: [SPEC 18](18-agenda-confiable.md). Sin pasarela de pago ni API de WhatsApp: el dinero se mueve por transferencia o en persona, y la profesional lo registra a mano.

Migración única: `0025_deposit_waitlist_packages`.

---

## 1. Abono por transferencia

Opcional por profesional. `professionals.deposit_clp` (`NULL` = sin abono) y `professionals.bank_details` (jsonb: banco, tipo de cuenta, número, titular, RUT, correo).

- Al reservar, la reserva guarda una fotografía del abono: `bookings.deposit_clp = min(deposit_clp, price_clp)`. Una reserva manual no lleva abono.
- Con abono, la reserva nace `pending` aunque la profesional tenga confirmación automática: confirmar sin haber recibido el abono deja el problema que el abono resuelve.
- La clienta ve el monto y los datos de transferencia al terminar de reservar, en "Mis reservas" y en el correo de solicitud, con un enlace de WhatsApp a la profesional para mandar el comprobante.
- La profesional ve "Abono pendiente" en la reserva y la acción **Abono recibido**, que marca `bookings.deposit_paid_at` y confirma la reserva si estaba pendiente. `POST /api/bookings/[id]/deposit`.
- Activar el abono exige los datos de transferencia completos. Se configura en Disponibilidad, junto a las reglas de reserva. `PUT /api/professional/commerce` (abono, vuelve a reservar y gift cards en un solo formulario).
- El abono no vence solo: el cron es diario y cancelar automáticamente una hora pagada a medianoche sería peor. La profesional rechaza la solicitud si no llega.

## 2. Lista de espera

Tabla `waitlist_entries`: `professional_id`, `client_user_id`, `service_variant_id`, `date` (día local), `created_at`, `notified_at`. Una por clienta, negocio y día.

- En la reserva, un día sin horas ofrece "Avisarme si se libera una hora" (exige sesión). `POST /api/waitlist` `{ slug, serviceVariantId, date }`. Máximo 5 entradas futuras por clienta y negocio. `DELETE /api/waitlist/[id]` para salir.
- Cuando una reserva activa se libera (la clienta cancela, la profesional rechaza o cancela, o se reagenda a otro día), se avisa por correo a todas las clientas en espera de ese día que no fueron avisadas, con un enlace a reservar ese servicio ese día. Gana la primera que reserva. Cada entrada se avisa una sola vez (`notified_at`).
- La clienta ve sus esperas en "Mis reservas". La profesional ve la lista de espera de los próximos días en Reservas, con WhatsApp de cada clienta.

## 3. Vuelve a reservar

- En "Mis reservas", cada reserva completada ofrece **Reservar de nuevo**: abre la reserva con el mismo servicio y variante.
- `professionals.rebook_after_days` (`NULL` = apagado, 7 a 120). El cron diario busca reservas completadas cuyo día local fue hace exactamente N días, de clientas que no tienen otra reserva activa futura ni una completada más nueva con el negocio, y les manda "¿Agendamos tu próxima hora?" con el enlace al mismo servicio. Se marca `bookings.rebook_sent_at` antes de enviar, como el recordatorio. Se configura junto a las reglas de reserva.
- En Clientes, las clientas sin hora futura tienen **Invitar a volver**: un `wa.me` con el mensaje y el enlace ya escritos.

## 4. Opiniones compartibles

- `/[slug]/opiniones/[reviewId]`: una opinión aprobada sola, con su foto. Su `og:image` es la foto o, sin foto, una tarjeta generada con la cita y las estrellas, así se ve bien al compartirla en WhatsApp o Instagram. Botones: compartir (Web Share API), copiar enlace y WhatsApp.
- Cada opinión del listado público y del panel enlaza a su página.
- En Reservas, una reserva completada sin opinión tiene **Pedir opinión**: `wa.me` a la clienta con el enlace a `/cuenta/opinar/[bookingId]`.

## 5. Paquetes

- Catálogo `packages`: nombre, servicio, sesiones (2 a 50), precio, activo. Se administra en `/admin/paquetes`.
- Se venden fuera de la app (transferencia o en persona). La profesional registra la venta en la ficha de la clienta: `client_packages` guarda una fotografía (nombre, servicio, sesiones, precio) y la fecha.
- Usar una sesión: en la ficha, **Usar una sesión** crea una fila en `package_redemptions` (con la reserva si se elige). Sesiones restantes = total − usadas. Se puede deshacer la última.
- El micrositio muestra los paquetes activos con "Lo quiero", un `wa.me` a la profesional con el paquete escrito.

## 6. Gift cards

- `professionals.gift_cards_enabled`. Encendido, el micrositio ofrece "Regalar una gift card" (`wa.me` a la profesional).
- La profesional la emite en `/admin/paquetes` después de recibir el pago: monto, quién la regala, para quién, mensaje y vencimiento opcional. Código de 10 caracteres sin ambigüedad (`ABCD-EF23GH`) generado con aleatoriedad criptográfica.
- `/[slug]/regalo/[código]`: la tarjeta con la marca del negocio, el saldo y el botón de reservar. Lo que la profesional manda a quien la regaló.
- Cobrar: la profesional descuenta un monto (`gift_card_redemptions`) hasta el saldo. Se puede anular una gift card sin usar.

## 7. Link corto y QR

- `/[slug]/r` redirige a la reserva; `/[slug]/r/[código]` a la reserva de un servicio (los primeros 8 caracteres de su id). Son los enlaces para la bio de Instagram y el botón "Reservar" de Google.
- `/admin/compartir`: el link del micrositio, el de reservar y uno por servicio, cada uno con copiar y su QR descargable (SVG).

## Decisiones tomadas al implementar

- Abono, "vuelve a reservar" y gift cards viven en `Professional.commerce` (un objeto, como `bookingPolicy`) y se guardan con un solo endpoint.
- Los datos de transferencia se guardan aunque el abono esté apagado: apagarlo un mes no obliga a reescribirlos. Un abono sin datos completos no se cobra (`depositForPrice` devuelve `null`).
- Con abono, la pantalla final de la reserva dice "¡Solicitud enviada!" en vez de "¡Reserva confirmada!". Antes decía confirmada aunque la reserva quedara pendiente.
- La profesional también puede "Confirmar sin abono": la regla es suya.
- El calendario de la reserva distingue los días **completos** (hay horario pero las reservas lo ocupan) de los cerrados. Solo los completos admiten lista de espera: anotarse un día que la profesional no atiende no sirve de nada.
- La lista de espera se avisa al cancelar, rechazar o reagendar; no al marcar no-show, porque esa hora ya pasó.
- "Vuelve a reservar" tiene 3 días de margen: si el cron no corrió un día, la invitación sale igual. Una reserva que ya no corresponde (la clienta tiene hora o volvió) se marca para no revisarla cada día.
- Los paquetes no se descuentan solos al completar una reserva: la profesional usa la sesión en la ficha. Descontar automático exigía decidir qué hacer con una completada por error, y ella ya marca la reserva a mano.
- Las gift cards se cobran por monto, con saldo, no de una vez: una tarjeta de $30.000 alcanza para más de un servicio.
- Sesiones y saldo se descuentan con un `INSERT ... SELECT` condicional (validado en PGlite): dos clics seguidos no dejan nada negativo.
- La página de la gift card no se indexa: lleva nombres y un mensaje personal.
- La imagen para compartir una opinión se genera siempre (con la foto adentro si existe), en vez de usar la foto sola: así la vista previa muestra también la cita y el negocio.
- Nueva dependencia `qrcode` para los QR en SVG.

## Criterios de aceptación

1. Con abono, la reserva nace pendiente con el monto congelado, la clienta ve cómo transferir y la profesional la confirma con "Abono recibido".
2. Sin datos de transferencia no se puede activar el abono.
3. Una clienta en espera recibe un correo cuando se libera una hora de ese día, una sola vez.
4. El cron manda "vuelve a reservar" una sola vez por reserva y nunca a una clienta que ya tiene hora.
5. La página de una opinión aprobada tiene vista previa al compartirla; una pendiente o rechazada da 404.
6. Las sesiones de un paquete y el saldo de una gift card nunca quedan negativos.
7. `/[slug]/r` y `/[slug]/r/[código]` llevan a la reserva; un código desconocido lleva a la reserva sin servicio.
