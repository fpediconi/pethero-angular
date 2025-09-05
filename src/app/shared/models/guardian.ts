import { PetSize, PetType } from './pet';
export interface GuardianProfile {
  id: string;
  name?: string;
  bio?: string;
  pricePerNight: number;
  acceptedTypes: PetType[];
  acceptedSizes: PetSize[];
  photos?: string[];
  avatarUrl?: string;
  ratingAvg?: number;
  ratingCount?: number;
  city?: string;
}
