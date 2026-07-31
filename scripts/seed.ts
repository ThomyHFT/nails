import "dotenv/config";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { professionals, users } from "@/server/infrastructure/db/schema/users";
import { services, serviceVariants } from "@/server/infrastructure/db/schema/services";
import { designElements } from "@/server/infrastructure/db/schema/designs";

const SEED_SLUG = "karla";
const SEED_EMAIL = "profesional@misunas.cl";
const SEED_PASSWORD = "cambiame123";

async function main() {
  const [existing] = await db
    .select()
    .from(professionals)
    .where(eq(professionals.slug, SEED_SLUG))
    .limit(1);

  if (existing) {
    console.log(`Ya existe el tenant "${SEED_SLUG}". Seed omitido, nada duplicado.`);
    return;
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const [owner] = await db
    .insert(users)
    .values({
      email: SEED_EMAIL,
      passwordHash,
      name: "Karla",
      role: "professional",
    })
    .returning();

  const [professional] = await db
    .insert(professionals)
    .values({
      slug: SEED_SLUG,
      ownerUserId: owner.id,
      businessName: "Uñas por Karla",
      bio: "Manicurista independiente. Diseños a pedido.",
      timezone: "America/Santiago",
    })
    .returning();

  const [manicure, acrilicas, retiro] = await db
    .insert(services)
    .values([
      { professionalId: professional.id, name: "Manicure clásica", sortOrder: 0 },
      { professionalId: professional.id, name: "Uñas acrílicas", sortOrder: 1 },
      { professionalId: professional.id, name: "Retiro de esmalte", sortOrder: 2 },
    ])
    .returning();

  await db.insert(serviceVariants).values([
    { serviceId: manicure.id, nailLength: "short", priceClp: 12000, durationMinutes: 45 },
    { serviceId: manicure.id, nailLength: "medium", priceClp: 15000, durationMinutes: 60 },
    { serviceId: manicure.id, nailLength: "long", priceClp: 18000, durationMinutes: 75 },
    { serviceId: acrilicas.id, nailLength: "short", priceClp: 20000, durationMinutes: 90 },
    { serviceId: acrilicas.id, nailLength: "medium", priceClp: 25000, durationMinutes: 105 },
    { serviceId: acrilicas.id, nailLength: "long", priceClp: 30000, durationMinutes: 120 },
    { serviceId: retiro.id, nailLength: "single", priceClp: 5000, durationMinutes: 20 },
  ]);

  await db.insert(designElements).values([
    { professionalId: professional.id, category: "finish", code: "matte", label: "Mate", sortOrder: 0 },
    { professionalId: professional.id, category: "finish", code: "glossy", label: "Brillante", sortOrder: 1 },
    {
      professionalId: professional.id,
      category: "finish",
      code: "glitter",
      label: "Glitter",
      priceDeltaClp: 2000,
      sortOrder: 2,
    },
    {
      professionalId: professional.id,
      category: "decoration",
      code: "french",
      label: "Francesa",
      priceDeltaClp: 3000,
      extraMinutes: 10,
      sortOrder: 0,
    },
    {
      professionalId: professional.id,
      category: "decoration",
      code: "ombre",
      label: "Degradé",
      priceDeltaClp: 5000,
      extraMinutes: 15,
      sortOrder: 1,
    },
    {
      professionalId: professional.id,
      category: "decoration",
      code: "rhinestones",
      label: "Pedrería",
      priceDeltaClp: 3000,
      extraMinutes: 10,
      sortOrder: 2,
    },
  ]);

  console.log(`Seed completo. Tenant "${SEED_SLUG}" creado.`);
  console.log(`Login profesional: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
