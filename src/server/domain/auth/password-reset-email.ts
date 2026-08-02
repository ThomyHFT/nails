import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";

export interface PasswordResetEmailInput {
  professionalName: string;
  branding: TenantBranding;
  resetUrl: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

function renderLogo(logoUrl: string | null): string {
  if (!logoUrl) return "";
  return `<img src="${logoUrl}" alt="" width="120" style="display:block;margin-bottom:24px;" />`;
}

export function buildPasswordResetEmail(input: PasswordResetEmailInput): EmailTemplate {
  const primaryColor = input.branding.primaryColorHex ?? "#111111";
  const subject = `Recupera tu contraseña en ${input.professionalName}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      ${renderLogo(input.branding.logoUrl)}
      <h1 style="color:${primaryColor};font-size:20px;margin:0 0 16px;">Recupera tu contraseña</h1>
      <p>Recibimos una solicitud para cambiar tu contraseña en <strong>${input.professionalName}</strong>.</p>
      <p><a href="${input.resetUrl}" style="color:${primaryColor};">Elegir nueva contraseña</a></p>
      <p>Si no fuiste tú, ignora este correo. El enlace vence en una hora y solo se puede usar una vez.</p>
    </div>
  `.trim();
  return { subject, html };
}
