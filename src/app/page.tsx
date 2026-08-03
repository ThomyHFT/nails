import type { Metadata } from "next";
import { LandingExperience } from "@/app/landing-experience";

export const metadata: Metadata = {
  title: "AgendaUñas — tu propio sitio de reservas de uñas",
  description:
    "Micrositio de reservas con tu marca para manicuristas independientes. Tus clientas agendan y diseñan su manicure antes de llegar. Sin comisiones, pago presencial.",
};

export default function HomePage() {
  return <LandingExperience />;
}
