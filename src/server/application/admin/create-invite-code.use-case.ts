import type { InviteCode } from "@/server/domain/tenant/invite-code.entity";
import { generateInviteCode } from "@/server/domain/tenant/invite-code.entity";
import type { InviteCodesRepository } from "@/server/domain/tenant/tenant-provisioning-repository.port";

export interface CreateInviteCodeInput {
  note: string | null;
  expiresInDays: number | null;
}

/** Reintentos ante una colisión de código (unique en `code`); 8 caracteres al azar la hacen improbable, pero no imposible. */
const MAX_ATTEMPTS = 5;

export class CreateInviteCodeUseCase {
  constructor(private readonly inviteCodesRepository: InviteCodesRepository) {}

  async execute(input: CreateInviteCodeInput, now: Date = new Date()): Promise<InviteCode> {
    const expiresAt =
      input.expiresInDays !== null ? new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000) : null;

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        return await this.inviteCodesRepository.create({
          code: generateInviteCode(),
          note: input.note,
          expiresAt,
        });
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }
}
