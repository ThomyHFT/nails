import type { Booking } from "@/server/domain/booking/booking.entity";
import { escapeHtml, safeColor, safeUrl } from "@/server/domain/notification/html-escape";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";

export interface EmailTemplateInput {
  booking: Booking;
  branding: TenantBranding;
  professionalName: string;
  /** wa.me de la profesional si su teléfono es visible (SPEC 18); los correos a la clienta lo ofrecen. */
  professionalWhatsAppUrl?: string | null;
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
  const src = safeUrl(logoUrl);
  if (!src) return "";
  return `<img src="${src}" alt="" width="120" style="display:block;margin-bottom:24px;" />`;
}

function renderContact(input: EmailTemplateInput, primaryColor: string): string {
  const href = safeUrl(input.professionalWhatsAppUrl ?? null);
  if (!href) return "";
  return `<p style="margin-top:24px;"><a href="${href}" style="color:${primaryColor};">¿Dudas? Escríbele por WhatsApp</a></p>`;
}

function renderShell(input: EmailTemplateInput, title: string, body: string): string {
  const primaryColor = safeColor(input.branding.primaryColorHex, "#111111");
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      ${renderLogo(input.branding.logoUrl)}
      <h1 style="color:${primaryColor};font-size:20px;margin:0 0 16px;">${title}</h1>
      ${body}
      ${renderContact(input, primaryColor)}
    </div>
  `.trim();
}

export function buildPendingEmail(input: EmailTemplateInput): EmailTemplate {
  const { booking, professionalName } = input;
  const subject = `Recibimos tu solicitud de reserva con ${professionalName}`;
  const body = `
    <p>Hola, recibimos tu solicitud de reserva con <strong>${escapeHtml(professionalName)}</strong>. Está pendiente de
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
    <p>Hola, tu reserva con <strong>${escapeHtml(professionalName)}</strong> fue confirmada.</p>
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
    <p>Hola, tu reserva con <strong>${escapeHtml(professionalName)}</strong> fue cancelada.</p>
    <p><strong>Fecha:</strong> ${formatDateTimeSantiago(booking.startsAt)}</p>
  `.trim();
  return { subject, html: renderShell(input, "Reserva cancelada", body) };
}

export interface NewBookingRequestEmailInput extends EmailTemplateInput {
  clientName: string;
  /** URL absoluta a `/[slug]/admin/reservas`, con ancla a la reserva si el llamador la arma. */
  panelUrl: string;
}

/**
 * A la profesional, no a la clienta: es el correo que faltaba para que se
 * entere de una solicitud nueva sin tener que entrar a revisar el panel a
 * cada rato.
 */
export function buildNewBookingRequestEmail(input: NewBookingRequestEmailInput): EmailTemplate {
  const { booking, clientName, panelUrl } = input;
  const subject = `Nueva solicitud de reserva de ${clientName}`;
  const body = `
    <p>Hola, <strong>${escapeHtml(clientName)}</strong> pidió una hora contigo. Queda pendiente de tu confirmación.</p>
    <p><strong>Fecha:</strong> ${formatDateTimeSantiago(booking.startsAt)}</p>
    <p><strong>Duración:</strong> ${booking.durationMinutes} minutos</p>
    <p><strong>Precio:</strong> ${formatClp(booking.priceClp)}</p>
    <p style="margin-top:24px;">
      <a href="${safeUrl(panelUrl) ?? ""}" style="display:inline-block;background:${safeColor(input.branding.primaryColorHex, "#111111")};color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;">
        Ver la reserva
      </a>
    </p>
  `.trim();
  return { subject, html: renderShell(input, "Nueva solicitud de reserva", body) };
}

export interface ClientCancelledEmailInput {
  booking: Booking;
  branding: TenantBranding;
  professionalName: string;
  clientName: string;
  /** wa.me de la clienta, para escribirle o reofrecerle la hora. */
  clientWhatsAppUrl: string | null;
  panelUrl: string | null;
}

/**
 * A la profesional, cuando la clienta cancela (SPEC 18). Antes se enteraba
 * al ver el hueco en su agenda.
 */
export function buildClientCancelledEmail(input: ClientCancelledEmailInput): EmailTemplate {
  const { booking, clientName } = input;
  const primaryColor = safeColor(input.branding.primaryColorHex, "#111111");
  const whatsApp = safeUrl(input.clientWhatsAppUrl);
  const panel = safeUrl(input.panelUrl);
  const subject = `${clientName} canceló su reserva`;
  const body = `
    <p><strong>${escapeHtml(clientName)}</strong> canceló su hora del ${formatDateTimeSantiago(booking.startsAt)}. El horario volvió a quedar disponible.</p>
    ${whatsApp ? `<p><a href="${whatsApp}" style="color:${primaryColor};">Escribirle por WhatsApp</a></p>` : ""}
    ${panel ? `<p><a href="${panel}" style="color:${primaryColor};">Ver mis reservas</a></p>` : ""}
  `.trim();
  return {
    subject,
    html: renderShell({ booking, branding: input.branding, professionalName: input.professionalName }, "Reserva cancelada", body),
  };
}

export interface RescheduledEmailInput extends EmailTemplateInput {
  previousStartsAt: Date;
  /** Quién movió la reserva: define a quién va el correo y cómo se redacta. */
  movedBy: "client" | "professional";
  clientName: string;
  /** Al avisarle a la profesional: el WhatsApp de la clienta. */
  clientWhatsAppUrl?: string | null;
}

/**
 * Aviso de reserva movida (SPEC 19). Si la movió la clienta, va a la
 * profesional; si la movió la profesional, va a la clienta.
 */
export function buildRescheduledEmail(input: RescheduledEmailInput): EmailTemplate {
  const { booking, previousStartsAt, movedBy } = input;
  const primaryColor = safeColor(input.branding.primaryColorHex, "#111111");
  if (movedBy === "client") {
    const whatsApp = safeUrl(input.clientWhatsAppUrl ?? null);
    const body = `
      <p><strong>${escapeHtml(input.clientName)}</strong> movió su hora.</p>
      <p><strong>Antes:</strong> ${formatDateTimeSantiago(previousStartsAt)}</p>
      <p><strong>Ahora:</strong> ${formatDateTimeSantiago(booking.startsAt)}</p>
      ${whatsApp ? `<p><a href="${whatsApp}" style="color:${primaryColor};">Escribirle por WhatsApp</a></p>` : ""}
    `.trim();
    return {
      subject: `${input.clientName} reagendó su reserva`,
      html: renderShell({ ...input, professionalWhatsAppUrl: null }, "Reserva reagendada", body),
    };
  }
  const body = `
    <p>${escapeHtml(input.professionalName)} cambió la hora de tu reserva.</p>
    <p><strong>Antes:</strong> ${formatDateTimeSantiago(previousStartsAt)}</p>
    <p><strong>Ahora:</strong> ${formatDateTimeSantiago(booking.startsAt)}</p>
  `.trim();
  return {
    subject: `Tu reserva con ${input.professionalName} cambió de hora`,
    html: renderShell(input, "Reserva reagendada", body),
  };
}

export interface ReminderEmailInput extends EmailTemplateInput {
  serviceName: string | null;
  /** "Mis reservas" en el micrositio, para cancelar o reagendar. */
  accountUrl: string | null;
}

/** Recordatorio del día antes (SPEC 19). */
export function buildReminderEmail(input: ReminderEmailInput): EmailTemplate {
  const { booking, professionalName } = input;
  const primaryColor = safeColor(input.branding.primaryColorHex, "#111111");
  const account = safeUrl(input.accountUrl);
  const body = `
    <p>Te esperamos mañana en <strong>${escapeHtml(professionalName)}</strong>.</p>
    <p><strong>Fecha:</strong> ${formatDateTimeSantiago(booking.startsAt)}</p>
    ${input.serviceName ? `<p><strong>Servicio:</strong> ${escapeHtml(input.serviceName)}</p>` : ""}
    <p><strong>Duración:</strong> ${booking.durationMinutes} minutos</p>
    ${account ? `<p><a href="${account}" style="color:${primaryColor};">Ver, cambiar o cancelar mi reserva</a></p>` : ""}
  `.trim();
  return {
    subject: `Recordatorio: mañana tienes hora con ${professionalName}`,
    html: renderShell(input, "Recordatorio de tu hora", body),
  };
}
