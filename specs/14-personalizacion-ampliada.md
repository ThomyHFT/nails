# SPEC 14 — Personalización ampliada: estilos por rubro y layout de la portada

**Estado:** Approved
**Alcance:** ampliar la gama de arquetipos y pares tipográficos para que un barbero o una podóloga no tengan que elegir entre cuatro paletas pensadas para un salón de uñas, y darle a cada tenant control sobre **cómo se distribuye su portada**: qué secciones aparecen, en qué orden, y con qué variante de hero.

El SPEC 13 abrió el producto a tres rubros, pero la personalización se quedó donde estaba. Hoy los cuatro arquetipos son Minimal Nude, Glam, Editorial y Pastel Soft: tres de los cuatro son explícitamente femeninos, y el único neutro (Editorial) es monocromo puro. Un barbero que entra a `/admin/marca` no tiene ninguna opción que se parezca a su negocio.

Y aunque acierte con el color, la portada le va a salir igual que a todas: hero con foto al costado, servicios, galería, opiniones, contacto. Ese orden está bien para una manicurista con portafolio; para una barbería que vive de mostrar cortes, la galería debería ir arriba, y para una podóloga puede sobrar del todo.

---

## 1. Decisiones de diseño

### 1.1 Los arquetipos nuevos son datos, no un sistema nuevo

`BRAND_ARCHETYPES` es un `Record<BrandArchetype, BrandArchetypeDefinition>` con tokens claros y oscuros. Agregar un arquetipo es agregar una entrada y un valor al enum de Postgres — aditivo, igual que `admin` en el SPEC 12 y `vertical` en el 13. **Ni una sola pieza de UI cambia**, porque desde el SPEC 04 nada ramifica por arquetipo: todo lee `--primary`, `--surface-*` y `--radius`.

Tres nuevos, que llenan los huecos reales:

| Valor | Etiqueta | Para quién | Carácter |
| --- | --- | --- | --- |
| `barber_classic` | Barber Clásico | barbería tradicional | Fondo oscuro cálido, madera y cuero, acento ámbar, esquinas mínimas |
| `urban_dark` | Urbano | barbería moderna, estudios | Casi negro, alto contraste, acento frío saturado |
| `clinical_calm` | Clínico | podología, masaje, kinesiología | Azules y verdes desaturados, mucho aire, esquinas suaves |

Quedan siete. No es una lista que se pueda estirar para siempre —a las diez, elegir se vuelve trabajo— pero siete con tres rubros es una por rubro más los cuatro que ya existen.

**No se propone un arquetipo "genérico masculino".** El género no es el eje: `urban_dark` le sirve igual a una barbera y a un estudio de uñas oscuro. Los arquetipos describen un carácter visual, no un público.

### 1.2 Dos pares tipográficos nuevos, uno con familia nueva

Los cinco pares actuales son serif elegante o sans redondeado: ninguno tiene el peso condensado que un letrero de barbería pide. Se agregan dos:

| Valor | Titular | Cuerpo | Para |
| --- | --- | --- | --- |
| `oswald_inter` | Oswald | Inter | Barbería, letrero, condensado |
| `outfit_solo` | Outfit | Outfit | Neutro moderno, sin serif, ya cargado |

`outfit_solo` no agrega familias: Outfit ya se carga para `dmserif_outfit`. Solo `Oswald` es nueva en [layout.tsx](src/app/layout.tsx) — `next/font` emite el `@font-face` pero el navegador solo descarga la familia que el tenant activo usa, así que sumar una no le cuesta nada a quien no la elige.

### 1.3 El layout es una lista de secciones, no un puñado de booleanos

La portada tiene cuatro secciones bajo el hero: `servicios`, `galeria`, `opiniones`, `contacto`. Lo que el tenant quiere controlar es **cuáles y en qué orden**.

Dos campos separados (`section_order` + `hidden_sections`) obligan a mantenerlos en sincronía y abren estados imposibles: una sección oculta y primera a la vez. **Una sola lista ordenada resuelve las dos cosas**: lo que está, se muestra en ese orden; lo que no está, no se muestra.

```
sectionOrder: ["galeria", "servicios", "opiniones", "contacto"]   // galería primero
sectionOrder: ["servicios", "contacto"]                            // sin galería ni opiniones
```

Se guarda como `jsonb` en `tenant_branding`, y una función pura la sanea al leerla:

```
resolveSectionOrder(stored) ->
  descarta claves desconocidas, descarta duplicados,
  y si el resultado queda vacío o el campo es null, devuelve el orden por defecto
```

Sanear al leer y no al escribir es deliberado: la columna es `jsonb` y nada impide que llegue basura por `db:studio` o por una migración futura. Que la portada de un tenant no se caiga por un valor raro en una columna de personalización vale más que la pureza del dato.

**Las secciones sin contenido siguen sin renderizarse**, como hoy. Estar en la lista es permiso, no obligación: una galería sin fotos no aparece aunque esté primera.

### 1.4 El hero tiene tres variantes, y ninguna es foto de fondo

`Hero` hoy es una sola composición: texto a la izquierda, foto enmarcada en `portrait` a la derecha. Se agregan dos, y se deja fuera a propósito la que parece obvia:

| Variante | Composición | Cuándo |
| --- | --- | --- |
| `split` | La actual: texto y foto enmarcada al costado | Retrato del trabajo, formato vertical |
| `stacked` | Foto ancha (`wide`) arriba a todo el contenedor, texto centrado debajo | Foto del local, formato horizontal |
| `minimal` | Sin foto: titular grande, bajada y CTA centrados | Todavía no hay una foto que valga la pena |

**No hay variante de foto de fondo con texto encima.** [marketing.tsx](src/components/brand/marketing.tsx) ya documenta por qué se descartó: obliga a un velo sobre la foto que apaga la imagen y baja el contraste del titular a la vez. Reintroducirla como "opción" solo trasladaría al tenant la decisión de arruinar su propia portada.

`minimal` no es un descarte: un tenant nuevo, sin portada cargada, hoy ve un hero con un hueco donde iría la foto. Es la variante correcta para el primer día.

### 1.5 El copy de la portada deja de asumir clientas

`"Lo que dicen las clientas"` en [page.tsx](src/app/[slug]/(public)/page.tsx) y `"Clienta"` como nombre por defecto en [review.tsx](src/components/brand/review.tsx) son visibles para el cliente de un barbero. No se parametrizan por rubro —sería un diccionario para dos frases—: pasan a neutro (`"Lo que dicen"`, `"Cliente"`), que sirve para los tres.

---

## 2. Esquema

Todo aditivo. Una migración.

```sql
ALTER TYPE brand_archetype ADD VALUE 'barber_classic';
ALTER TYPE brand_archetype ADD VALUE 'urban_dark';
ALTER TYPE brand_archetype ADD VALUE 'clinical_calm';

ALTER TYPE brand_font_pair ADD VALUE 'oswald_inter';
ALTER TYPE brand_font_pair ADD VALUE 'outfit_solo';

CREATE TYPE hero_layout AS ENUM ('split', 'stacked', 'minimal');
ALTER TABLE tenant_branding ADD COLUMN hero_layout hero_layout NOT NULL DEFAULT 'split';
ALTER TABLE tenant_branding ADD COLUMN section_order jsonb;
```

`hero_layout` con `DEFAULT 'split'` deja a los tenants actuales exactamente como están. `section_order` nullable, y `null` significa "el orden por defecto" — no hace falta backfill.

> **Nota de operación:** en Postgres, `ALTER TYPE ... ADD VALUE` no puede correr dentro del mismo bloque transaccional que después *usa* ese valor. Acá no aplica —la migración no inserta filas con los valores nuevos— pero conviene saberlo si alguna migración futura las combina.

---

## 3. Dominio

### 3.1 `brand-tokens.ts` y `brand-archetypes.ts`

`BrandArchetype` y `BrandFontPair` suman los valores nuevos; `BRAND_ARCHETYPES` suma las tres definiciones con sus paletas clara y oscura completas, y `FONT_PAIR_FAMILIES` los dos pares.

Los tests existentes de `brand-archetypes.test.ts` ya recorren `Object.keys(BRAND_ARCHETYPES)`, así que las paletas nuevas quedan cubiertas por las mismas invariantes (contraste, hex válidos) sin escribir un test por arquetipo.

### 3.2 `src/server/domain/branding/portada-layout.ts`

```
export type PortadaSection = "servicios" | "galeria" | "opiniones" | "contacto";
export const DEFAULT_SECTION_ORDER: PortadaSection[]
export function resolveSectionOrder(stored: unknown): PortadaSection[]
export type HeroLayout = "split" | "stacked" | "minimal";
```

`resolveSectionOrder` recibe `unknown` a propósito: lo que sale de una columna `jsonb` no tiene garantías de tipo, y tipar la entrada como `string[]` sería mentir sobre lo que puede llegar. Función pura, con tests.

### 3.3 `TenantBranding` y `ResolvedBrand`

La entidad suma `heroLayout` y `sectionOrder`. `resolveBrandTokens` sigue resolviendo colores y tipografías; el layout se resuelve aparte porque no participa de la cascada de tokens CSS — es estructura, no estilo.

---

## 4. Aplicación y API

- **`ConfigureTenantBrandingUseCase`** valida `heroLayout` contra el enum y `sectionOrder` con `resolveSectionOrder`, guardando ya saneado. Error tipado `InvalidHeroLayoutError`.
- **`PUT /api/branding`**: el schema de zod suma `heroLayout` y `sectionOrder`, y `archetypeSchema`/`fontPairSchema` suman los valores nuevos. Los tres enums de zod hoy repiten a mano los valores del dominio; se pasan a derivarse de las constantes para que agregar un arquetipo no exija acordarse de tocar la ruta.

---

## 5. UI

### 5.1 `/admin/marca`

- **Arquetipo**: el `<select>` actual pasa a una grilla de `OptionCard` con las tres muestras de color de cada uno — con siete opciones, un desplegable de texto obliga a abrir y cerrar para comparar. Es la misma pieza que ya usa la portada en su conmutador.
- **Layout del hero**: `SegmentedControl` de tres opciones.
- **Secciones de la portada**: lista ordenable con un check por sección y flechas de subir/bajar. Sin drag and drop: en el panel, que se usa desde el teléfono, arrastrar en una lista corta es más frágil que dos botones.
- La previsualización (`BrandPreview`) ya existe para colores; se le suma el orden elegido como una lista de rótulos, no una maqueta completa — el tenant tiene su portada real a un clic para verla de verdad.

### 5.2 `/[slug]` (portada del tenant)

Las cuatro secciones se extraen a variables y se emiten recorriendo `sectionOrder`. El `Hero` recibe `layout` y compone según la variante.

---

## 6. Criterios de aceptación

1. Un tenant elige "Barber Clásico" y su micrositio entero cambia de paleta, incluidas bandas, chips y pie, sin ninguna rama por arquetipo.
2. Los siete arquetipos pasan los tests de contraste y hex existentes, en claro y en oscuro.
3. Un tenant elige el par `oswald_inter` y los titulares cambian de familia; quien no lo elige no descarga Oswald.
4. Un tenant pone la galería primero y su portada la muestra antes que los servicios.
5. Un tenant saca "opiniones" de la lista y la sección no aparece, aunque tenga opiniones publicadas.
6. Una sección incluida en el orden pero sin contenido sigue sin renderizarse.
7. Un `section_order` con basura (claves desconocidas, duplicados, `null`, un objeto) no rompe la portada: cae al orden por defecto o descarta lo inválido.
8. Un tenant con `hero_layout = 'minimal'` no muestra hueco de foto aunque tenga portada cargada.
9. Los tenants que existen hoy no cambian: `split` y orden por defecto.
10. La portada de un tenant no dice "clientas" ni "Clienta" en ninguna parte visible.

---

## 7. Fuera de alcance

Hero con foto de fondo (§1.4); secciones nuevas o secciones propias escritas por el tenant; reordenar dentro de una sección (qué servicio va primero ya lo resuelve `sortOrder`); temas por hora del día o por estación; subir una tipografía propia; CSS libre; y previsualización en vivo de la portada dentro del panel — el micrositio real está a un clic y siempre va a ser más fiel que una maqueta.
