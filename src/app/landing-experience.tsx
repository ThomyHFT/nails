"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Check,
  HeartPulse,
  Moon,
  Palette,
  Scissors,
  Smartphone,
  Sparkles,
  Sun,
  Wallet,
} from "lucide-react";
import {
  Band,
  Body,
  BodyLarge,
  BrandButton,
  Caption,
  Container,
  Eyebrow,
  IconCircle,
  Overline,
  Panel,
  Section,
  SectionHeading,
  SiteFooter,
  Swatch,
  Title,
} from "@/components/brand";
import type { BrandArchetype } from "@/server/domain/branding/brand-tokens";
import { VERTICALS, type Vertical } from "@/server/domain/tenant/vertical";
import {
  ARCHETYPE_CHOICES,
  PLAYGROUND_COLORS,
  landingBrandStyle,
  landingPalette,
  type ThemeMode,
} from "@/app/landing-theme";
import { LandingPreview } from "@/app/landing-preview";

const REGISTER_HREF = "/registro-profesional";

/**
 * Copy que sí depende del rubro (SPEC 13 fase 3): a quién le habla el hero y
 * el segundo beneficio, que en uñas es el diseñador y en el resto no existe.
 * El resto de la página (agenda, panel, comisiones) es igual para los tres.
 */
const BENEFITS_SUBTITLE_BY_VERTICAL: Record<Vertical, string> = {
  nails: "Todo lo que hoy haces a mano entre conversaciones — cuadrar la hora, explicar precios, recordar el diseño — pasa a tu sitio.",
  barbershop:
    "Todo lo que hoy haces a mano entre conversaciones — cuadrar la hora, explicar precios, confirmar el turno — pasa a tu sitio.",
  wellness:
    "Todo lo que hoy haces a mano entre conversaciones — cuadrar la hora, explicar precios, confirmar el turno — pasa a tu sitio.",
};

const FOOTER_TAGLINE_BY_VERTICAL: Record<Vertical, string> = {
  nails: "Agenda y diseño de uñas para manicuristas independientes en Chile.",
  barbershop: "Agenda online para barberos y peluqueros independientes en Chile.",
  wellness: "Agenda online para masajistas y podólogas independientes en Chile.",
};

const HERO_COPY: Record<Vertical, { eyebrow: string; description: string }> = {
  nails: {
    eyebrow: "Para manicuristas independientes",
    description:
      "Tus clientas entran a tu link, eligen su hora y diseñan su manicure antes de llegar. Tú abres el panel y ves el día resuelto.",
  },
  barbershop: {
    eyebrow: "Para barberos y peluqueros independientes",
    description:
      "Tus clientes entran a tu link, eligen su hora y ven el precio exacto de su corte. Tú abres el panel y ves el día resuelto.",
  },
  wellness: {
    eyebrow: "Para masajistas y podólogas independientes",
    description:
      "Tus pacientes entran a tu link, eligen su hora y ven el precio exacto de su sesión. Tú abres el panel y ves el día resuelto.",
  },
};

const SECOND_FEATURE_BY_VERTICAL: Record<Vertical, { icon: React.ReactNode; title: string; description: string }> = {
  nails: {
    icon: <Palette aria-hidden />,
    title: "Llegan con el diseño listo",
    description:
      "Eligen forma, color, acabado y decoración desde tu catálogo. El precio y la duración se calculan solos, antes de sentarse.",
  },
  barbershop: {
    icon: <Scissors aria-hidden />,
    title: "Ven el precio antes de llegar",
    description: "Cada corte tiene su precio y duración propios. Eligen, ven el total, reservan — sin preguntarte por WhatsApp.",
  },
  wellness: {
    icon: <HeartPulse aria-hidden />,
    title: "Ven el precio antes de llegar",
    description: "Cada sesión tiene su precio y duración propios. Eligen, ven el total, reservan — sin preguntarte por WhatsApp.",
  },
};

function featuresFor(vertical: Vertical) {
  return [
    {
      icon: <CalendarClock aria-hidden />,
      title: "Agenda que trabaja sola",
      description:
        "Tus clientas ven tus horas libres y reservan a la hora que sea. Tú confirmas con un toque y dejas de perseguir mensajes.",
    },
    SECOND_FEATURE_BY_VERTICAL[vertical],
    {
      icon: <Smartphone aria-hidden />,
      title: "Tu panel, en tu teléfono",
      description:
        "Citas, servicios, portafolio y opiniones. Todo desde el navegador, sin instalar nada y sin computador.",
    },
    {
      icon: <Wallet aria-hidden />,
      title: "Cero comisiones",
      description:
        "El pago sigue siendo presencial, como siempre lo has hecho. AgendaUñas no toca ni un peso de lo que cobras.",
    },
  ];
}

const STEPS = [
  {
    title: "Elige tu dirección",
    description: "agendaunas.cl/tu-nombre queda tuya en el mismo formulario de registro.",
  },
  {
    title: "Carga tus servicios",
    description: "Partes con un catálogo sugerido y lo ajustas a tus precios y duraciones reales.",
  },
  {
    title: "Comparte el link",
    description: "Va en tu bio de Instagram y en tu estado de WhatsApp. Las reservas llegan solas.",
  },
];

export function LandingExperience() {
  const [archetype, setArchetype] = useState<BrandArchetype>("minimal_nude");
  const [mode, setMode] = useState<ThemeMode>("light");
  const [primary, setPrimary] = useState<string | null>(null);
  const [vertical, setVertical] = useState<Vertical>("nails");

  const heroCopy = HERO_COPY[vertical];
  const features = featuresFor(vertical);
  const palette = landingPalette(archetype, mode, primary);
  // Sin el override: es lo que muestra la primera muestra del conmutador, que
  // es el botón de "volver al color del estilo". Con el color activo se veía
  // igual que la muestra elegida y dejaba de leerse como la salida.
  const basePalette = landingPalette(archetype, mode, null);

  return (
    <div
      className="tenant-brand flex min-h-screen flex-col bg-background text-foreground transition-colors duration-500 [transition-timing-function:var(--ease-brand)]"
      style={landingBrandStyle(archetype, mode, primary)}
    >
      {/* ------------------------------------------------------------------
          Barra de estilo. Va arriba y pegada porque es la invitación a jugar:
          si el visitante entiende en tres segundos que la página cambia con
          él, ya entendió el producto entero.
         ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-50 border-b border-outline-variant bg-surface-1/90 backdrop-blur">
        <Container size="xl" className="flex items-center justify-between gap-3 px-5 py-2.5">
          {/* La marca se va en móvil: en 390px la barra se partía en tres filas
              y se comía un octavo de la pantalla para siempre. El nombre ya
              está en el hero y en el pie. */}
          <span className="hidden font-heading text-lg font-semibold text-primary sm:inline">AgendaUñas</span>

          <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none sm:justify-end">
            <Overline className="hidden lg:inline">Pruébalo</Overline>
            {/* Una sola fila que se desliza: en móvil los cuatro estilos no
                caben, y envolverlos crecía la barra pegada. */}
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto sm:flex-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ARCHETYPE_CHOICES.map((choice) => {
                const active = choice.value === archetype;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    onClick={() => setArchetype(choice.value)}
                    aria-pressed={active}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 [transition-timing-function:var(--ease-brand)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      active
                        ? "border-primary bg-primary-tint text-primary"
                        : "border-outline-variant text-muted-foreground hover:bg-surface-2"
                    }`}
                  >
                    <span className="flex -space-x-1">
                      {/* Índice y no color como key: Editorial repite el mismo
                          #111111 en primary y accent. */}
                      {choice.swatches.map((color, index) => (
                        <span
                          key={index}
                          className="size-2.5 rounded-full border border-outline-variant"
                          style={{ background: color }}
                        />
                      ))}
                    </span>
                    {choice.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setMode(mode === "light" ? "dark" : "light")}
              aria-label={mode === "light" ? "Ver en modo oscuro" : "Ver en modo claro"}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-outline-variant text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:size-4"
            >
              {mode === "light" ? <Moon /> : <Sun />}
            </button>
          </div>
        </Container>
      </div>

      {/* ------------------------------------------------------------------ Hero */}
      <Container size="xl" className="px-5">
        <div className="flex flex-col items-center gap-12 py-12 md:flex-row md:gap-16 md:py-20">
          {/* Sin `order`: acá el titular vende y va primero también en móvil.
              El microsite de un tenant hace lo contrario (la foto del trabajo
              primero), pero eso es un oficio visual y esto es una promesa. */}
          <div className="flex w-full flex-col items-start gap-6 md:w-[55%]">
            {/* Conmutador de rubro: distinto del de estilo (que vive en la
                barra pegada) porque cambia copy y el micrositio de ejemplo,
                no colores. Va junto al eyebrow porque es lo primero que
                decide con qué se identifica quien visita. */}
            <div className="flex flex-wrap items-center gap-2">
              {VERTICALS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVertical(option.value)}
                  aria-pressed={option.value === vertical}
                  className={`rounded-pill border px-3 py-1.5 text-xs font-semibold transition-all duration-200 [transition-timing-function:var(--ease-brand)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    option.value === vertical
                      ? "border-primary bg-primary-tint text-primary"
                      : "border-outline-variant text-muted-foreground hover:bg-surface-2"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <Eyebrow>{heroCopy.eyebrow}</Eyebrow>

            <h1 className="font-heading text-[clamp(2.5rem,1.6rem+3.6vw,4.25rem)] leading-[1.04] font-bold tracking-[-0.03em] text-balance">
              Tu propio sitio de reservas,{" "}
              <span className="text-primary">con tu marca</span>.
            </h1>

            <BodyLarge className="max-w-lg">{heroCopy.description}</BodyLarge>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <BrandButton href={REGISTER_HREF} size="lg" icon={<ArrowRight className="size-4" />}>
                Crear mi sitio
              </BrandButton>
              <Caption className="sm:max-w-[14rem]">
                30 días de prueba. Sin tarjeta, sin comisiones.
              </Caption>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2">
              {["Pago presencial", "En español y CLP", "Listo en minutos"].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="size-4 text-primary" strokeWidth={2.5} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="flex w-full justify-center md:w-[45%]">
            <div className="relative">
              {/* Halo teñido con el primary del momento: es el que hace que el
                  teléfono flote en vez de quedar pegado al fondo. */}
              <div
                className="pointer-events-none absolute -inset-8 -z-10 rounded-full opacity-40 blur-3xl transition-colors duration-500"
                style={{ background: palette.primary }}
              />
              <LandingPreview palette={palette} vertical={vertical} />
            </div>
          </div>
        </div>
      </Container>

      {/* ------------------------------------------------------------------ Beneficios */}
      <Section id="beneficios">
        <Container size="xl" className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Lo que resuelve"
            title="Deja de agendar por mensajes"
            subtitle={BENEFITS_SUBTITLE_BY_VERTICAL[vertical]}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Panel key={feature.title} className="flex flex-col items-start gap-4">
                <IconCircle size="md" tone="primary">
                  {feature.icon}
                </IconCircle>
                <Title>{feature.title}</Title>
                <Body className="text-sm">{feature.description}</Body>
              </Panel>
            ))}
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------------ Playground de color */}
      <Section id="tu-marca">
        <Container size="xl">
          <Band level={2} className="flex flex-col gap-10">
            <SectionHeading
              eyebrow="Tu marca"
              title="Elige tu color y míralo aquí mismo"
              subtitle="Esta página está usando tu selección en vivo — tipografías, esquinas, botones y bandas incluidas. Tu micrositio funciona exactamente igual."
            />

            <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-14">
              <div className="flex w-full flex-col gap-8 lg:w-3/5">
                <div className="flex flex-col gap-4">
                  <Overline>Estilo base</Overline>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {ARCHETYPE_CHOICES.map((choice) => {
                      const active = choice.value === archetype;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          onClick={() => setArchetype(choice.value)}
                          aria-pressed={active}
                          className={`flex flex-col gap-3 rounded-card border p-3 text-left transition-all duration-200 [transition-timing-function:var(--ease-brand)] outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                            active
                              ? "border-primary bg-card shadow-e1"
                              : "border-outline-variant bg-surface-1 hover:bg-card"
                          }`}
                        >
                          <span className="flex gap-1">
                            {choice.swatches.map((color, index) => (
                              <span
                                key={index}
                                className="h-8 flex-1 rounded-sm border border-outline-variant"
                                style={{ background: color }}
                              />
                            ))}
                          </span>
                          <span className="flex items-center justify-between gap-1 text-sm font-semibold">
                            {choice.label}
                            {active && <Check className="size-4 text-primary" strokeWidth={3} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <Overline>Tu color principal</Overline>
                  <div className="flex flex-wrap items-center gap-3">
                    <Swatch
                      color={basePalette.primary}
                      label="Color del estilo base"
                      selected={primary === null}
                      onSelect={() => setPrimary(null)}
                    />
                    <span className="h-8 w-px bg-outline-variant" />
                    {PLAYGROUND_COLORS.map((color) => (
                      <Swatch
                        key={color.hex}
                        color={color.hex}
                        label={color.label}
                        selected={primary === color.hex}
                        onSelect={() => setPrimary(color.hex)}
                      />
                    ))}

                    {/* El selector nativo es el remate: deja claro que no son
                        siete opciones, es cualquier color. */}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-outline-variant px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                      <Sparkles className="size-4 text-primary" aria-hidden />
                      El mío
                      <input
                        type="color"
                        value={primary ?? basePalette.primary}
                        onChange={(event) => setPrimary(event.target.value)}
                        className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0 outline-none"
                      />
                    </label>
                  </div>
                  <Caption>
                    Después puedes cambiarlo cuando quieras desde tu panel, sin tocar una línea de código.
                  </Caption>
                </div>
              </div>

              <div className="flex w-full justify-center lg:w-2/5">
                <LandingPreview palette={palette} vertical={vertical} />
              </div>
            </div>
          </Band>
        </Container>
      </Section>

      {/* ------------------------------------------------------------------ Cómo funciona */}
      <Section id="como-funciona">
        <Container size="lg" className="flex flex-col gap-10">
          <SectionHeading eyebrow="Cómo parte" title="Tres pasos y estás recibiendo reservas" />

          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <Title>{step.title}</Title>
                <Body className="text-sm">{step.description}</Body>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ------------------------------------------------------------------ Cierre */}
      <Section id="empezar">
        <Container size="lg">
          <Band level={3} className="flex flex-col items-center gap-6 text-center">
            <IconCircle size="lg" tone="primary">
              <Sparkles aria-hidden />
            </IconCircle>
            <h2 className="font-heading text-[clamp(1.75rem,1.3rem+2vw,2.75rem)] leading-tight font-bold tracking-[-0.02em] text-balance">
              Tu sitio puede estar listo esta tarde
            </h2>
            <Body className="max-w-xl">
              Necesitas un código de invitación y cinco minutos. La prueba corre 30 días y tu panel
              queda abierto desde el primer momento.
            </Body>
            <BrandButton href={REGISTER_HREF} size="lg" icon={<ArrowRight className="size-4" />}>
              Crear mi sitio
            </BrandButton>
          </Band>
        </Container>
      </Section>

      <SiteFooter
        businessName="AgendaUñas"
        tagline={FOOTER_TAGLINE_BY_VERTICAL[vertical]}
        links={[{ label: "Crear mi sitio", href: REGISTER_HREF }]}
        className="mt-auto"
      />
    </div>
  );
}
