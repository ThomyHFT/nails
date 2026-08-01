import type { EmailSender } from "@/server/domain/notification/email-sender.port";

export class FakeEmailSender implements EmailSender {
  readonly sent: Array<{ to: string; subject: string; html: string }> = [];
  failWith: string | null = null;

  async send(input: { to: string; subject: string; html: string }): Promise<{ ok: true } | { ok: false; error: string }> {
    if (this.failWith) {
      return { ok: false, error: this.failWith };
    }
    this.sent.push(input);
    return { ok: true };
  }
}
