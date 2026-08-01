import "dotenv/config";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { professionals, users } from "@/server/infrastructure/db/schema/users";
import { services, serviceVariants } from "@/server/infrastructure/db/schema/services";
import { designElements } from "@/server/infrastructure/db/schema/designs";
import { bookings } from "@/server/infrastructure/db/schema/bookings";
import { reviews } from "@/server/infrastructure/db/schema/content";

const SEED_CLIENT_EMAIL = "clienta@misunas.cl";

const SEED_SLUG = "karla";
const SEED_EMAIL = "profesional@misunas.cl";
const SEED_PASSWORD = "cambiame123";

/**
 * Reservas completadas y sus opiniones. Se resuelve todo desde la base en vez
 * de recibir lo insertado más arriba, para que sirva igual sobre un tenant
 * recién creado que sobre uno que ya existía.
 */
async function seedReviews(professionalId: string) {
  const [anyReview] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.professionalId, professionalId))
    .limit(1);

  if (anyReview) {
    console.log("Opiniones ya sembradas.");
    return;
  }

  // La clienta puede no existir: las bases sembradas antes del SPEC 02 no la
  // tienen. Se crea acá en vez de abortar, que es lo que hace este bloque
  // utilizable como relleno.
  let [client] = await db.select().from(users).where(eq(users.email, SEED_CLIENT_EMAIL)).limit(1);
  if (!client) {
    [client] = await db
      .insert(users)
      .values({
        email: SEED_CLIENT_EMAIL,
        passwordHash: await bcrypt.hash(SEED_PASSWORD, 12),
        name: "Camila Rodríguez",
        role: "client",
      })
      .returning();
    console.log(`Clienta ${SEED_CLIENT_EMAIL} creada.`);
  }

  const [variant] = await db
    .select({ id: serviceVariants.id, priceClp: serviceVariants.priceClp, durationMinutes: serviceVariants.durationMinutes })
    .from(serviceVariants)
    .innerJoin(services, eq(serviceVariants.serviceId, services.id))
    .where(eq(services.professionalId, professionalId))
    .limit(1);

  if (!variant) {
    console.log("El tenant no tiene variantes de servicio. Opiniones omitidas.");
    return;
  }

  const days = ["2026-07-01", "2026-07-08", "2026-07-15"];
  const insertedBookings = await db
    .insert(bookings)
    .values(
      days.map((day) => ({
        professionalId,
        clientUserId: client.id,
        serviceVariantId: variant.id,
        startsAt: new Date(`${day}T14:00:00Z`),
        endsAt: new Date(`${day}T14:45:00Z`),
        status: "completed" as const,
        priceClp: variant.priceClp,
        durationMinutes: variant.durationMinutes,
      })),
    )
    .returning();

  const now = new Date();
  await db.insert(reviews).values([
    {
      professionalId,
      bookingId: insertedBookings[0].id,
      clientUserId: client.id,
      rating: 5,
      body: "Quedé encantada con el resultado, muy prolija y puntual.",
      status: "approved",
      moderatedAt: now,
      authorInstagram: "camila.rdz",
    },
    {
      professionalId,
      bookingId: insertedBookings[1].id,
      clientUserId: client.id,
      rating: 4,
      body: "Buena atención, el diseño duró varias semanas sin descascararse.",
      status: "approved",
      moderatedAt: now,
    },
    {
      professionalId,
      bookingId: insertedBookings[2].id,
      clientUserId: client.id,
      rating: 5,
      body: "Recién reservé de nuevo, esperando que la moderen.",
      status: "pending",
    },
  ]);

  console.log("Opiniones sembradas: 2 aprobadas y 1 pendiente.");
}

async function main() {
  const [existing] = await db
    .select()
    .from(professionals)
    .where(eq(professionals.slug, SEED_SLUG))
    .limit(1);

  if (existing) {
    // Idempotente no es lo mismo que todo-o-nada. El guard cortaba acá, así
    // que cualquier bloque agregado después de la primera siembra —las reviews
    // del SPEC 06, por ejemplo— quedaba inalcanzable sobre una base ya
    // sembrada. Cada bloque nuevo se chequea por su cuenta y rellena lo que
    // falte.
    console.log(`Ya existe el tenant "${SEED_SLUG}". Rellenando lo que falte.`);
    await seedReviews(existing.id);
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

  await db
    .insert(serviceVariants)
    .values([
      { serviceId: manicure.id, nailLength: "short", priceClp: 12000, durationMinutes: 45 },
      { serviceId: manicure.id, nailLength: "medium", priceClp: 15000, durationMinutes: 60 },
      { serviceId: manicure.id, nailLength: "long", priceClp: 18000, durationMinutes: 75 },
      { serviceId: acrilicas.id, nailLength: "short", priceClp: 20000, durationMinutes: 90 },
      { serviceId: acrilicas.id, nailLength: "medium", priceClp: 25000, durationMinutes: 105 },
      { serviceId: acrilicas.id, nailLength: "long", priceClp: 30000, durationMinutes: 120 },
      { serviceId: retiro.id, nailLength: "single", priceClp: 5000, durationMinutes: 20 },
    ])
    .returning();

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

  await db.insert(users).values({
    email: SEED_CLIENT_EMAIL,
    passwordHash,
    name: "Camila Rodríguez",
    role: "client",
  });

  await seedReviews(professional.id);

  console.log(`Seed completo. Tenant "${SEED_SLUG}" creado.`);
  console.log(`Login profesional: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
  console.log(`Login clienta: ${SEED_CLIENT_EMAIL} / ${SEED_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
