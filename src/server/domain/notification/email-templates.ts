import type { Booking } from "@/server/domain/booking/booking.entity";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";

export interface EmailTemplateInput {
  booking: Booking;
  branding: TenantBranding;
  professionalName: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

function formatDateTimeSantiago(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function formatClp(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

function renderLogo(logoUrl: string | null): string {
  if (!logoUrl) return "";
  return `<img src="${logoUrl}" alt="" width="120" style="display:block;margin-bottom:24px;" />`;
}

function renderShell(input: EmailTemplateInput, title: string, body: string): string {
  const primaryColor = input.branding.primaryColorHex ?? "#111111";
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      ${renderLogo(input.branding.logoUrl)}
      <h1 style="color:${primaryColor};font-size:20px;margin:0 0 16px;">${title}</h1>
      ${body}
    </div>
  `.trim();
}

export function buildPendingEmail(input: EmailTemplateInput): EmailTemplate {
  const { booking, professionalName } = input;
  const subject = `Recibimos tu solicitud de reserva con ${professionalName}`;
  const body = `
    <p>Hola, recibimos tu solicitud de reserva con <strong>${professionalName}</strong>. Está pendiente de
    confirmación — te vamos a avisar por correo apenas la profesional la confirme.</p>
    <p><strong>Fecha:</strong> ${formatDateTimeSantiago(booking.startsAt)}</p>
    <p><strong>Duración:</strong> ${booking.durationMinutes} minutos</p>
    <p><strong>Precio:</strong> ${formatClp(booking.priceClp)}</p>
  `.trim();
  return { subject, html: renderShell(input, "Solicitud recibida", body) };
}

export function buildConfirmationEmail(input: EmailTemplateInput): EmailTemplate {
  const { booking, professionalName } = input;
  const subject = `Tu reserva con ${professionalName} está confirmada`;
  const body = `
    <p>Hola, tu reserva con <strong>${professionalName}</strong> fue confirmada.</p>
    <p><strong>Fecha:</strong> ${formatDateTimeSantiago(booking.startsAt)}</p>
    <p><strong>Duración:</strong> ${booking.durationMinutes} minutos</p>
    <p><strong>Precio:</strong> ${formatClp(booking.priceClp)}</p>
  `.trim();
  return { subject, html: renderShell(input, "Reserva confirmada", body) };
}

export function buildCancellationEmail(input: EmailTemplateInput): EmailTemplate {
  const { booking, professionalName } = input;
  const subject = `Tu reserva con ${professionalName} fue cancelada`;
  const body = `
    <p>Hola, tu reserva con <strong>${professionalName}</strong> fue cancelada.</p>
    <p><strong>Fecha:</strong> ${formatDateTimeSantiago(booking.startsAt)}</p>
  `.trim();
  return { subject, html: renderShell(input, "Reserva cancelada", body) };
}
