# SPEC 22 — Plan Salón: varias profesionales por negocio (fase 5)

**Estado:** Implemented
**Alcance:** que un salón con 2 a 6 profesionales use una sola cuenta: un micrositio, un catálogo y una agenda por integrante, la clienta elige con quién atenderse (o "sin preferencia"), y cada integrante entra a ver y manejar solo lo suyo.

Roadmap y contexto: [SPEC 18](18-agenda-confiable.md). Sin cobro de suscripción: el superadmin activa el plan a mano.

Decisiones del dueño del producto:
- Las integrantes tienen acceso propio y limitado: su agenda, sus reservas y su cuenta.
- El plan lo activa el superadmin, con un tope de integrantes.
- El precio es del servicio, igual para todas. La dueña elige qué servicios hace cada una.

Migración única: `0026_salon_staff`.

---

## 1. Modelo

- `professionals.plan` (`solo` | `salon`, por defecto `solo`) y `professionals.staff_limit` (por defecto 1).
- `staff_members`: `professional_id`, `user_id` (único, opcional), `name`, `is_owner`, `active`, `all_services`, `sort_order`. Una sola dueña por negocio (índice único parcial).
- `staff_services`: qué servicios hace una integrante cuando `all_services = false`.
- `availability_rules`, `availability_exceptions` y `bookings` ganan `staff_id` (no nulo). El horario, los bloqueos y las reservas son **por integrante**.
- El constraint `bookings_no_overlap` pasa de `professional_id` a `staff_id`: dos integrantes pueden atender a la misma hora, una misma no.
- `user_role` gana `staff`.

**Backfill:** cada negocio existente recibe una integrante dueña (`is_owner`, con el nombre y el usuario de la dueña), y todas sus reglas, excepciones y reservas se le asignan. Un negocio `solo` sigue funcionando igual que hoy: tiene exactamente una integrante y la interfaz no muestra nada de equipo.

Un negocio nuevo nace con su integrante dueña (en el mismo `db.batch` del alta).

## 2. Superadmin

En `/admin`, por negocio: plan Solo / Salón y tope de integrantes (2 a 6). `PATCH /api/admin/professionals/[id]/plan`. Bajar de plan no borra integrantes: las que sobran quedan inactivas y sus reservas futuras siguen en pie.

## 3. Equipo (dueña)

`/admin/equipo`, visible solo con plan Salón:
- Agregar integrante: nombre y, opcional, correo para darle acceso. Hasta `staff_limit` activas contando a la dueña.
- Por integrante: activar o desactivar, servicios que hace (todos o una lista), y su horario y bloqueos (la pantalla de Disponibilidad gana un selector de integrante).
- Dar acceso: crea un usuario `staff` sin contraseña con ese correo (si el correo ya existe, se rechaza). Entra con el código por correo del login del micrositio y puede crear su contraseña en su cuenta.
- Desactivar a una integrante corta su acceso y la saca de la reserva pública; sus reservas futuras siguen y la dueña las reasigna o cancela.

La dueña ve todo: Agenda y Reservas ganan un filtro por integrante y muestran quién atiende cada hora. Una reserva se puede **reasignar** a otra integrante libre a esa hora (`POST /api/bookings/[id]/assign`).

## 4. Reserva pública

- Con más de una integrante activa que hace el servicio, el paso de agendar ofrece "¿Con quién?": cada integrante o **Sin preferencia** (por defecto).
- Sin preferencia, los horarios son la unión de los de todas las que hacen el servicio, y la reserva se asigna a la primera libre en ese horario según el orden del equipo.
- Con una sola, no se muestra nada.
- Lista de espera, abono, paquetes y gift cards siguen siendo del negocio.

## 5. Panel de la integrante

`/[slug]/equipo` (rol `staff`, solo de su negocio y solo si está activa):
- **Agenda:** su semana.
- **Reservas:** las suyas, con confirmar, completar, no asistió, reagendar y cancelar. Mismas rutas de API, que ahora aceptan a la integrante asignada además de la dueña.
- **Mi cuenta:** nombre, teléfono, contraseña.
- No ve clientes, reportes, ingresos, marca ni configuración.

## Decisiones tomadas al implementar

- El panel de la integrante vive en `/[slug]/equipo`, no dentro de `/admin`: el panel de la dueña queda intacto y no hay que revisar página por página qué puede ver una integrante. El corte está en el layout (el middleware solo cubre `/admin`).
- Las acciones sobre una reserva responden 404 (no 403) a una integrante que pide una reserva ajena.
- Con plan Solo solo atiende la dueña aunque queden integrantes de cuando era Salón, y una integrante pierde el panel si el negocio baja de plan.
- "Sin preferencia" asigna por el orden del equipo (la dueña primero). Si dos reservas compiten por la misma integrante, la segunda pasa a la siguiente libre en vez de fallar.
- Un día es "completo" para la lista de espera solo si nadie del equipo tiene cupo.
- La lista de espera, el abono, los paquetes, las gift cards, los recordatorios y Google Calendar siguen siendo del negocio: las reservas de todas las integrantes van al calendario conectado por la dueña.
- Reagendar mantiene a la misma integrante; para cambiarla está "Atiende" en Reservas.
- Una integrante no reserva como clienta (la reserva pública exige rol `client`).
- La migración agrega `staff_id` nulo, lo completa con la dueña y recién después lo marca no nulo; validada en PGlite con datos y con el constraint de solape por integrante.

## Criterios de aceptación

1. Un negocio existente, después de migrar, se ve y reserva exactamente igual que antes.
2. Dos integrantes pueden tener reservas a la misma hora; una misma no (lo frena la base).
3. "Sin preferencia" ofrece la unión de horarios y asigna a una integrante libre.
4. Una integrante que no hace un servicio no aparece al reservarlo.
5. Una integrante solo ve y modifica sus reservas; la dueña, todas.
6. Sin plan Salón no se pueden agregar integrantes.
