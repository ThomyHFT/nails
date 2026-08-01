export interface BlobStorage {
  delete(url: string): Promise<void>;
}
