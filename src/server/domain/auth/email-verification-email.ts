import type { EmailTemplate } from "@/server/domain/auth/password-reset-email";

export interface EmailVerificationEmailInput {
  businessName: string;
  verifyUrl: string;
}

/**
 * A diferencia del correo de recuperar contraseña, este no lleva marca del
 * tenant: la profesional recién se está registrando y puede no haber
 * configurado nada todavía en /admin/marca. Usa el color del producto.
 */
export function buildEmailVerificationEmail(input: EmailVerificationEmailInput): EmailTemplate {
  const brandColor = "#111111";
  const subject = "Verifica tu correo para publicar tu sitio";
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      <h1 style="color:${brandColor};font-size:20px;margin:0 0 16px;">Un último paso</h1>
      <p>Tu cuenta para <strong>${input.businessName}</strong> ya está creada. Puedes entrar a tu panel y configurar
      tu negocio ahora mismo — pero tu micrositio todavía no es visible para tus clientas.</p>
      <p><a href="${input.verifyUrl}" style="color:${brandColor};">Verificar mi correo y publicar mi sitio</a></p>
      <p>El enlace vence en 24 horas y solo se puede usar una vez.</p>
    </div>
  `.trim();
  return { subject, html };
}
