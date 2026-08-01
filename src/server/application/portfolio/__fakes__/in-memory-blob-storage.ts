import type { BlobStorage } from "@/server/domain/portfolio/blob-storage.port";

export class InMemoryBlobStorage implements BlobStorage {
  readonly deletedUrls: string[] = [];

  async delete(url: string): Promise<void> {
    this.deletedUrls.push(url);
  }
}
