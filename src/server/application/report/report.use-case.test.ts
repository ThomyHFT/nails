import { describe, expect, it } from "vitest";
import { makeProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { ReportUseCase } from "@/server/application/report/report.use-case";
import { InMemoryServicesRepository } from "@/server/application/service/__fakes__/in-memory-services-repository";
import { placeholderEmail } from "@/server/domain/user/client-contact";

describe("ReportUseCase (SPEC 20)", () => {
  it("exports this business's bookings in local time, hiding placeholder emails", async () => {
    const bookings = new InMemoryBookingRepository();
    const users = new InMemoryUserRepository();
    const professional = makeProfessional({ id: "prof-1", timezone: "America/Santiago" });
    const ana = await users.create({ email: "ana@example.com", passwordHash: "h", name: "Ana", phone: "+56911112222", role: "client" });
    const manual = await users.create({ email: placeholderEmail("x"), passwordHash: "!", name: "=Sin correo", role: "client" });
    const base = { serviceVariantId: "v", priceClp: 15_000, durationMinutes: 60 };
    await bookings.create({ ...base, professionalId: "prof-1", clientUserId: ana.id, startsAt: new Date("2026-08-11T03:30:00Z"), endsAt: new Date("2026-08-11T04:30:00Z") });
    await bookings.create({ ...base, professionalId: "prof-1", clientUserId: manual.id, startsAt: new Date("2026-08-12T14:00:00Z"), endsAt: new Date("2026-08-12T15:00:00Z") });
    await bookings.create({ ...base, professionalId: "otra", clientUserId: ana.id, startsAt: new Date("2026-08-13T14:00:00Z"), endsAt: new Date("2026-08-13T15:00:00Z") });

    const csv = await new ReportUseCase(bookings, users, new InMemoryServicesRepository()).bookingsCsv(professional);
    const lines = csv.trim().split("\r\n");

    expect(lines).toHaveLength(3);
    // El teléfono con "+" va como texto: si no, Excel lo convierte en número y se come el prefijo.
    expect(lines[1]).toBe("2026-08-10;23:30;Pendiente;Servicio;;60;15000;Ana;'+56911112222;ana@example.com;;");
    expect(lines[2]).toContain(";'=Sin correo;;;");
  });
});
