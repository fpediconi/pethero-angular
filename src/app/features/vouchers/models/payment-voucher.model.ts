export type PaymentVoucherStatus = 'ISSUED' | 'PAID' | 'EXPIRED' | 'VOID';

export interface PaymentVoucher {
  id: string;
  bookingId: string;
  amount: number;
  dueDate: string; // ISO date
  status: PaymentVoucherStatus;
  createdAt?: string;
}

