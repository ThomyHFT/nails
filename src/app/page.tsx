import { notFound, redirect } from "next/navigation";
import { env } from "@/server/infrastructure/config/env";

export default function Home() {
  if (!env.DEMO_TENANT_SLUG) {
    notFound();
  }

  redirect(`/${env.DEMO_TENANT_SLUG}`);
}
