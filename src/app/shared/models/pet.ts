export type PetType = 'DOG' | 'CAT';
export type PetSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  type: PetType;
  breed?: string;
  size: PetSize;
  vaccineCalendarUrl?: string;
  notes?: string;
}