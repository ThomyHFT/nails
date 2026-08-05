import { z } from "zod";

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
    AUTH_URL: z.string().min(1, "AUTH_URL is required"),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM_ADDRESS: z.string().min(1).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    CALENDAR_TOKEN_KEY: z.string().min(1).optional(),
  })
  .refine((data) => !data.GOOGLE_CLIENT_ID || !!data.CALENDAR_TOKEN_KEY, {
    message: "CALENDAR_TOKEN_KEY is required when GOOGLE_CLIENT_ID is set",
    path: ["CALENDAR_TOKEN_KEY"],
  });

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration. Missing or invalid: ${missing}`);
  }

  return parsed.data;
}

export const env = loadEnv();
