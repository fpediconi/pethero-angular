import { PetSize } from '@features/pets/models';

export interface AvailabilitySlot {
  id: string;
  guardianId: string;
  startDate: string; // ISO YYYY-MM-DD (inclusive)
  endDate: string;   // ISO YYYY-MM-DD (exclusive)
  createdAt: string;
  updatedAt?: string;
  start?: string;    // Legacy fields kept for DTO compatibility
  end?: string;
  acceptedSizes?: PetSize[];
}

export const AUTO_MERGE_SLOTS = false;
