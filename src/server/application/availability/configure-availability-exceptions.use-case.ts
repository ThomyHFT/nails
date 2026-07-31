import type { AvailabilityRepository } from "@/server/domain/availability/availability-repository.port";
import type { AvailabilityException, AvailabilityExceptionKind } from "@/server/domain/availability/availability-exception.entity";

export interface CreateAvailabilityExceptionInput {
  professionalId: string;
  date: string;
  kind: AvailabilityExceptionKind;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
}

export class CreateAvailabilityExceptionUseCase {
  constructor(private readonly availabilityRepository: AvailabilityRepository) {}

  async execute(input: CreateAvailabilityExceptionInput): Promise<AvailabilityException> {
    return this.availabilityRepository.createException(input);
  }
}

export class DeleteAvailabilityExceptionUseCase {
  constructor(private readonly availabilityRepository: AvailabilityRepository) {}

  async execute(id: string, professionalId: string): Promise<void> {
    await this.availabilityRepository.deleteException(id, professionalId);
  }
}
