import { describe, expect, it } from "vitest";
import { InMemoryBlobStorage } from "@/server/application/portfolio/__fakes__/in-memory-blob-storage";
import { InMemoryPortfolioRepository } from "@/server/application/portfolio/__fakes__/in-memory-portfolio-repository";
import {
  ConfigurePortfolioUseCase,
  InvalidImageUrlError,
  PortfolioItemNotFoundError,
  ServiceNotOwnedError,
} from "@/server/application/portfolio/configure-portfolio.use-case";
import { InMemoryServicesRepository } from "@/server/application/service/__fakes__/in-memory-services-repository";

const PROFESSIONAL_ID = "prof-1";

function setup() {
  const portfolioRepository = new InMemoryPortfolioRepository();
  const servicesRepository = new InMemoryServicesRepository();
  const blobStorage = new InMemoryBlobStorage();
  const useCase = new ConfigurePortfolioUseCase(portfolioRepository, servicesRepository, blobStorage);
  return { portfolioRepository, servicesRepository, blobStorage, useCase };
}

describe("ConfigurePortfolioUseCase", () => {
  it("rejects an image URL without https scheme", async () => {
    const { useCase } = setup();

    await expect(
      useCase.create({ professionalId: PROFESSIONAL_ID, imageUrl: "http://example.com/a.jpg" }),
    ).rejects.toThrow(InvalidImageUrlError);
  });

  it("creates an item unpublished by default", async () => {
    const { useCase } = setup();

    const item = await useCase.create({ professionalId: PROFESSIONAL_ID, imageUrl: "https://example.com/a.jpg" });

    expect(item.published).toBe(false);
  });

  it("rejects associating a service from another professional", async () => {
    const { useCase, servicesRepository } = setup();
    const service = await servicesRepository.createService({ professionalId: "other-prof", name: "Manicure" });

    await expect(
      useCase.create({
        professionalId: PROFESSIONAL_ID,
        imageUrl: "https://example.com/a.jpg",
        serviceId: service.id,
      }),
    ).rejects.toThrow(ServiceNotOwnedError);
  });

  it("accepts associating a service that belongs to the same professional", async () => {
    const { useCase, servicesRepository } = setup();
    const service = await servicesRepository.createService({ professionalId: PROFESSIONAL_ID, name: "Manicure" });

    const item = await useCase.create({
      professionalId: PROFESSIONAL_ID,
      imageUrl: "https://example.com/a.jpg",
      serviceId: service.id,
    });

    expect(item.serviceId).toBe(service.id);
  });

  it("deletes the row and the blob together", async () => {
    const { useCase, portfolioRepository, blobStorage } = setup();
    const item = await useCase.create({ professionalId: PROFESSIONAL_ID, imageUrl: "https://example.com/a.jpg" });

    await useCase.delete(item.id, PROFESSIONAL_ID);

    expect(portfolioRepository.items).toHaveLength(0);
    expect(blobStorage.deletedUrls).toEqual(["https://example.com/a.jpg"]);
  });

  it("throws when deleting an item from another professional", async () => {
    const { useCase } = setup();
    const item = await useCase.create({ professionalId: PROFESSIONAL_ID, imageUrl: "https://example.com/a.jpg" });

    await expect(useCase.delete(item.id, "other-prof")).rejects.toThrow(PortfolioItemNotFoundError);
  });
});
