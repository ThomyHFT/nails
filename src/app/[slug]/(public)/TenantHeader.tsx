import Link from "next/link";
import { SafeImage } from "@/app/[slug]/(public)/SafeImage";

export function TenantHeader({
  slug,
  businessName,
  logoUrl,
}: {
  slug: string;
  businessName: string;
  logoUrl: string | null;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Link href={`/${slug}`} className="flex items-center gap-2.5">
        {logoUrl ? (
          <SafeImage
            src={logoUrl}
            alt={businessName}
            className="size-8 rounded-full object-cover"
            style={{ border: "1px solid var(--border)" }}
          />
        ) : null}
        <span className="text-base font-semibold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
          {businessName}
        </span>
      </Link>
    </header>
  );
}
