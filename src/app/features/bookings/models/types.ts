// src/app/features/bookings-history/types.ts
export type HistoryStatus = 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELLED' | 'FINISHED';

export interface BookingSummary {
  id: string;
  code?: string;                 // opcional, si tienen un número de reserva
  startDate: string;             // ISO
  endDate: string;               // ISO
  nights?: number;
  petName?: string;
  ownerName: string;
  guardianName: string;
  total: number;
  status: HistoryStatus;
  createdAt?: string;            // ISO
}

export interface HistoryQuery {
  page: number;
  pageSize: number;
  status?: HistoryStatus | 'ANY';
  from?: string;     // ISO date (inclusive)
  to?: string;       // ISO date (inclusive)
  q?: string;        // texto libre: mascota, código, nombres, etc.
  roleView: 'GUARDIAN' | 'OWNER'; // quién mira la página
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
