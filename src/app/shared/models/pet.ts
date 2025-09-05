export type PetType = 'DOG' | 'CAT';
export type PetSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export interface Pet {
  id: string | number;
  ownerId: string;
  name: string;
  type: PetType;
  breed?: string;
  size: PetSize;
  photoUrl?: string;
  vaccineCalendarUrl?: string;
  notes?: string;
}
