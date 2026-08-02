import { describe, expect, it } from "vitest";
import { InMemoryServicesRepository } from "@/server/application/service/__fakes__/in-memory-services-repository";
import {
  ConfigureServicesUseCase,
  DuplicateNailLengthError,
  InvalidDurationError,
  InvalidNailLengthError,
  InvalidPriceError,
  InvalidServiceNameError,
  ServiceHasBookingsError,
  ServiceNotFoundError,
  VariantHasBookingsError,
  VariantNotFoundError,
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

  it("deletes a variant with no bookings", async () => {
    const repository = new InMemoryServicesRepository();
    const useCase = new ConfigureServicesUseCase(repository);
    const service = await useCase.createService({ professionalId: PROFESSIONAL_ID, name: "Manicure" });
    const variant = await useCase.createVariant({
      professionalId: PROFESSIONAL_ID,
      serviceId: service.id,
      nailLength: "short",
      priceClp: 10_000,
      durationMinutes: 30,
    });

    await useCase.deleteVariant(variant.id, PROFESSIONAL_ID);

    expect(repository.variants).toHaveLength(0);
  });

  it("refuses to delete a variant with existing bookings", async () => {
    const repository = new InMemoryServicesRepository();
    const useCase = new ConfigureServicesUseCase(repository);
    const service = await useCase.createService({ professionalId: PROFESSIONAL_ID, name: "Manicure" });
    const variant = await useCase.createVariant({
      professionalId: PROFESSIONAL_ID,
      serviceId: service.id,
      nailLength: "short",
      priceClp: 10_000,
      durationMinutes: 30,
    });
    repository.bookedVariantIds.add(variant.id);

    await expect(useCase.deleteVariant(variant.id, PROFESSIONAL_ID)).rejects.toThrow(VariantHasBookingsError);
    expect(repository.variants).toHaveLength(1);
  });

  it("rejects deleting a variant that does not exist", async () => {
    const useCase = new ConfigureServicesUseCase(new InMemoryServicesRepository());

    await expect(useCase.deleteVariant("missing", PROFESSIONAL_ID)).rejects.toThrow(VariantNotFoundError);
  });

  it("deletes a service and all its variants", async () => {
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

    await useCase.deleteService(service.id, PROFESSIONAL_ID);

    expect(repository.services).toHaveLength(0);
    expect(repository.variants).toHaveLength(0);
  });

  it("refuses to delete a service when any of its variants has bookings", async () => {
    const repository = new InMemoryServicesRepository();
    const useCase = new ConfigureServicesUseCase(repository);
    const service = await useCase.createService({ professionalId: PROFESSIONAL_ID, name: "Manicure" });
    const variant = await useCase.createVariant({
      professionalId: PROFESSIONAL_ID,
      serviceId: service.id,
      nailLength: "short",
      priceClp: 10_000,
      durationMinutes: 30,
    });
    repository.bookedVariantIds.add(variant.id);

    await expect(useCase.deleteService(service.id, PROFESSIONAL_ID)).rejects.toThrow(ServiceHasBookingsError);
    expect(repository.services).toHaveLength(1);
    expect(repository.variants).toHaveLength(1);
  });
});
