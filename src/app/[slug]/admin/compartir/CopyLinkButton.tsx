"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { BrandButton } from "@/components/brand";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <BrandButton size="sm" variant="outline" onClick={copy} icon={<Copy className="size-4" />} iconPosition="start">
      {copied ? "Copiado" : "Copiar"}
    </BrandButton>
  );
}
