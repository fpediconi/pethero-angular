import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../shared/services/api.service';
import { Pet } from '../../shared/models/pet';

@Injectable({ providedIn: 'root' })
export class PetsService {
  private api = inject(ApiService);
  list(ownerId: string){ return this.api.get<Pet[]>('/pets', { ownerId }); }
  create(pet: Partial<Pet>){ return this.api.post<Pet>('/pets', pet); }
}