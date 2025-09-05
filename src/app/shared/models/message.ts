export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  body: string;
  createdAt: string;
  bookingId?: string;
  status?: 'SENT' | 'RECEIVED' | 'READ';
}
