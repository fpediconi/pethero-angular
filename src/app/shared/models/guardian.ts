import { PetSize, PetType } from './pet';
export interface GuardianProfile {
  id: string;
  bio?: string;
  pricePerNight: number;
  acceptedTypes: PetType[];
  acceptedSizes: PetSize[];
  photos?: string[];
  ratingAvg?: number;
  ratingCount?: number;
  city?: string;
}