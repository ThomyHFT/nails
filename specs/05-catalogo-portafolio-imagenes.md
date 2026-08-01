# SPEC 05 — Catálogo de servicios, portafolio y subida de imágenes

> **Estado:** Approved
> **Depende de:** SPEC 01, SPEC 02, SPEC 03, SPEC 04
> **Fecha:** 2026-07-31
> **Objetivo:** Que la profesional administre sus servicios y precios desde el panel, resolver la subida de imágenes de una vez con Vercel Blob, y llenar con contenido real los contenedores de catálogo y portafolio que el SPEC 04 dejó vacíos en la landing.

---

## Alcance

**Dentro:**

- CRUD de `services` y `service_variants` en el panel: crear, editar, reordenar y desactivar servicios; definir precio y duración por largo de uña. Hoy estas tablas solo tienen filas de seed y no hay ninguna pantalla ni API que las toque.
- Subida de imágenes con **Vercel Blob**, resuelta una sola vez y reutilizable: un route handler de tokens y un componente `ImageUploader`.
- Portafolio administrable: subir foto, escribir bajada, asociar a un servicio, reordenar, publicar y despublicar, y eliminar.
- Catálogo público de servicios en `/[slug]/servicios`: lista de servicios activos con su precio por largo y duración, y CTA que entra al flujo de reserva con ese servicio ya elegido.
- Bloque de servicios destacados en la landing, alimentado por datos reales. El contenedor ya existe en `src/app/[slug]/(public)/page.tsx` con render condicional sobre un array vacío.
- Grilla de portafolio en la landing con los ítems publicados, también sobre el contenedor ya existente.
- Migrar `logo_url` y `cover_image_url` de `/admin/marca` del input de URL al `ImageUploader`. Es la promesa textual del SPEC 04: "cuando exista el spec de imágenes, solo se reemplaza el input por un botón de subida".
- Revisar la barra de navegación inferior: el SPEC 04 dejó dos destinos y descartó "Servicios" porque el catálogo no existía. Ahora existe.
- Tests con Vitest sobre el cálculo del precio "desde", las validaciones de servicio y variante, y las reglas de publicación del portafolio.

**Fuera de alcance (para specs futuros):**

- **Reviews.** Se mueven al SPEC 06. Arrastran moderación, estados, notificación a la profesional y su propia UI pública; entran mejor en su propio spec. La política ya quedó decidida en el SPEC 01 y no se re-litiga: solo puede opinar quien tenga una reserva `completed`, con moderación previa y foto opcional.
- `designs.reference_image_url`. El SPEC 03 lo dejó `null` esperando este spec. La **infraestructura** de imágenes sí queda construida acá, pero conectarla al flujo de reserva de la clienta es sumar un paso más al camino más caro de romper del producto. Cuando se haga, es enchufar un componente que ya existe, no infraestructura nueva.
- Plantillas de diseño desde el portafolio (`portfolio_items.design_id`). La columna existe y se puede llenar, pero ofrecer un trabajo del portafolio como punto de partida en el diseñador es una feature de flujo, no de catálogo.
- Edición de imágenes: recorte, rotación, filtros, compresión en el cliente. Se sube lo que la profesional elige.
- Categorías o etiquetas de portafolio, y filtros por servicio en la grilla pública.
- Galería con lightbox, zoom o carrusel. La grilla lleva a la imagen, nada más.
- Precios promocionales, descuentos, packs o combos.
- Reordenar por arrastrar y soltar. El orden se edita con un campo numérico, igual que el catálogo de diseño del SPEC 03.

---

## Modelo de datos

**Ninguna tabla cambia de forma. Cero migraciones.** Las tres tablas que este spec necesita existen completas desde el SPEC 01 y hasta ahora solo tenían filas de seed o estaban vacías.

### `services` y `service_variants` (ya existen)

`services` lleva `name`, `description`, `sort_order`, `active`. `service_variants` lleva `nail_length`, `price_clp`, `duration_minutes`, `active`, con un índice único sobre `(service_id, nail_length)`.

El enum `nail_length` es cerrado desde el SPEC 01: `short`, `medium`, `long`, `single`. Un servicio tiene entre una y cuatro variantes, una por largo, y el único índice impide duplicar el mismo largo dentro del mismo servicio.

### `portfolio_items` (ya existe, vacía)

| Columna           | Uso en este spec                                                        |
| ----------------- | ----------------------------------------------------------------------- |
| `image_url`       | URL pública devuelta por Vercel Blob. Es `not null`                     |
| `caption`         | Bajada opcional                                                         |
| `service_id`      | Asociación opcional a un servicio, para dar contexto al trabajo         |
| `design_id`       | Queda `null`. Es la puerta a las plantillas de diseño, fuera de alcance |
| `sort_order`      | Orden en la grilla pública                                              |
| `published`       | Solo los `true` se muestran en la landing                               |

### Precio "desde"

El catálogo muestra un precio "desde" por servicio. **No es una columna:** es `min(price_clp)` sobre las variantes activas de ese servicio, calculado en una función pura del dominio.

```ts
function priceFromClp(variants: ServiceVariant[]): number | null;
```

Devuelve `null` cuando el servicio no tiene ninguna variante activa. Un servicio en ese estado no se muestra en el catálogo público: no se puede reservar y anunciar un precio que no existe es peor que no anunciarlo.

### Borrado

Nada se borra de verdad, salvo el portafolio.

- Servicios y variantes usan `active`. `bookings.service_variant_id` es una FK, y `bookings.price_clp` y `duration_minutes` son fotografías congeladas al reservar: borrar una variante rompería la integridad de reservas históricas sin ganar nada. Desactivar la saca del catálogo y del flujo de reserva, y deja las reservas viejas intactas.
- `portfolio_items` sí se elimina de verdad, junto con su blob. No lo referencia ninguna otra tabla y acumular fotos despublicadas es pagar almacenamiento por basura.

---

## Subida de imágenes

### Client upload, no server upload

La subida va del navegador directo a Vercel Blob, con un intercambio de token contra nuestro servidor. Se usa `upload()` de `@vercel/blob/client` en el cliente y `handleUpload()` en el route handler.

El motivo es un límite duro: **un archivo que pasa por el servidor no puede superar 4.5 MB**, y una foto de celular lo supera seguido. El client upload no tiene ese techo y además no paga transferencia de datos.

### La persistencia no cuelga de `onUploadCompleted`

`handleUpload` ofrece un callback `onUploadCompleted` que Vercel llama cuando la subida termina, pensado justamente para escribir en la base. **No se usa para persistir.**

La razón está en la documentación de Vercel: ese callback lo dispara Vercel contra la URL pública del deploy, así que **no funciona en local** — habría que levantar un túnel tipo ngrok para probar cualquier cosa. Este proyecto se desarrolla en `localhost` contra la base de Neon de producción, y un camino que solo se puede probar en producción no es un camino que quiera este spec.

El flujo es explícito y de dos tiempos:

1. El navegador sube el archivo a Blob y recibe la URL.
2. El navegador hace un `POST` normal a nuestra API con esa URL, y ahí se escribe la fila.

El costo de esta decisión es que un blob puede quedar huérfano si la profesional sube una foto y cierra la pestaña antes de guardar. Se acepta: `del()` no tiene costo y limpiar es barato, mientras que un flujo intesteable en local se paga en cada cambio.

### Store público

El store se crea en modo **público**. Las fotos de portafolio y el logo del micrositio son contenido público por definición: se sirven por URL directa desde el CDN. Un store privado obligaría a que cada imagen pase por una Function nuestra para ser leída, sumando latencia y costo a cambio de proteger algo que igual queremos que cualquiera vea.

### Autorización

El guard va en `onBeforeGenerateToken`, dentro del route handler. Sin esa verificación **cualquiera en internet puede subir archivos al store**. Solo se emite token para una sesión de profesional dueña del tenant, reutilizando `requireTenantOwner`.

En el mismo lugar se restringe qué se puede subir:

- `allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp']`
- `maximumSizeInBytes`, con techo de 8 MB
- `addRandomSuffix: true`, para que dos fotos con el mismo nombre no colisionen

### Configuración manual previa

Dos pasos que **no son código** y hay que hacer antes del paso 6:

1. Crear el Blob store desde el dashboard de Vercel (Storage → Create → Blob), en modo público, conectado al proyecto.
2. Copiar `BLOB_READ_WRITE_TOKEN` al `.env` local. La vía normal es `vercel env pull`, pero en esta máquina no hay CLI de Vercel instalado, así que se copia a mano desde el dashboard.

`BLOB_READ_WRITE_TOKEN` es el token estático de larga vida, y es el que `handleUpload` necesita para poder generar los tokens de cliente.

---

## Plan de implementación

Cada paso deja el proyecto ejecutable y es commiteable por sí solo. Los pasos 1 a 5 cierran el hueco de los servicios, 6 a 8 construyen las imágenes, 9 a 13 el portafolio, y 14 en adelante es lo público.

1. **Dominio: servicios.** Crear `src/server/domain/service/service.entity.ts` y `service-variant.entity.ts`, `services-repository.port.ts`, y la función pura `price-from.ts` con `priceFromClp`. Puro TypeScript. Verificación: `tsc --noEmit` limpio y un test cubre `priceFromClp` con variantes mezcladas activas e inactivas, y con cero variantes activas.

2. **Repositorio de servicios.** Crear `drizzle-services.repository.ts` implementando el puerto: listar por profesional con sus variantes, buscar por id, crear, actualizar y hacer lo propio con variantes. Verificación: un script manual lista los servicios del seed con sus tres variantes.

3. **Casos de uso de servicios.** Crear `list-services.use-case.ts` y `configure-services.use-case.ts`. El segundo valida: nombre no vacío, `price_clp` entero positivo, `duration_minutes` entero positivo, `nail_length` dentro del enum, y que no se repita un largo dentro del mismo servicio. Verificación: tests con repositorio fake cubren precio negativo, duración cero, largo fuera del enum y largo duplicado.

4. **Ruta de la API de servicios.** Crear `src/app/api/services/route.ts` con `GET`, `POST` y `PATCH`, y `src/app/api/services/variants/route.ts` para las variantes, todo detrás del guard de dueña del tenant, siguiendo el patrón de `design-elements/route.ts`. Verificación: `POST` con precio negativo responde 400 sin escribir, y una profesional no puede tocar los servicios de otro tenant.

5. **Página de servicios en el panel.** Crear `/[slug]/admin/servicios` con el listado, alta de servicio, edición de precios y duraciones por largo, orden y desactivación. Agregar el destino a `AdminSidebar`. Verificación: la profesional crea un servicio con dos variantes, lo ve en el flujo de reserva, lo desactiva y desaparece del flujo.

6. **Vercel Blob: dependencia y ruta de tokens.** Instalar `@vercel/blob`. Crear `src/app/api/upload/route.ts` con `handleUpload`, autorizando en `onBeforeGenerateToken` con el guard de dueña del tenant y aplicando tipos permitidos y tamaño máximo. Requiere el store y la variable de entorno ya creados. Verificación: una petición sin sesión de profesional no recibe token; una con sesión sube un JPG y devuelve una URL pública que abre en el navegador.

7. **Componente `ImageUploader`.** Crear el componente cliente reutilizable: input de archivo, estado de subida, preview, error legible y `onUploaded(url)`. Verificación: sube una imagen desde el navegador y devuelve la URL al componente padre.

8. **Marca con subida real.** Reemplazar los inputs de URL de `logo_url` y `cover_image_url` en `/admin/marca` por el `ImageUploader`, dejando pegar una URL como alternativa. Verificación: la profesional sube un logo, lo ve en el preview de las dos variantes y en el header de su micrositio.

9. **Dominio del portafolio.** Crear `portfolio-item.entity.ts` y `portfolio-repository.port.ts` con listar por profesional, listar publicados, crear, actualizar y eliminar. Verificación: compila sin depender de infraestructura.

10. **Repositorio del portafolio.** Crear `drizzle-portfolio.repository.ts`. El listado público filtra por `published` y ordena por `sort_order`. Verificación: script manual crea un ítem, lo publica y lo lee desde el listado público.

11. **Casos de uso del portafolio.** Crear `list-portfolio.use-case.ts` y `configure-portfolio.use-case.ts`. El segundo valida que `image_url` sea `https://`, que el `service_id` asociado pertenezca al mismo profesional, y que eliminar un ítem borre también su blob con `del()`. Verificación: tests con fake cubren URL inválida, servicio de otro tenant y eliminación.

12. **Ruta de la API del portafolio.** Crear `src/app/api/portfolio/route.ts` con `GET`, `POST`, `PATCH` y `DELETE` tras el guard. Verificación: se crea un ítem con la URL que devolvió el paso 7 y aparece en el `GET`.

13. **Página de portafolio en el panel.** Crear `/[slug]/admin/portafolio`: subir con `ImageUploader`, bajada, servicio asociado, orden, interruptor de publicado y eliminar. Agregar el destino a `AdminSidebar`. Verificación: sube dos fotos, publica una, y solo esa aparece en la landing.

14. **Catálogo público.** Crear `/[slug]/servicios` como Server Component: servicios activos con al menos una variante activa, precio "desde", detalle por largo, y CTA que entra a `/[slug]/reservar` con el servicio preseleccionado. Verificación: los precios coinciden con los del panel y el CTA llega al flujo con el servicio correcto.

15. **Landing con datos reales.** Llenar los dos contenedores que el SPEC 04 dejó con arrays vacíos: servicios destacados (los primeros por `sort_order`, con link al catálogo) y grilla de portafolio (ítems publicados). Verificación: un tenant sin servicios y sin portafolio sigue renderizando la landing sin secciones vacías.

16. **Navegación.** Agregar el destino "Servicios" a la barra inferior, apuntando a `/[slug]/servicios`. Verificación: la barra marca el destino activo en las tres pestañas y sigue sin aparecer en el panel.

17. **Tests.** Cerrar cobertura sobre `priceFromClp`, validaciones de servicio y variante, largo duplicado, validaciones del portafolio y el filtro de publicados. Verificación: `npm test` pasa en verde.

18. **Deploy.** No hay migración que aplicar. Verificar que `BLOB_READ_WRITE_TOKEN` esté en las variables de entorno de Vercel y pushear. Verificación: la profesional sube una foto real desde el celular en producción y aparece en su landing.

---

## Criterios de aceptación

### Servicios

- [ ] La profesional crea un servicio con nombre y descripción desde `/admin/servicios` y queda guardado.
- [ ] Define precio y duración para uno o más largos de uña, y esas variantes aparecen en el flujo de reserva.
- [ ] Guardar un `price_clp` negativo o cero es rechazado con 400 y no escribe la fila.
- [ ] Guardar una `duration_minutes` de cero es rechazada con 400.
- [ ] Crear dos variantes con el mismo largo en el mismo servicio es rechazado.
- [ ] Desactivar un servicio lo saca del catálogo público y del flujo de reserva.
- [ ] Desactivar un servicio con reservas históricas no rompe esas reservas: siguen mostrando su precio y duración congelados.
- [ ] Una profesional no puede leer ni modificar los servicios de otro tenant.

### Imágenes

- [ ] Una petición a `/api/upload` sin sesión de profesional no recibe token.
- [ ] Una profesional no puede obtener un token para subir al tenant de otra.
- [ ] Subir un archivo que no es imagen es rechazado.
- [ ] Subir una imagen de más de 8 MB es rechazado.
- [ ] Una imagen de 6 MB sube correctamente, lo que confirma que no pasa por el límite de 4.5 MB del servidor.
- [ ] Dos archivos con el mismo nombre no se pisan entre sí.
- [ ] El logo subido desde `/admin/marca` aparece en el header del micrositio.

### Portafolio

- [ ] La profesional sube una foto, le escribe una bajada y queda despublicada por defecto.
- [ ] Publicar un ítem lo hace aparecer en la grilla de la landing.
- [ ] Despublicarlo lo saca de la landing sin borrar el archivo.
- [ ] Eliminar un ítem lo saca de la base y borra el blob.
- [ ] El orden de la grilla pública respeta `sort_order`.
- [ ] Asociar un ítem a un servicio de otro tenant es rechazado.

### Catálogo público

- [ ] `/[slug]/servicios` lista los servicios activos con su precio "desde" y el detalle por largo.
- [ ] El precio "desde" es el menor entre las variantes activas del servicio.
- [ ] Un servicio sin ninguna variante activa no aparece en el catálogo.
- [ ] El CTA de un servicio entra al flujo de reserva con ese servicio ya seleccionado.
- [ ] Los precios del catálogo coinciden con los del panel.

### Landing y navegación

- [ ] La landing muestra servicios destacados cuando hay servicios activos.
- [ ] La landing muestra la grilla de portafolio cuando hay ítems publicados.
- [ ] Un tenant sin servicios y sin portafolio renderiza la landing sin secciones vacías.
- [ ] La barra inferior tiene Inicio, Servicios y Mis Reservas, y marca el destino activo.
- [ ] La barra sigue sin aparecer en el panel.

### Regresión

- [ ] El flujo de reserva completo sigue funcionando: servicio → variante → días con cupo → diseño → fecha → hora → confirmar.
- [ ] La marca del tenant sigue aplicándose en las pantallas nuevas, en variante clara y oscura.
- [ ] `npm test` pasa en verde.

---

## Decisiones

### Alcance

- **Sí:** meter el CRUD de servicios en este spec. El catálogo público muestra `services` y `service_variants`, y hasta hoy esas tablas solo se llenaban por seed. Publicar precios que la profesional no puede editar no es una feature, es una demo.
- **Sí:** sacar reviews al SPEC 06. Moderación, estados y notificación son un bloque propio, y el spec ya toca tres áreas.
- **No:** hacer catálogo, portafolio y reviews de una pasada, como sugería el SPEC 01. El SPEC 04 ya mostró que un spec de veintiún pasos se banca, pero acá el corte cae en un límite natural: lo que llena la landing versus lo que necesita moderación.

### Imágenes

- **Sí:** Vercel Blob. El proyecto ya deploya en Vercel; el store se conecta al proyecto y las variables aparecen solas.
- **No:** seguir con URLs externas como en el SPEC 04. Sirve para un logo que se configura una vez, pero un portafolio se alimenta con fotos del celular y pedirle a la manicurista que las hostee en otro lado y pegue links es pedirle que no use la feature.
- **No:** S3 o Cloudinary. Más control y más portabilidad, a cambio de credenciales, SDK y configuración de CORS para resolver lo mismo que acá son dos pasos de dashboard.
- **Sí:** client upload. El límite de 4.5 MB del server upload lo cruza cualquier foto de celular moderna.
- **Sí:** persistir con un `POST` explícito posterior a la subida.
- **No:** persistir dentro de `onUploadCompleted`. Es lo que sugiere la documentación y ahorra una petición, pero Vercel llama ese callback contra la URL del deploy: no dispara en `localhost` sin un túnel. Un camino que solo se prueba en producción no se puede iterar.
- **Sí:** store público. Estas imágenes son públicas por definición.
- **No:** store privado. Cada lectura pasaría por una Function nuestra, sumando latencia y costo para proteger algo que queremos que se vea.
- **Sí:** `addRandomSuffix: true` y tratar los blobs como inmutables. Evita colisiones de nombre y los problemas de caché de sobreescribir.

### Modelo

- **Sí:** cero migraciones. Las tres tablas existen completas desde el SPEC 01.
- **Sí:** precio "desde" calculado sobre las variantes activas.
- **No:** una columna `price_from_clp` desnormalizada. Sería una lectura más rápida y un dato más que puede quedar desincronizado en cada cambio de precio.
- **Sí:** un servicio sin variantes activas no se muestra en el catálogo. No se puede reservar.
- **Sí:** desactivar servicios y variantes en vez de borrarlos, por la FK desde `bookings`.
- **Sí:** eliminar de verdad los ítems de portafolio, junto con su blob. No los referencia nadie y guardar fotos descartadas es pagar almacenamiento por basura.

### Público

- **Sí:** página dedicada `/[slug]/servicios` más un bloque de destacados en la landing.
- **No:** el catálogo completo dentro de la landing. Con varios servicios por varios largos, la landing se convierte en una tabla de precios y el CTA de reserva se hunde.
- **Sí:** revisar la decisión del SPEC 04 y sumar "Servicios" a la barra inferior. Ahí se rechazó porque el catálogo no existía y la etiqueta habría sido engañosa; ahora existe y la razón caducó.
- **Sí:** orden por campo numérico, igual que el catálogo de diseño del SPEC 03. Arrastrar y soltar es mejor y es su propia tarde de trabajo.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El Blob store y `BLOB_READ_WRITE_TOKEN` se crean a mano en el dashboard, fuera del código. Si falta la variable, todo el bloque de imágenes falla en runtime y no en build. | Es lo primero del paso 6 y bloquea los pasos 7 a 13. En esta máquina no hay CLI de Vercel, así que el token se copia a mano al `.env`; el paso 18 verifica que también esté en el entorno de Vercel antes de pushear. |
| `onBeforeGenerateToken` sin guard deja el store abierto a que cualquiera suba archivos a cuenta nuestra. | El guard es parte del paso 6, no un agregado posterior, y tiene dos criterios de aceptación propios: sin sesión no hay token, y una profesional no puede subir al tenant de otra. |
| Un blob queda huérfano si la profesional sube una foto y cierra antes de guardar la fila. | Consecuencia aceptada de no usar `onUploadCompleted`. `del()` no tiene costo y el volumen de un tenant chico es despreciable; si crece, se limpia con un `list()` contra las URLs en base. |
| Fotos de celular sin comprimir inflan el almacenamiento y la factura. | `maximumSizeInBytes` corta en 8 MB. La compresión en el cliente queda fuera de alcance a propósito: es una mejora, no un requisito para publicar. |
| Tocar el paso de selección de servicio del flujo de reserva para preseleccionar desde el catálogo puede romper el flujo, que es el camino más caro del producto. | El preseleccionado entra por query param y cae al comportamiento actual si no viene o es inválido. Los criterios de regresión cubren el flujo completo de punta a punta. |
| Desactivar una variante con reservas futuras deja esas reservas sin variante activa. | `bookings` congela `price_clp` y `duration_minutes` al reservar, así que la reserva se sigue mostrando bien. La variante desactivada solo deja de ofrecerse. |
| El catálogo agrega una consulta de servicios y variantes por render de landing y de `/servicios`. | Es una consulta por `professional_id` con join a variantes, sobre tablas chicas. Mismo orden que la lectura de marca que ya hace el layout del tenant. |
