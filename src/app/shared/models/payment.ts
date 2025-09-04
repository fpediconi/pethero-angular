export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  type: 'DEPOSIT' | 'REMAINING';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}