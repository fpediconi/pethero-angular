import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AvailabilitySlot } from '../models/availability';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private api = inject(ApiService);

  listByGuardian(guardianId: string){
    return this.api.get<AvailabilitySlot[]>('/availability', { guardianId }).pipe(
      catchError(() => of([] as AvailabilitySlot[]))
    );
  }

  replaceForGuardian(guardianId: string, slots: Omit<AvailabilitySlot,'id'>[]){
    return this.listByGuardian(guardianId).pipe(
      switchMap(existing => {
        const deletions = (existing || []).map(s => this.api.delete(`/availability/${s.id}`));
        const creations = slots.map(s => this.api.post<AvailabilitySlot>('/availability', s));
        const ops = [...deletions, ...creations];
        return ops.length ? forkJoin(ops) : of([]);
      })
    );
  }
}
