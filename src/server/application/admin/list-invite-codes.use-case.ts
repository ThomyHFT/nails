import type { InviteCode } from "@/server/domain/tenant/invite-code.entity";
import type { InviteCodesRepository } from "@/server/domain/tenant/tenant-provisioning-repository.port";

export class ListInviteCodesUseCase {
  constructor(private readonly inviteCodesRepository: InviteCodesRepository) {}

  async execute(): Promise<InviteCode[]> {
    return this.inviteCodesRepository.findAll();
  }
}
