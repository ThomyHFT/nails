"use client";

import { useState } from "react";
import {
  ArrowRight,
  Banknote,
  Brush,
  CalendarCheck,
  CalendarDays,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Palette,
  Plus,
  Save,
  Settings,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";
import {
  ActionLink,
  AdminAside,
  AdminCard,
  AdminPageHeader,
  AppHeader,
  AppointmentRow,
  Band,
  BookingSummaryCard,
  BottomNavBar,
  BrandButton,
  Caption,
  Chip,
  CircleButton,
  ContactCard,
  Container,
  Display,
  EmptyState,
  FloatingStat,
  GalleryGrid,
  Headline,
  Hero,
  IconCircle,
  InfoNote,
  MetaItem,
  NoteField,
  OptionCard,
  Overline,
  Panel,
  Price,
  RatingInput,
  RatingSummary,
  ReviewCard,
  ReviewStatusChip,
  Section,
  SectionHeading,
  SegmentedControl,
  SelectChip,
  ServiceCard,
  SidebarItem,
  SiteFooter,
  StatCard,
  StatusBadge,
  StickyActionBar,
  SummaryRow,
  Swatch,
  Title,
  VariantRow,
} from "@/components/brand";
import { BRAND_ARCHETYPES } from "@/server/domain/branding/brand-archetypes";
import type { BrandArchetype } from "@/server/domain/branding/brand-tokens";
import { ARCHETYPE_OPTIONS, archetypeStyle } from "@/app/estilo/tokens";
import { gradientPlaceholder } from "@/app/estilo/placeholders";

/**
 * Referencia visual del sistema de diseño.
 *
 * Existe para responder una pregunta que ninguna captura de Stitch puede
 * responder: cómo se ve *nuestro* código con los tokens de cada arquetipo. El
 * conmutador de arriba es el punto: si una pieza solo se ve bien en Minimal
 * Nude, el sistema todavía no está terminado.
 *
 * No la enlaza nadie desde la app. Es una herramienta de trabajo.
 */

const SERVICES = [
  {
    id: "rusa",
    name: "Manicura Rusa",
    description:
      "Técnica de limpieza profunda de cutículas en seco, garantizando un esmaltado perfecto y duradero bajo la cutícula.",
    priceFromClp: 25000,
    durationMinutes: 90,
  },
  {
    id: "softgel",
    name: "Soft Gel",
    description:
      "Extensión de uñas con tips de gel completo. Ligero, flexible y con un acabado ultra natural. Ideal para alargar.",
    priceFromClp: 35000,
    durationMinutes: 120,
  },
];

const SLOTS = [
  { time: "09:00", taken: false },
  { time: "10:30", taken: false },
  { time: "12:00", taken: true },
  { time: "14:00", taken: false },
  { time: "15:30", taken: true },
  { time: "17:00", taken: false },
];

const NAIL_SHAPES = ["Almendra", "Cuadrada", "Redonda", "Stiletto"];

export default function EstiloPage() {
  const [archetype, setArchetype] = useState<BrandArchetype>("minimal_nude");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [slot, setSlot] = useState("10:30");
  const [shape, setShape] = useState("Almendra");
  const [finish, setFinish] = useState<"brillante" | "mate">("brillante");
  const [tab, setTab] = useState<"forma" | "color">("forma");
  const [swatch, setSwatch] = useState(1);
  const [rating, setRating] = useState(5);

  const palette = BRAND_ARCHETYPES[archetype][mode];
  const photo = gradientPlaceholder(palette.primary, palette.accent);
  const photoSoft = gradientPlaceholder(palette.muted, palette.primary);

  const swatchColors = [palette.muted, palette.primary, palette.accent, palette.secondary, palette.border];

  return (
    <div className="tenant-brand min-h-screen bg-background text-foreground" style={archetypeStyle(archetype, mode)}>
      {/* Barra de control — fuera del sistema, es andamio de la referencia */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-2/95 px-5 py-3 backdrop-blur">
        <span className="t-label text-muted-foreground">Sistema de diseño</span>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            size="sm"
            value={archetype}
            onChange={setArchetype}
            options={ARCHETYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
          <SegmentedControl
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: "light", label: "Claro" },
              { value: "dark", label: "Oscuro" },
            ]}
          />
        </div>
      </div>

      <Container size="xl" className="flex flex-col gap-4 py-10">
        {/* ------------------------------------------------------------------ */}
        <Section id="tonal" className="flex flex-col gap-8">
          <SectionHeading
            align="start"
            eyebrow="01 — Fundamentos"
            title="Escalera tonal"
            subtitle="Cuatro superficies derivadas con color-mix desde el fondo y el primary del tenant. Es lo que produce bandas, chips y elevación sin sombras duras."
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {[
              ["background", "bg-background"],
              ["surface-1", "bg-surface-1"],
              ["surface-2", "bg-surface-2"],
              ["surface-3", "bg-surface-3"],
              ["surface-4", "bg-surface-4"],
              ["card", "bg-card"],
              ["primary", "bg-primary"],
              ["primary-tint", "bg-primary-tint"],
              ["primary-container", "bg-primary-container"],
              ["accent", "bg-accent"],
              ["accent-tint", "bg-accent-tint"],
              ["success-tint", "bg-success-tint"],
              ["warning-tint", "bg-warning-tint"],
              ["destructive-tint", "bg-destructive-tint"],
              ["outline", "bg-outline"],
              ["outline-variant", "bg-outline-variant"],
            ].map(([name, klass]) => (
              <div key={name} className="flex flex-col gap-2">
                <div className={`h-16 rounded-card border border-outline-variant ${klass}`} />
                <span className="font-mono text-xs text-muted-foreground">{name}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section id="tipografia" className="flex flex-col gap-8">
          <SectionHeading
            align="start"
            eyebrow="02 — Fundamentos"
            title="Escala tipográfica"
            subtitle="Seis roles con clamp(). Los títulos toman la familia de heading del tenant; el cuerpo, la de body."
          />
          <Panel padding="lg" className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <Caption className="font-mono text-xs">Display · 32→48px</Caption>
              <Display>El arte del cuidado personal.</Display>
            </div>
            <div className="flex flex-col gap-1">
              <Caption className="font-mono text-xs">Headline · 22→28px</Caption>
              <Headline>Servicios destacados</Headline>
            </div>
            <div className="flex flex-col gap-1">
              <Caption className="font-mono text-xs">Title · 20px</Caption>
              <Title>Manicura Rusa</Title>
            </div>
            <div className="flex flex-col gap-1">
              <Caption className="font-mono text-xs">Body large · 18px</Caption>
              <p className="t-body-lg text-muted-foreground">
                Manicura profesional con enfoque en la salud y estética minimalista.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Caption className="font-mono text-xs">Label · 13px versalitas</Caption>
              <Overline>Reservar hora</Overline>
            </div>
            <div className="flex flex-col gap-1">
              <Caption className="font-mono text-xs">Precio · cifras tabulares</Caption>
              <Price clp={35000} size="lg" />
            </div>
          </Panel>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section id="acciones" className="flex flex-col gap-8">
          <SectionHeading align="start" eyebrow="03 — Componentes" title="Acciones" />
          <Panel padding="lg" className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <BrandButton icon={<CalendarDays className="size-4" />}>Reservar hora</BrandButton>
              <BrandButton variant="outline">Contactar</BrandButton>
              <BrandButton variant="accent" icon={<Sparkles className="size-4" />} iconPosition="start">
                Agendar glam
              </BrandButton>
              <BrandButton variant="ghost">Cancelar</BrandButton>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <BrandButton size="sm">Pequeño</BrandButton>
              <BrandButton size="md">Mediano</BrandButton>
              <BrandButton size="lg">Grande</BrandButton>
              <CircleButton label="Siguiente" variant="primary">
                <ArrowRight className="size-5" />
              </CircleButton>
              <CircleButton label="Siguiente" variant="accent">
                <ArrowRight className="size-5" />
              </CircleButton>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <ActionLink href="#">Ver catálogo completo</ActionLink>
              <BrandButton disabled>Deshabilitado</BrandButton>
            </div>
          </Panel>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section id="seleccion" className="flex flex-col gap-8">
          <SectionHeading align="start" eyebrow="04 — Componentes" title="Etiquetas y selección" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel padding="lg" className="flex flex-col gap-5">
              <Overline>Chips y estados</Overline>
              <div className="flex flex-wrap gap-2">
                <Chip>90 min</Chip>
                <Chip tone="primary">$25.000</Chip>
                <Chip tone="accent">Nuevo</Chip>
                <Chip tone="success">Disponible</Chip>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="success">Confirmada</StatusBadge>
                <StatusBadge tone="warning">Pendiente</StatusBadge>
                <StatusBadge tone="danger">Cancelada</StatusBadge>
                <StatusBadge tone="neutral">Completada</StatusBadge>
              </div>
              <div className="flex flex-wrap gap-4">
                <MetaItem icon={<CalendarDays />}>Lunes 15 de mayo</MetaItem>
                <MetaItem icon={<Banknote />}>Pago presencial</MetaItem>
              </div>
            </Panel>

            <Panel padding="lg" className="flex flex-col gap-5">
              <Overline>Horarios</Overline>
              <div className="flex flex-wrap gap-2">
                {SLOTS.map((item) => (
                  <SelectChip
                    key={item.time}
                    selected={slot === item.time}
                    disabled={item.taken}
                    strikeWhenDisabled
                    onSelect={() => setSlot(item.time)}
                  >
                    {item.time}
                  </SelectChip>
                ))}
              </div>
              <Overline>Acabado</Overline>
              <SegmentedControl
                value={finish}
                onChange={setFinish}
                options={[
                  { value: "brillante", label: "Brillante" },
                  { value: "mate", label: "Mate" },
                ]}
              />
              <Overline>Color base</Overline>
              <div className="flex flex-wrap gap-3">
                <Swatch color="" empty label="Sin color" selected={swatch === -1} onSelect={() => setSwatch(-1)} />
                {swatchColors.map((color, index) => (
                  <Swatch
                    key={color + index}
                    color={color}
                    label={color}
                    selected={swatch === index}
                    onSelect={() => setSwatch(index)}
                  />
                ))}
              </div>
            </Panel>
          </div>

          <Panel padding="lg" className="flex flex-col gap-5">
            <Overline>Forma de uña</Overline>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {NAIL_SHAPES.map((name) => (
                <OptionCard key={name} label={name} selected={shape === name} onSelect={() => setShape(name)}>
                  <span
                    className="h-14 w-9 border border-outline-variant bg-surface-3"
                    style={{
                      borderRadius:
                        name === "Cuadrada"
                          ? "4px 4px 2px 2px"
                          : name === "Stiletto"
                            ? "50% 50% 2px 2px / 70% 70% 2px 2px"
                            : "40% 40% 6px 6px",
                    }}
                  />
                </OptionCard>
              ))}
            </div>
          </Panel>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section id="vitrina" className="flex flex-col gap-8">
          <SectionHeading
            align="start"
            eyebrow="05 — Composición"
            title="Vitrina pública"
            subtitle="La landing completa armada solo con piezas del sistema."
          />

          <Panel padding="none" bordered elevation="e2" className="overflow-hidden">
            <AppHeader
              homeHref="#"
              businessName="Karla Nails Studio"
              logoUrl={photo}
              items={[
                { href: "#inicio", label: "Inicio", active: true },
                { href: "#servicios", label: "Servicios" },
                { href: "#galeria", label: "Galería" },
              ]}
            />

            <Hero
              eyebrow="Karla Nails Studio"
              title="El arte del cuidado personal."
              description="Manicura profesional con enfoque en la salud y estética minimalista. Un espacio dedicado a realzar tu belleza natural."
              imageUrl={photo}
              imageAlt="Karla trabajando en el estudio"
              primaryAction={
                <BrandButton size="lg" fullWidth icon={<CalendarDays className="size-4" />}>
                  Reservar hora
                </BrandButton>
              }
              secondaryAction={
                <BrandButton size="lg" variant="outline" fullWidth>
                  Contactar
                </BrandButton>
              }
              badge={<FloatingStat icon={<Star className="size-5" />} value="5,0" label="+200 clientas" />}
            />

            <div className="px-5">
              <Band level={1}>
                <SectionHeading
                  title="Servicios destacados"
                  subtitle="Experiencias diseñadas para el cuidado y belleza de tus manos, con técnicas avanzadas y productos premium."
                  className="mb-10"
                />
                <div className="grid gap-5 md:grid-cols-2">
                  {SERVICES.map((service) => (
                    <ServiceCard key={service.id} service={service} href="#" />
                  ))}
                </div>
                <div className="mt-10 flex justify-center">
                  <BrandButton variant="outline">Ver todos los servicios</BrandButton>
                </div>
              </Band>
            </div>

            <Section className="flex flex-col gap-6">
              <SectionHeading
                align="start"
                title="Nuestro trabajo"
                subtitle="Síguenos en Instagram @karlanails"
                action={<ActionLink href="#">Ver más</ActionLink>}
              />
              <GalleryGrid
                items={[1, 2, 3, 4].map((n) => ({
                  id: String(n),
                  imageUrl: n % 2 === 0 ? photoSoft : photo,
                  alt: "",
                }))}
              />
            </Section>

            <Section>
              <ContactCard
                icon={<MessageCircle className="size-7" />}
                title="¿Tienes alguna duda especial?"
                description="Escríbeme directamente por WhatsApp. Estaré feliz de asesorarte sobre qué servicio es el ideal para ti."
                action={<BrandButton size="lg">Contactar por WhatsApp</BrandButton>}
              />
            </Section>

            <SiteFooter
              businessName="Karla Nails Studio"
              links={[
                { label: "Servicios", href: "#servicios" },
                { label: "Instagram", href: "#instagram" },
              ]}
            />

            <BottomNavBar
              items={[
                { href: "#inicio", label: "Inicio", icon: <Home />, active: true },
                { href: "#servicios", label: "Servicios", icon: <Tag /> },
                { href: "#reservas", label: "Mis Reservas", icon: <CalendarCheck /> },
              ]}
            />
          </Panel>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section id="catalogo" className="flex flex-col gap-8">
          <SectionHeading
            align="start"
            eyebrow="06 — Composición"
            title="Catálogo y tarjeta con foto"
            subtitle="La variante media es la que usa el arquetipo Glam: foto arriba, precio en acento, flecha circular."
          />
          <div className="grid gap-5 md:grid-cols-2">
            <ServiceCard
              variant="media"
              href="#"
              service={{
                id: "esculpidas",
                name: "Esculpidas XL",
                description: "Construcción perfecta en acrílico o gel, longitud extrema con estructura impecable.",
                priceFromClp: 35000,
                durationMinutes: 120,
                imageUrl: photo,
              }}
            />
            <Panel className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <Title>Esmaltado permanente</Title>
                <Price clp={18000} prefix="Desde" size="md" />
              </div>
              <Caption>Esmalte de larga duración con acabado espejo. Incluye retiro del esmalte anterior.</Caption>
              <div className="flex flex-col">
                <VariantRow label="Corta" durationMinutes={60} priceClp={18000} href="#" />
                <VariantRow label="Media" durationMinutes={75} priceClp={22000} href="#" />
                <VariantRow label="Larga" durationMinutes={90} priceClp={26000} href="#" />
              </div>
            </Panel>
          </div>
          <EmptyState
            icon={<ImageIcon className="size-5" />}
            title="Todavía no hay servicios publicados"
            description="Cuando publiques tu primer servicio aparecerá acá, con su precio y duración."
            action={<BrandButton variant="outline">Crear servicio</BrandButton>}
          />
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section id="opiniones" className="flex flex-col gap-8">
          <SectionHeading
            align="start"
            eyebrow="07 — Composición"
            title="Opiniones"
            subtitle="Las estrellas se dibujan con iconos y no con el carácter ★: el glifo cambia con cada par tipográfico y no hereda el color de marca."
            action={<RatingSummary average={4.8} count={24} />}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <ReviewCard
              rating={5}
              body="Quedé feliz con el resultado. La atención es impecable y el diseño duró tres semanas intactas."
              authorName="Valentina S."
              authorInstagram="valen.nails"
              date="12 de mayo"
              photoUrl={photo}
            />
            <ReviewCard
              rating={4}
              body="Muy buen trabajo y súper puntual. Solo me habría gustado un poco más de variedad de colores."
              authorName="Camila R."
              date="3 de mayo"
            />
            <ReviewCard
              rating={5}
              body="La mejor manicura que me he hecho en Santiago. Vuelvo seguro."
              authorName="Josefa M."
              date="28 de abril"
              action={<ReviewStatusChip status="pending" />}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <RatingInput value={rating} onChange={setRating} />
            <ReviewStatusChip status="approved" />
            <ReviewStatusChip status="rejected" />
          </div>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section id="reserva" className="flex flex-col gap-8">
          <SectionHeading
            align="start"
            eyebrow="08 — Composición"
            title="Flujo de reserva"
            subtitle="Confirmación y barra fija con el total, como en los mockups del diseñador."
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel padding="none" bordered className="overflow-hidden">
              <div className="flex flex-col gap-5 p-6">
                <div className="flex flex-col gap-2">
                  <Display as="h2">Casi listo, revisa tu cita.</Display>
                  <Caption>Por favor, verifica los detalles de tu reserva antes de confirmar.</Caption>
                </div>

                <BookingSummaryCard
                  imageUrl={photo}
                  serviceName="Manicura Rusa"
                  variantLabel="Largo medio · 90 min"
                  priceClp={42000}
                  attributes={
                    <>
                      <Chip>Color #E6D5C3</Chip>
                      <Chip>Mate</Chip>
                      <Chip>2 gemas</Chip>
                    </>
                  }
                />

                <div className="flex flex-col gap-2">
                  <SummaryRow
                    highlighted
                    icon={<CalendarDays className="size-5" />}
                    title="Lunes 15 de mayo, 10:30"
                    detail="America/Santiago"
                  />
                  <SummaryRow
                    icon={<Banknote className="size-5" />}
                    title="Pago presencial"
                    detail="Se abona al finalizar el servicio."
                  />
                </div>

                <NoteField label="Nota para la profesional (opcional)" placeholder="Ej: tengo las cutículas sensibles…" />

                <InfoNote>
                  El horario final puede variar levemente según la complejidad del diseño en el momento.
                </InfoNote>
              </div>

              <StickyActionBar
                totalClp={42000}
                detail="+$5.000 extras · 90 min"
                action={
                  <BrandButton size="lg" icon={<ArrowRight className="size-4" />}>
                    Confirmar
                  </BrandButton>
                }
              />
            </Panel>

            <div className="flex flex-col gap-5">
              <Panel padding="lg" className="flex flex-col gap-5">
                <SegmentedControl
                  value={tab}
                  onChange={setTab}
                  className="self-start"
                  options={[
                    { value: "forma", label: "Forma" },
                    { value: "color", label: "Color & Arte" },
                  ]}
                />
                <div className="rounded-card bg-surface-2 p-6">
                  <div className="flex items-end justify-center gap-2">
                    {[0, 1, 2, 3, 4].map((n) => (
                      <span
                        key={n}
                        className="border border-outline-variant"
                        style={{
                          width: 22,
                          height: n === 2 ? 64 : n === 1 || n === 3 ? 56 : 44,
                          borderRadius: "40% 40% 6px 6px",
                          background: n === swatch ? palette.primary : palette.card,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <Overline>Uña seleccionada: medio izquierdo</Overline>
              </Panel>

              <InfoNote tone="warning">
                Quedan 2 cupos para esta semana. Cancelaciones con menos de 24 horas suman un strike.
              </InfoNote>

              <Panel padding="lg" className="flex flex-col gap-3">
                <Overline>Resumen</Overline>
                <div className="flex items-center justify-between">
                  <Caption>Servicio base</Caption>
                  <Price clp={35000} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <Caption>Extras de diseño</Caption>
                  <Price clp={7000} size="sm" />
                </div>
                <div className="flex items-center justify-between border-t border-outline-variant pt-3">
                  <span className="t-body font-medium">Total</span>
                  <Price clp={42000} size="md" className="text-primary" />
                </div>
              </Panel>
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section id="admin" className="flex flex-col gap-8">
          <SectionHeading
            align="start"
            eyebrow="09 — Composición"
            title="Panel de la profesional"
            subtitle="Mismos tokens, más densidad: acá la pantalla es herramienta de trabajo."
          />

          <Panel padding="none" bordered elevation="e2" className="overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              <nav className="flex flex-col gap-1 border-outline-variant bg-surface-1 p-4 lg:w-60 lg:border-r">
                <div className="mb-4 flex items-center gap-3 px-2">
                  <IconCircle size="md" tone="primary">
                    <Brush className="size-5" />
                  </IconCircle>
                  <div className="flex flex-col">
                    <span className="t-body font-medium">Karla P.</span>
                    <Caption className="text-xs">Manicurista</Caption>
                  </div>
                </div>
                <SidebarItem href="#" icon={<LayoutDashboard />} label="Dashboard" />
                <SidebarItem href="#" icon={<CalendarCheck />} label="Disponibilidad" />
                <SidebarItem href="#" icon={<Tag />} label="Catálogo" />
                <SidebarItem href="#" icon={<Palette />} label="Marca" active />
                <div className="mt-4 flex flex-col gap-1 border-t border-outline-variant pt-4">
                  <SidebarItem href="#" icon={<Settings />} label="Ajustes" />
                  <SidebarItem href="#" icon={<LogOut />} label="Salir" tone="danger" />
                </div>
              </nav>

              <div className="flex flex-1 flex-col gap-6 p-6">
                <AdminPageHeader
                  title="Configuración de marca"
                  description="Personaliza la apariencia de tu microsite de reservas."
                  action={
                    <BrandButton icon={<Save className="size-4" />} iconPosition="start">
                      Guardar cambios
                    </BrandButton>
                  }
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard icon={<CalendarDays className="size-5" />} label="Citas hoy" value="3" hint="1 pendiente" />
                  <StatCard icon={<Banknote className="size-5" />} label="Ingresos semana" value="$186.500" />
                  <StatCard icon={<Star className="size-5" />} label="Reseñas" value="4,9" hint="24 publicadas" />
                </div>

                <AdminCard
                  icon={<Palette />}
                  title="Arquetipo visual"
                  description="El arquetipo define colores, tipografía y forma de todo el microsite."
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {ARCHETYPE_OPTIONS.map((option) => (
                      <OptionCard
                        key={option.value}
                        label={option.label}
                        selected={archetype === option.value}
                        onSelect={() => setArchetype(option.value)}
                      >
                        <span
                          className="h-10 w-full rounded-lg border border-outline-variant"
                          style={{
                            background: `linear-gradient(135deg, ${BRAND_ARCHETYPES[option.value].light.primary}, ${BRAND_ARCHETYPES[option.value].light.accent})`,
                          }}
                        />
                      </OptionCard>
                    ))}
                  </div>
                </AdminCard>

                <AdminCard icon={<ImageIcon />} title="Identidad visual">
                  <EmptyState
                    icon={<Plus className="size-5" />}
                    title="Sube tu logotipo"
                    description="Recomendado: 512×512px, PNG con fondo transparente."
                    action={<BrandButton variant="outline">Subir imagen</BrandButton>}
                  />
                </AdminCard>
              </div>

              <AdminAside
                title="Resumen de hoy"
                subtitle="Martes, 24 de octubre"
                sectionLabel="Próximas citas (2)"
                sectionAction={<ActionLink href="#">Ver todo</ActionLink>}
                footer={
                  <BrandButton variant="outline" fullWidth icon={<Plus className="size-4" />} iconPosition="start">
                    Nueva reserva manual
                  </BrandButton>
                }
              >
                <AppointmentRow
                  href="#"
                  timeRange="10:00 – 11:30"
                  status="Confirmada"
                  serviceName="Manicura Rusa + Kapping"
                  clientName="Valentina S."
                  priceClp={28500}
                  imageUrl={photo}
                />
                <AppointmentRow
                  href="#"
                  timeRange="12:00 – 13:00"
                  status="Pendiente"
                  statusTone="warning"
                  serviceName="Esmaltado permanente"
                  clientName="Camila R."
                  priceClp={18000}
                  imageUrl={photoSoft}
                />
              </AdminAside>
            </div>
          </Panel>
        </Section>
      </Container>
    </div>
  );
}
