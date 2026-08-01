import { Resend } from "resend";
import type { EmailSender } from "@/server/domain/notification/email-sender.port";

export class ResendEmailSender implements EmailSender {
  private readonly client: Resend;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(input: { to: string; subject: string; html: string }): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const { error } = await this.client.emails.send({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });

      if (error) {
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Error desconocido al enviar el email" };
    }
  }
}
