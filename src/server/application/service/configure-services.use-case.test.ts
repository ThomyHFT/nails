import { describe, expect, it } from "vitest";
import { InMemoryServicesRepository } from "@/server/application/service/__fakes__/in-memory-services-repository";
import {
  ConfigureServicesUseCase,
  DuplicateNailLengthError,
  InvalidDurationError,
  InvalidNailLengthError,
  InvalidPriceError,
  InvalidServiceNameError,
  ServiceNotFoundError,
} from "@/server/application/service/configure-services.use-case";

const PROFESSIONAL_ID = "prof-1";

describe("ConfigureServicesUseCase", () => {
  it("rejects an empty service name", async () => {
    const useCase = new ConfigureServicesUseCase(new InMemoryServicesRepository());

    await expect(
      useCase.createService({ professionalId: PROFESSIONAL_ID, name: "   " }),
    ).rejects.toThrow(InvalidServiceNameError);
  });

  it("creates a service with a valid name", async () => {
    const useCase = new ConfigureServicesUseCase(new InMemoryServicesRepository());

    const service = await useCase.createService({ professionalId: PROFESSIONAL_ID, name: "Manicure" });

    expect(service.name).toBe("Manicure");
  });

  it("rejects a negative or zero price", async () => {
    const repository = new InMemoryServicesRepository();
    const useCase = new ConfigureServicesUseCase(repository);
    const service = await useCase.createService({ professionalId: PROFESSIONAL_ID, name: "Manicure" });

    await expect(
      useCase.createVariant({
        professionalId: PROFESSIONAL_ID,
        serviceId: service.id,
        nailLength: "short",
        priceClp: 0,
        durationMinutes: 30,
      }),
    ).rejects.toThrow(InvalidPriceError);
  });

  it("rejects a zero duration", async () => {
    const repository = new InMemoryServicesRepository();
    const useCase = new ConfigureServicesUseCase(repository);
    const service = await useCase.createService({ professionalId: PROFESSIONAL_ID, name: "Manicure" });

    await expect(
      useCase.createVariant({
        professionalId: PROFESSIONAL_ID,
        serviceId: service.id,
        nailLength: "short",
        priceClp: 10_000,
        durationMinutes: 0,
      }),
    ).rejects.toThrow(InvalidDurationError);
  });

  it("rejects a nail_length outside the enum", async () => {
    const repository = new InMemoryServicesRepository();
    const useCase = new ConfigureServicesUseCase(repository);
    const service = await useCase.createService({ professionalId: PROFESSIONAL_ID, name: "Manicure" });

    await expect(
      useCase.createVariant({
        professionalId: PROFESSIONAL_ID,
        serviceId: service.id,
        // @ts-expect-error probando un valor fuera del enum
        nailLength: "giant",
        priceClp: 10_000,
        durationMinutes: 30,
      }),
    ).rejects.toThrow(InvalidNailLengthError);
  });

  it("rejects a duplicate nail_length for the same service", async () => {
    const repository = new InMemoryServicesRepository();
    const useCase = new ConfigureServicesUseCase(repository);
    const service = await useCase.createService({ professionalId: PROFESSIONAL_ID, name: "Manicure" });

    await useCase.createVariant({
      professionalId: PROFESSIONAL_ID,
      serviceId: service.id,
      nailLength: "short",
      priceClp: 10_000,
      durationMinutes: 30,
    });

    await expect(
      useCase.createVariant({
        professionalId: PROFESSIONAL_ID,
        serviceId: service.id,
        nailLength: "short",
        priceClp: 12_000,
        durationMinutes: 40,
      }),
    ).rejects.toThrow(DuplicateNailLengthError);
  });

  it("rejects creating a variant for a service from another professional", async () => {
    const repository = new InMemoryServicesRepository();
    const useCase = new ConfigureServicesUseCase(repository);
    const service = await useCase.createService({ professionalId: PROFESSIONAL_ID, name: "Manicure" });

    await expect(
      useCase.createVariant({
        professionalId: "other-prof",
        serviceId: service.id,
        nailLength: "short",
        priceClp: 10_000,
        durationMinutes: 30,
      }),
    ).rejects.toThrow(ServiceNotFoundError);
  });
});
