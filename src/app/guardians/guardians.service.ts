import { Injectable, inject } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { GuardianProfile } from '../shared/models/guardian';
import { map, switchMap } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GuardiansService {
  private api = inject(ApiService);
  search(filters: any){ return this.api.get<GuardianProfile[]>('/guardians', filters).toPromise(); }
  getProfile(id: string){ return this.api.get<GuardianProfile>(`/guardians/${id}`); }

  upsertProfile(profile: GuardianProfile){
    // Check existence via list query to avoid 404 handling
    return this.api.get<GuardianProfile[]>('/guardians', { id: profile.id }).pipe(
      switchMap(list => {
        if ((list || []).length > 0) {
          return this.api.put<GuardianProfile>(`/guardians/${profile.id}`, profile);
        }
        return this.api.post<GuardianProfile>('/guardians', profile);
      })
    );
  }
}
