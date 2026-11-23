import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isPlaceholderEmail, UNUSABLE_PASSWORD_HASH } from "@/server/domain/user/client-contact";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { AccountSettings } from "@/app/[slug]/_account/AccountSettings";
import { BrandButton, Container, Display, Section } from "@/components/brand";

export default async function PerfilPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) redirect(`/${slug}/login?next=${encodeURIComponent(`/${slug}/cuenta/perfil`)}`);

  const user = await new DrizzleUserRepository().findById(session.user.id);
  if (!user) redirect(`/${slug}/login`);

  return (
    <Container size="md">
      <Section className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-3">
          <Display as="h1">Mi perfil</Display>
          <BrandButton size="sm" variant="ghost" href={`/${slug}/cuenta`}>
            Mis reservas
          </BrandButton>
        </div>
        <AccountSettings
          slug={slug}
          email={isPlaceholderEmail(user.email) ? null : user.email}
          name={user.name}
          phone={user.phone ?? ""}
          hasPassword={user.passwordHash !== UNUSABLE_PASSWORD_HASH}
        />
      </Section>
    </Container>
  );
}
