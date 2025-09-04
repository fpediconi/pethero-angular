import { Injectable, inject } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { GuardianProfile } from '../shared/models/guardian';

@Injectable({ providedIn: 'root' })
export class GuardiansService {
  private api = inject(ApiService);
  search(filters: any){ return this.api.get<GuardianProfile[]>('/guardians', filters).toPromise(); }
  getProfile(id: string){ return this.api.get<GuardianProfile>(`/guardians/${id}`); }
}