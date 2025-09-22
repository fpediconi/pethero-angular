import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http';
import { Pet } from '@features/pets/models';

@Injectable({ providedIn: 'root' })
export class PetsService {
  private api = inject(ApiService);
  list(ownerId: string){ return this.api.get<Pet[]>('/pets', { ownerId }); }
  create(pet: Partial<Pet>){ return this.api.post<Pet>('/pets', pet); }
  delete(id: string | number){ return this.api.delete<void>(`/pets/${id}`); }
}

