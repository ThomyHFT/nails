# SPEC 20 — Acceso sin contraseña, ficha de clienta, cuenta, exportar, reportes y app instalable (fase 3)

**Estado:** Implemented
**Alcance:** que reservar no pida inventar una contraseña, que la profesional tenga una ficha por clienta con notas privadas, que cualquiera pueda editar su cuenta, que los datos se puedan sacar en CSV, que la profesional vea cómo le fue en el mes, y que el micrositio y el panel se puedan instalar en el teléfono.

Roadmap y contexto: [SPEC 18](18-agenda-confiable.md). Sin pasarela de pago ni API de WhatsApp.

---

## 1. Entrar con un código por correo

Tabla `email_codes` (migración 0024): `email`, `purpose` (`login` | `change_email`), `user_id` (solo para `change_email`), `code_hash`, `expires_at`, `attempts`, `consumed_at`, `created_at`.

- `POST /api/email-code` con `{ email, slug }`: genera un código de 6 dígitos, guarda solo su hash (SHA-256 de `email:código`), vence en 10 minutos y lo envía con la marca del tenant. Máximo 3 códigos por correo cada 15 minutos (429 después).
  - Responde `{ isNewClient }`: si el correo no tiene cuenta, el formulario pide nombre y teléfono antes de entrar. Que el correo exista ya se revela hoy en el registro, así que esto no agrega exposición.
  - Correos de una profesional o del superadmin no reciben código: siguen entrando con contraseña. La respuesta es la misma que para una clienta (`isNewClient: false`) y no se envía nada.
- Un segundo proveedor de Auth.js (`email-code`) recibe `{ email, code, name?, phone? }`. Verifica el último código vigente del correo: más de 5 intentos fallidos lo invalidan; si coincide, se consume con una escritura condicional (no se puede usar dos veces).
  - Correo sin cuenta: crea la clienta con contraseña inutilizable y el correo verificado (probó que lo recibe). Exige nombre y teléfono válido.
  - Clienta creada a mano por la profesional con ese correo: entra a esa misma cuenta.
- `/[slug]/login` ofrece primero "Recibir un código" y deja "Entrar con contraseña" como alternativa. La reserva sigue redirigiendo al login con `next`, así que la clienta nueva reserva sin crear contraseña.

## 2. Ficha de clienta

`/admin/clientes/[clientId]`, enlazada desde el listado:

- Contacto (WhatsApp, correo real si lo hay), totales (reservas, completadas, gasto, strikes, última visita) e historial completo de reservas con este negocio.
- **Nota privada** por clienta (tabla `client_notes`, migración 0024, única por `professional_id` + `client_user_id`, hasta 2000 caracteres). Solo la ve la profesional: alergias, preferencias, forma de las uñas. `PUT /api/client-notes/[clientId]`.
- Una clienta sin reservas con este negocio da 404: la ficha nunca expone clientas de otro tenant.

## 3. Cuenta

Para clientas (`/[slug]/cuenta/perfil`) y profesionales (`/[slug]/admin/cuenta`), el mismo formulario:

- `PATCH /api/account` `{ name, phone }`.
- `POST /api/account/password` `{ currentPassword?, newPassword }` (mínimo 8). La contraseña actual se exige solo si la cuenta ya tiene una; una clienta sin contraseña puede crearla.
- Cambiar correo: `POST /api/account/email` `{ newEmail }` envía un código `change_email` al correo nuevo; `POST /api/account/email/confirm` `{ code }` lo aplica y lo marca verificado. Rechaza un correo ya usado por otra cuenta. Después del cambio la sesión se renueva iniciando sesión de nuevo.

## 4. Exportar CSV

- `GET /api/export/reservas` y `GET /api/export/clientes`, solo para la dueña del tenant. UTF-8 con BOM (Excel en español lo abre bien), separador `;`.
- Celdas que empiezan con `=`, `+`, `-` o `@` llevan un apóstrofo delante: así Excel no ejecuta como fórmula un nombre o una nota que escribió una clienta.
- Botones "Exportar CSV" en Reservas y Clientes.

## 5. Reportes

`/admin/reportes` con selector de mes (`?mes=YYYY-MM`, en la zona de la profesional):

- Ingresos (suma de `price_clp` de las completadas), reservas por estado, tasa de no show, ticket promedio.
- Clientas nuevas contra recurrentes (nueva = su primera reserva con este negocio cae en el mes).
- Servicios más reservados y ocupación por día de la semana.
- Comparación con el mes anterior en ingresos y reservas completadas.
- El cálculo es una función pura del dominio (`buildMonthlyReport`) con tests.

## 6. App instalable (PWA)

- `/[slug]/manifest.webmanifest`: nombre del negocio, `start_url` el micrositio, color del tenant.
- `/[slug]/panel.webmanifest`: "Panel · negocio", `start_url` el panel. El layout del admin lo enlaza en lugar del público. Vive fuera de `/admin` porque el navegador pide el manifiesto sin cookies y el middleware del panel lo mandaría al login.
- Íconos generados en `/[slug]/icono/{192,512,maskable,apple}` (inicial del negocio sobre su color). Metadatos de Apple para pantalla completa.
- Sin service worker: Chrome y Safari ya permiten instalar sin él, y cachear un panel con datos en vivo traería más confusión que beneficio.

## Decisiones tomadas al implementar

- Las rutas de la profesional van en `/api/client-notes` y `/api/export`, no en `/api/admin/*`: ese prefijo es el del superadmin.
- El registro con contraseña ya no "activa" una cuenta de clienta sin contraseña. Antes se la entregaba, con su historial, a quien escribiera el correo, sin probar que fuera suyo. Esas cuentas entran con código y pueden crear su contraseña desde su perfil.
- El CSV deja como texto los teléfonos que empiezan con `+` (llevan apóstrofo), así Excel no los convierte en número.
- El `scope` de cada manifiesto no lleva `/` final: tiene que contener al `start_url`.

## Criterios de aceptación

1. Una clienta nueva reserva escribiendo correo, código, nombre y teléfono, sin contraseña.
2. Un código vence a los 10 minutos, se invalida tras 5 intentos y no se puede usar dos veces.
3. Una profesional no puede entrar con código.
4. La nota privada se guarda por clienta y negocio, y la ficha de una clienta ajena da 404.
5. Cambiar el correo exige el código enviado al correo nuevo.
6. El CSV neutraliza fórmulas y abre con tildes correctas en Excel.
7. El reporte del mes cuadra con las reservas del mes en la zona horaria de la profesional.
8. Chrome ofrece instalar el micrositio y el panel.
