"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ slug }: { slug: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: `/${slug}/login` })}
      className="t-label inline-flex items-center gap-2 self-start rounded-sm text-primary outline-none transition-colors hover:text-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      Cerrar sesión
    </button>
  );
}
