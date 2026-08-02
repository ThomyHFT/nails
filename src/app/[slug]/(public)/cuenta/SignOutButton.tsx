"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ slug }: { slug: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: `/${slug}/login` })}
      className="inline-flex items-center gap-2 self-start rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      Cerrar sesión
    </button>
  );
}
