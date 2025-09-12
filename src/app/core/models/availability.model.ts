export interface AvailabilitySlot {
  id: string;
  guardianId: string;
  startDate: string; // ISO YYYY-MM-DD (inclusive)
  endDate: string;   // ISO YYYY-MM-DD (exclusive)
  createdAt: string;
  updatedAt?: string;
}

export const AUTO_MERGE_SLOTS = false;

