export type BookingStatus = 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED';
export interface Booking {
  id: string;
  ownerId: string;
  guardianId: string;
  petId: string;
  start: string;
  end: string;
  status: BookingStatus;
  depositPaid: boolean;
  createdAt: string;
}