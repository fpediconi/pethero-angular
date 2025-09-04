import { PetSize } from './pet';
export interface AvailabilitySlot {
  id: string;
  guardianId: string;
  start: string;
  end: string;
  acceptedSizes: PetSize[];
}