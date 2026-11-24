"use client";

import { useState } from "react";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import { BrandButton } from "@/components/brand";

/** Compartir una opinión (SPEC 21): menú nativo del teléfono, copiar y WhatsApp. */
export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function share() {
    try {
      await navigator.share({ url, text });
    } catch {
      // La clienta cerró el menú: no es un error.
    }
  }

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
    <div className="flex flex-wrap gap-2">
      {canShare && (
        <BrandButton size="sm" onClick={share} icon={<Share2 className="size-4" />} iconPosition="start">
          Compartir
        </BrandButton>
      )}
      <BrandButton size="sm" variant="outline" onClick={copy} icon={<Copy className="size-4" />} iconPosition="start">
        {copied ? "Copiado" : "Copiar enlace"}
      </BrandButton>
      <BrandButton
        size="sm"
        variant="outline"
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        icon={<MessageCircle className="size-4" />}
        iconPosition="start"
      >
        WhatsApp
      </BrandButton>
    </div>
  );
}
