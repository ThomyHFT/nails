import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  DM_Serif_Display,
  Fraunces,
  Geist,
  Geist_Mono,
  Inter,
  Nunito,
  Oswald,
  Outfit,
  Playfair_Display,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

// Las familias de los siete pares tipográficos (SPEC 04 y 14). Solo se
// precargan Geist y el par por defecto (Playfair + Plus Jakarta, el de Minimal
// Nude y el de la landing). `next/font` precarga por defecto, y con eso cada
// página bajaba las 11 familias (~350 KB) aunque el tenant usara un solo par;
// sin precarga, el navegador descarga solo la familia que el CSS de la página
// realmente pinta.
const playfairDisplay = Playfair_Display({ variable: "--font-playfair-display", subsets: ["latin"] });
const plusJakartaSans = Plus_Jakarta_Sans({ variable: "--font-plus-jakarta-sans", subsets: ["latin"] });
const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], preload: false });
const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], preload: false });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], preload: false });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], preload: false });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], preload: false });

const brandFontVariables = [
  geistSans.variable,
  geistMono.variable,
  playfairDisplay.variable,
  plusJakartaSans.variable,
  cormorantGaramond.variable,
  inter.variable,
  dmSerifDisplay.variable,
  outfit.variable,
  fraunces.variable,
  nunito.variable,
  oswald.variable,
].join(" ");

export const metadata: Metadata = {
  title: "AgendaUñas",
  description: "Agenda tu hora de uñas y diseña tu manicure antes de llegar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${brandFontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
