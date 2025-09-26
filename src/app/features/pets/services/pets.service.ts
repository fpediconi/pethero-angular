import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http';
import { Pet } from '@features/pets/models';
/*
############################################
Name: PetsService
Objetive: Provide pets domain operations.
Extra info: Wraps API access, caching, and shared business rules.
############################################
*/


@Injectable({ providedIn: 'root' })
export class PetsService {
  private api = inject(ApiService);
  list(){ return this.api.get<Pet[]>('/pets'); }
  create(pet: Partial<Pet>){ return this.api.post<Pet>('/pets', pet); }
  delete(id: string | number){ return this.api.delete<void>(`/pets/${id}`); }
}

