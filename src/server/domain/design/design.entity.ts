import type { NailDesignPayload } from "@/server/domain/design/nail-design-payload";

export type DesignSource = "client" | "template";

export interface Design {
  id: string;
  professionalId: string;
  clientUserId: string | null;
  source: DesignSource;
  name: string | null;
  payload: NailDesignPayload;
  extraPriceClp: number;
  extraMinutes: number;
  referenceImageUrl: string | null;
  createdAt: Date;
}
