export interface NewEmailNotification {
  professionalId: string;
  bookingId: string;
  type: "confirmation" | "cancellation" | "pending";
  status: "sent" | "failed";
  errorMessage: string | null;
}

export interface EmailNotificationRepository {
  create(input: NewEmailNotification): Promise<void>;
}
