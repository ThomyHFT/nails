import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { UNUSABLE_PASSWORD_HASH } from "@/server/domain/user/client-contact";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { AccountSettings } from "@/app/[slug]/_account/AccountSettings";
import { AdminPageHeader } from "@/components/brand";

/** Cuenta de la integrante (SPEC 22): nombre, teléfono, contraseña y correo. */
export default async function StaffCuentaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) notFound();
  const user = await new DrizzleUserRepository().findById(session.user.id);
  if (!user) notFound();

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <AdminPageHeader title="Mi cuenta" description="Entras con un código por correo; si prefieres, crea una contraseña." />
      <AccountSettings
        slug={slug}
        email={user.email}
        name={user.name}
        phone={user.phone ?? ""}
        hasPassword={user.passwordHash !== UNUSABLE_PASSWORD_HASH}
      />
    </div>
  );
}
