export interface Professional {
  id: string;
  slug: string;
  ownerUserId: string;
  businessName: string;
  bio: string | null;
  phone: string | null;
  instagramHandle: string | null;
  timezone: string;
  active: boolean;
  bufferMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}
