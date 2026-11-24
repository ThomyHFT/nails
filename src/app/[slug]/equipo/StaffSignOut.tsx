"use client";

import { signOut } from "next-auth/react";

export function StaffSignOut({ slug }: { slug: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: `/${slug}/login` })}
      className="text-muted-foreground underline-offset-4 hover:underline"
    >
      Salir
    </button>
  );
}
