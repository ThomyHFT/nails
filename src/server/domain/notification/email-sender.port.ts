export interface EmailSender {
  send(input: { to: string; subject: string; html: string }): Promise<{ ok: true } | { ok: false; error: string }>;
}
