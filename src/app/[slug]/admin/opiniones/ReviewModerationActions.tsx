"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandButton } from "@/components/brand";

async function postAction(reviewId: string, action: "approve" | "reject") {
  return fetch(`/api/reviews/${reviewId}/${action}`, { method: "POST" });
}

export function ReviewModerationActions({ reviewId, status }: { reviewId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function run(action: "approve" | "reject") {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await postAction(reviewId, action);
      if (!response.ok) {
        const data = await response.json();
        setError(typeof data.error === "string" ? data.error : "No se pudo actualizar la opinión.");
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status !== "approved" && (
          <BrandButton size="sm" disabled={isSubmitting} onClick={() => run("approve")}>
            Aprobar
          </BrandButton>
        )}
        {status !== "rejected" && (
          <BrandButton size="sm" variant="danger" disabled={isSubmitting} onClick={() => run("reject")}>
            Rechazar
          </BrandButton>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
