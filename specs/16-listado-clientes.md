# SPEC 16 — Listado de clientes en el admin

**Estado:** Implemented
**Alcance:** una pantalla `/admin/clientes` que junta, por cliente, cuántas reservas hizo, cuánto gastó, cuándo fue la última vez y cuántos strikes tiene. Sin tabla nueva: todo sale de `bookings` + `users`, que ya existen.

Hoy la única forma de saber quién es una clienta recurrente es abrir reservas una por una. `countClientStrikes` ya existe para decidir si conviene una reserva nueva (SPEC 02); esta pantalla es la misma pregunta pero de un vistazo, para las clientas, no para una reserva puntual.

---

## 1. Decisiones de diseño

### 1.1 Un cliente es quien tiene al menos una reserva con este tenant

No hay tabla `clients`: un "cliente" es una fila de `users` con `role = 'client'` que aparece como `client_user_id` en al menos una reserva de este profesional. El aislamiento por tenant sale gratis de `bookings.professional_id`, igual que en `/admin/reservas`.

Alguien que se registró pero nunca reservó no aparece. No es una omisión: no hay nada que mostrarle a la profesional sobre una cuenta que no interactuó con su negocio.

### 1.2 La agregación es una consulta, no un loop por cliente

`/admin/reservas` calcula los strikes con un `await` dentro de un `for` — uno por cliente visible en esa página. Funciona porque esa pantalla ya trae las reservas cargadas y solo suma strikes encima. Acá el punto de partida *es* la agregación: una sola consulta agrupada por `client_user_id` con `count`, `count(...) filter (where status = 'completed')`, `sum(...) filter (where status = 'completed')` y `count(...) filter (where cancelled_by = 'client')` trae todo en un viaje a la base, para diez clientes o for quinientos.

### 1.3 "Gasto total" son solo reservas completadas

`price_clp` es la fotografía congelada al reservar (ver CLAUDE.md), así que sumarla es correcto incluso si los precios cambiaron después. Pero sumar *todas* las reservas —incluidas las canceladas— inflaría el número con dinero que nunca se cobró. Solo `completed` cuenta como gasto real.

### 1.4 Sin teléfono de contacto: el dato no existe

`users.phone` es la misma columna para profesionales y clientas, pero el formulario de registro de clienta ([registro/page.tsx](src/app/[slug]/(public)/registro/page.tsx)) no lo pide. En la práctica siempre es `null` para un cliente. La pantalla no ofrece un botón de WhatsApp que fallaría en el 100% de los casos — muestra el correo, que sí existe siempre.

### 1.5 Sin escritura, sin ruta nueva en la API

Es una lectura pura. Sigue el mismo patrón que `/admin/reservas` y `/admin/page.tsx`: Server Component que arma la consulta directamente, sin pasar por `route handler` (CLAUDE.md: "un Server Component puede importar `application/*` para lecturas simples"). El caso de uso vive en `application/booking/` porque la agregación es sobre `bookings`, no un concepto de dominio nuevo.

---

## 2. Dominio

### 2.1 `src/server/domain/booking/client-summary.entity.ts`

```ts
export interface ClientSummary {
  userId: string;
  name: string;
  email: string;
  totalBookings: number;
  completedBookings: number;
  totalSpentClp: number;
  lastBookingAt: Date;
  strikes: number;
}
```

### 2.2 `BookingRepository` gana un método

```ts
listClientSummaries(professionalId: string): Promise<ClientSummary[]>;
```

Implementado en `DrizzleBookingRepository` con la consulta agrupada de §1.2, ordenada por `lastBookingAt` descendente — la clienta más reciente primero, misma lógica que "lo último arriba" del resto del admin.

---

## 3. Aplicación

`src/server/application/booking/list-client-summaries.use-case.ts`: delega directo al repositorio, sin lógica propia — el mismo patrón sin ceremonia que `ListServicesUseCase` o `ListPortfolioUseCase`.

---

## 4. UI

### 4.1 `/admin/clientes`

Tabla (reutiliza el patrón de [admin-dashboard.tsx](src/app/admin/admin-dashboard.tsx) del superadmin: `<table>` simple, sin librería):

| Columna | Contenido |
| --- | --- |
| Cliente | Nombre + correo |
| Reservas | `completedBookings` / `totalBookings` |
| Gasto total | `Price` sobre `totalSpentClp` |
| Última visita | `lastBookingAt` formateada `es-CL` |
| Strikes | `Chip` de aviso si `strikes > 0`, nada si es cero — mismo criterio que la chip de `/admin/reservas` |

Sin buscador ni paginación en esta primera versión: el volumen de clientas de un tenant hoy no lo justifica, igual que el resto de las listas del admin.

### 4.2 Navegación

Nuevo ítem en [admin-nav-items.tsx](src/app/[slug]/admin/admin-nav-items.tsx), entre "Reservas" y "Disponibilidad" — es información sobre reservas, no un módulo aparte.

```
{ href: `${base}/clientes`, label: "Clientes", icon: <Users />, exact: false }
```

Sin gate por rubro: los tres rubros tienen clientas.

---

## 5. Criterios de aceptación

1. Una profesional con reservas ve una fila por cada clienta distinta que le reservó, nunca antes de tener al menos una reserva.
2. El gasto total de una clienta con una reserva cancelada y una completada de $10.000 muestra $10.000, no la suma de ambas.
3. Los strikes que se ven acá son los mismos que ya se ven en `/admin/reservas` para esa clienta.
4. Una clienta sin reservas jamás aparece, aunque tenga cuenta.
5. La lista de un tenant nunca muestra clientas de otro tenant.
6. La pantalla no ofrece ningún botón de contacto que dependa de un teléfono que la clienta nunca cargó.

---

## 6. Fuera de alcance

Buscador y paginación, exportar a CSV, editar o anotar manualmente una clienta, filtrar por rango de fechas, y cualquier acción de contacto (WhatsApp, email directo) — el correo se muestra como texto, no como link `mailto:` con seguimiento.
