export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  professionalId: string;
  bookingId: string;
  clientUserId: string;
  rating: number;
  body: string;
  photoUrl: string | null;
  status: ReviewStatus;
  createdAt: Date;
  moderatedAt: Date | null;
  authorInstagram: string | null;
}
