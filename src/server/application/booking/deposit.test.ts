import { describe, expect, it } from "vitest";
import { InMemoryAvailabilityRepository } from "@/server/application/booking/__fakes__/in-memory-availability-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryDesignRepository } from "@/server/application/design/__fakes__/in-memory-design-repository";
import { CreateBookingUseCase } from "@/server/application/booking/create-booking.use-case";
import {
  DepositNotApplicableError,
  MarkDepositReceivedUseCase,
} from "@/server/application/booking/mark-deposit-received.use-case";
import { BookingNotOwnedError } from "@/server/application/booking/booking-guard-errors";
import { DEFAULT_BOOKING_POLICY } from "@/server/domain/professional/booking-policy";
import {
  DEFAULT_PROFESSIONAL_COMMERCE,
  bankDetailsText,
  depositForPrice,
  parseBankDetails,
  type ProfessionalCommerce,
} from "@/server/domain/professional/commerce";

const BANK = {
  bank: "BancoEstado",
  accountType: "Cuenta RUT",
  accountNumber: "12345678",
  holderName: "Fran Pérez",
  holderRut: "12.345.678-9",
  email: "fran@x.cl",
};
const WITH_DEPOSIT: ProfessionalCommerce = { ...DEFAULT_PROFESSIONAL_COMMERCE, depositClp: 5000, bankDetails: BANK };
const NOW = new Date("2026-08-01T00:00:00Z");

async function setup(commerce: ProfessionalCommerce, autoConfirm = false, priceClp = 15_000) {
  const availability = new InMemoryAvailabilityRepository();
  const bookings = new InMemoryBookingRepository();
  await availability.createRule({
    professionalId: "prof-1",
    weekday: 1,
    startTime: "09:00",
    endTime: "12:00",
    effectiveMonth: "2026-08-01",
  });
  const booking = await new CreateBookingUseCase(availability, bookings, new InMemoryDesignRepository()).execute({
    professionalId: "prof-1",
    professionalVertical: "nails",
    timezone: "UTC",
    bufferMinutes: 0,
    clientUserId: "client-1",
    serviceVariantId: "variant-1",
    date: "2026-08-10",
    startsAt: "2026-08-10T09:00:00.000Z",
    priceClp,
    durationMinutes: 60,
    now: NOW,
    policy: { ...DEFAULT_BOOKING_POLICY, autoConfirm },
    commerce,
  });
  return { booking, bookings };
}

describe("depositForPrice", () => {
  it("never exceeds the price and needs complete bank details", () => {
    expect(depositForPrice(WITH_DEPOSIT, 15_000)).toBe(5000);
    expect(depositForPrice(WITH_DEPOSIT, 3000)).toBe(3000);
    expect(depositForPrice({ ...WITH_DEPOSIT, bankDetails: { ...BANK, accountNumber: " " } }, 15_000)).toBeNull();
    expect(depositForPrice(DEFAULT_PROFESSIONAL_COMMERCE, 15_000)).toBeNull();
  });

  it("parses only well-formed bank details", () => {
    expect(parseBankDetails(BANK)).toEqual(BANK);
    expect(parseBankDetails({ ...BANK, email: 3 })).toBeNull();
    expect(parseBankDetails(null)).toBeNull();
    expect(bankDetailsText(BANK)).toContain("Cuenta RUT 12345678");
  });
});

describe("deposit on booking", () => {
  it("freezes the deposit and stays pending even with auto-confirm", async () => {
    const { booking } = await setup(WITH_DEPOSIT, true);
    expect(booking.depositClp).toBe(5000);
    expect(booking.status).toBe("pending");
  });

  it("keeps auto-confirm when there is no deposit", async () => {
    const { booking } = await setup(DEFAULT_PROFESSIONAL_COMMERCE, true);
    expect(booking.depositClp).toBeNull();
    expect(booking.status).toBe("confirmed");
  });

  it("marks the deposit received and confirms a pending booking", async () => {
    const { booking, bookings } = await setup(WITH_DEPOSIT);
    const result = await new MarkDepositReceivedUseCase(bookings).execute(booking.id, "prof-1");
    expect(result.confirmedNow).toBe(true);
    expect(result.booking.status).toBe("confirmed");
    expect(result.booking.depositPaidAt).not.toBeNull();
  });

  it("refuses bookings without a deposit, already paid, or from another tenant", async () => {
    const plain = await setup(DEFAULT_PROFESSIONAL_COMMERCE);
    await expect(new MarkDepositReceivedUseCase(plain.bookings).execute(plain.booking.id, "prof-1")).rejects.toThrow(
      DepositNotApplicableError,
    );

    const { booking, bookings } = await setup(WITH_DEPOSIT);
    const useCase = new MarkDepositReceivedUseCase(bookings);
    await expect(useCase.execute(booking.id, "prof-2")).rejects.toThrow(BookingNotOwnedError);
    await useCase.execute(booking.id, "prof-1");
    await expect(useCase.execute(booking.id, "prof-1")).rejects.toThrow(DepositNotApplicableError);
  });
});
