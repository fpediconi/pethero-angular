export interface Review {
  id: string;
  bookingId: string;
  ownerId: string;
  guardianId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}