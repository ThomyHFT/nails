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
});

// Las familias de los siete pares tipográficos (SPEC 04 y 14). `next/font`
// solo emite el @font-face; el navegador descarga la familia que el par
// activo del tenant use, no todas.
const playfairDisplay = Playfair_Display({ variable: "--font-playfair-display", subsets: ["latin"] });
const plusJakartaSans = Plus_Jakarta_Sans({ variable: "--font-plus-jakarta-sans", subsets: ["latin"] });
const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: "400",
});
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"] });

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
