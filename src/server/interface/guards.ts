import { notFound, redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";

export async function requireProfessional(slug: string): Promise<Session> {
  const session = await auth();

  if (!session) {
    redirect(`/${slug}/login`);
  }

  if (session.user.role !== "professional") {
    notFound();
  }

  return session;
}
