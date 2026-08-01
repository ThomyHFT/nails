import { del } from "@vercel/blob";
import type { BlobStorage } from "@/server/domain/portfolio/blob-storage.port";

export class VercelBlobStorage implements BlobStorage {
  async delete(url: string): Promise<void> {
    await del(url);
  }
}
