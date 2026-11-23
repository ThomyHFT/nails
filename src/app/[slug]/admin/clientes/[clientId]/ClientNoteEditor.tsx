"use client";

import { useState } from "react";
import { BrandButton, Caption, TextAreaField } from "@/components/brand";

const MAX = 2000;

export function ClientNoteEditor({ clientId, initialBody }: { clientId: string; initialBody: string }) {
  const [body, setBody] = useState(initialBody);
  const [saved, setSaved] = useState(initialBody);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function save() {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/client-notes/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ tone: "error", text: typeof data.error === "string" ? data.error : "No se pudo guardar." });
        return;
      }
      setSaved(body.trim());
      setMessage({ tone: "ok", text: "Nota guardada." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <TextAreaField
        label="Nota privada"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX}
        rows={5}
        placeholder="Alergias, preferencias, forma y largo de uñas, lo que quieras recordar. Solo la ves tú."
      />
      <div className="flex items-center justify-between gap-3">
        <Caption className={message?.tone === "error" ? "text-destructive" : undefined}>
          {message?.text ?? `${body.length} / ${MAX}`}
        </Caption>
        <BrandButton size="sm" disabled={isSaving || body.trim() === saved} onClick={save}>
          {isSaving ? "Guardando…" : "Guardar nota"}
        </BrandButton>
      </div>
    </div>
  );
}
