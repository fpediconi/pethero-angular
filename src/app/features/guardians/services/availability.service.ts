import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '@core/http';
import { AvailabilitySlot, AUTO_MERGE_SLOTS } from '@features/guardians/models';
import { AvailabilityBlock, AvailabilityException, DailyMap } from '@features/guardians/models';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { compareISO, covers, isValidRange } from '@core/utils';
import { capacityByDay, bookingsByDay, freeByDay, hasConsecutiveFreeDays, summarizeSpansFromDays, daysBetweenLocal } from '@features/guardians/utils';

// API DTO shape kept for compatibility with existing mock data
type ApiAvailabilitySlot = {
  id: string;
  guardianId: string;
  start: string; // maps to startDate
  end: string;   // maps to endDate
  createdAt?: string;
  updatedAt?: string;
  acceptedSizes?: any[];
};

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private api = inject(ApiService);

  private currentGuardianId: string | null = null;
  private _slots = signal<AvailabilitySlot[] | null>(null);
  slotsSig = this._slots;

  private mapFromApi(s: ApiAvailabilitySlot): AvailabilitySlot {
    return {
      id: String(s.id),
      guardianId: String(s.guardianId),
      startDate: s.start,
      endDate: s.end,
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: s.updatedAt,
    };
  }

  private mapToApi(s: AvailabilitySlot): ApiAvailabilitySlot {
    return {
      id: String(s.id),
      guardianId: String(s.guardianId),
      start: s.startDate,
      end: s.endDate,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private setGuardianCache(guardianId: string, slots: AvailabilitySlot[]){
    this.currentGuardianId = guardianId;
    this._slots.set(slots);
  }

  listByGuardian(guardianId: string): Observable<AvailabilitySlot[]> {
    // If cache is for this guardian, return cached observable
    if (this.currentGuardianId === guardianId && this._slots()) {
      return of(this._slots()!);
    }
    return this.api.get<ApiAvailabilitySlot[]>('/availability', { guardianId }).pipe(
      map(list => (list || []).map(x => this.mapFromApi(x))),
      tap(list => this.setGuardianCache(guardianId, list)),
      catchError(() => {
        this.setGuardianCache(guardianId, []);
        return of([] as AvailabilitySlot[]);
      })
    );
  }

  create(slotInput: Omit<AvailabilitySlot, 'id' | 'createdAt' | 'updatedAt'>): Observable<AvailabilitySlot> {
    const base: AvailabilitySlot = {
      ...slotInput,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const curr = this._slots() || [];
    // Validate overlap unless auto-merge is enabled
    const check = this.validateNoOverlap({ startDate: base.startDate, endDate: base.endDate }, curr);
    if (!check.ok && !AUTO_MERGE_SLOTS) {
      throw new Error(`El bloque solapa con otro existente del ${check.conflicts?.[0]?.startDate} al ${check.conflicts?.[0]?.endDate}`);
    }
    let toSave = base;
    if (AUTO_MERGE_SLOTS) {
      const merged = this.mergeWith(curr, base);
      // If it merged into multiple operations, replace all for guardian and resolve with created base
      return this.replaceForGuardian(base.guardianId, merged).pipe(map(() => base));
    }
    // Optimistic update
    this._slots.set([toSave, ...curr].sort((a,b) => compareISO(a.startDate, b.startDate)));
    const apiDto = this.mapToApi(toSave);
    return this.api.post<ApiAvailabilitySlot>('/availability', apiDto).pipe(
      map(saved => this.mapFromApi(saved)),
      tap(saved => {
        const arr = (this._slots() || []).map(s => s.id === toSave.id ? saved : s);
        this._slots.set(arr);
      }),
      catchError(err => {
        // rollback
        this._slots.set(curr);
        throw err;
      })
    );
  }

  update(id: string, patch: Partial<AvailabilitySlot>): Observable<AvailabilitySlot> {
    const curr = this._slots() || [];
    const idx = curr.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Slot no encontrado');
    const next = { ...curr[idx], ...patch, updatedAt: new Date().toISOString() } as AvailabilitySlot;
    // Validate overlap (excluding self)
    const check = this.validateNoOverlap({ startDate: next.startDate, endDate: next.endDate }, curr.filter(s => s.id !== id));
    if (!check.ok && !AUTO_MERGE_SLOTS) {
      throw new Error(`El bloque solapa con otro existente del ${check.conflicts?.[0]?.startDate} al ${check.conflicts?.[0]?.endDate}`);
    }
    if (AUTO_MERGE_SLOTS) {
      const merged = this.mergeWith(curr.filter(s => s.id !== id), next);
      return this.replaceForGuardian(next.guardianId, merged).pipe(map(() => next));
    }
    const after = curr.slice();
    after[idx] = next;
    after.sort((a,b) => compareISO(a.startDate, b.startDate));
    this._slots.set(after);
    return this.api.put<ApiAvailabilitySlot>(`/availability/${id}`, this.mapToApi(next)).pipe(
      map(saved => this.mapFromApi(saved)),
      tap(saved => {
        const arr = (this._slots() || []).map(s => s.id === saved.id ? saved : s);
        this._slots.set(arr);
      }),
      catchError(err => {
        // simple rollback
        this._slots.set(curr);
        throw err;
      })
    );
  }

  remove(id: string): Observable<void> {
    const curr = this._slots() || [];
    const after = curr.filter(s => s.id !== id);
    this._slots.set(after);
    return this.api.delete<void>(`/availability/${id}`).pipe(
      catchError(err => {
        // rollback
        this._slots.set(curr);
        throw err;
      })
    );
  }

  replaceForGuardian(guardianId: string, slots: Omit<AvailabilitySlot, 'id' | 'createdAt' | 'updatedAt'>[]): Observable<void> {
    // Replace all slots for guardian with provided list
    return this.listByGuardian(guardianId).pipe(
      switchMap(existing => {
        const deletions = (existing || []).map(s => this.api.delete(`/availability/${s.id}`));
        const creations = slots.map(s => {
          const withMeta: AvailabilitySlot = {
            ...s,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          };
          return this.api.post<ApiAvailabilitySlot>('/availability', this.mapToApi(withMeta));
        });
        const ops = [...deletions, ...creations];
        const withMeta = slots.map(s => ({ ...s, id: crypto.randomUUID(), createdAt: new Date().toISOString() } as AvailabilitySlot));
        this.setGuardianCache(guardianId, withMeta.slice().sort((a,b) => compareISO(a.startDate, b.startDate)));
        return ops.length ? forkJoin(ops) : of([]);
      }),
      map(() => void 0),
      catchError(err => { throw err; })
    );
  }

  validateNoOverlap(candidate: { startDate: string; endDate: string }, existing: AvailabilitySlot[]): { ok: boolean; conflicts?: AvailabilitySlot[] } {
    if (!isValidRange(candidate.startDate, candidate.endDate)) return { ok: false, conflicts: [] };
    const conflicts = (existing || []).filter(s => this.overlapSlots(candidate.startDate, candidate.endDate, s.startDate, s.endDate));
    return conflicts.length ? { ok: false, conflicts } : { ok: true };
  }

  private overlapSlots(aStart: string, aEnd: string, bStart: string, bEnd: string){
    // [start,end) overlap
    return compareISO(aStart, bEnd) < 0 && compareISO(bStart, aEnd) < 0;
  }

  private mergeWith(existing: AvailabilitySlot[], candidate: AvailabilitySlot): AvailabilitySlot[] {
    // Merge candidate with any overlapping/contiguous slots [start,end)
    const all = [...existing, candidate].slice().sort((a,b) => compareISO(a.startDate, b.startDate));
    const res: AvailabilitySlot[] = [];
    for (const s of all){
      const last = res[res.length - 1];
      if (!last) { res.push(s); continue; }
      // contiguous or overlapping: last.start <= s.end && s.start <= last.end
      const touches = compareISO(last.endDate, s.startDate) >= 0; // allow merge when adjacent (end == start)
      if (touches){
        last.endDate = compareISO(last.endDate, s.endDate) >= 0 ? last.endDate : s.endDate;
        last.startDate = compareISO(last.startDate, s.startDate) <= 0 ? last.startDate : s.startDate;
      } else {
        res.push(s);
      }
    }
    return res;
  }

  findNextAvailability(guardianId: string, asOfDate: string): Observable<string | null> {
    return this.listByGuardian(guardianId).pipe(
      map(slots => {
        if (!slots || !slots.length) return null;
        // If a slot currently covers asOfDate, next is asOfDate, else the earliest slot starting after asOfDate
        const covering = slots.find(s => covers(s.startDate, s.endDate, asOfDate, asOfDate));
        if (covering) return asOfDate;
        const future = slots
          .filter(s => compareISO(s.endDate, asOfDate) > 0)
          .sort((a,b) => compareISO(a.startDate, b.startDate))[0];
        return future ? future.startDate : null;
      })
    );
  }

  // ===== Daily-based API (non-breaking, reuses /availability with capacity) =====
  listBlocks(guardianId: string){
    return this.api.get<any[]>('/availability', { guardianId }).pipe(
      map(list => (list || []).map(x => ({
        id: String(x.id),
        guardianId: String(x.guardianId),
        start: x.start || x.startDate,
        end: x.end || x.endDate,
        // Regla actual: 1 reserva por día. Ignoramos valores mayores en mock.
        capacity: 1,
        recurrence: x.recurrence,
        meta: x.meta,
      }) as AvailabilityBlock))
    );
  }

  listExceptions(guardianId: string){
    return this.api.get<AvailabilityException[]>('/availability_exceptions', { guardianId }).pipe(
      map(list => (list || []).map(x => ({ ...x, id: String((x as any).id) })))
    );
  }

  listBookingsRaw(guardianId: string){
    return this.api.get<any[]>('/bookings', { guardianId });
  }

  // Create/update blocks from day inputs
  createBlock(input: { guardianId: string; startDay: string; endDayExcl: string; capacity?: number }){
    const body = {
      guardianId: input.guardianId,
      start: `${input.startDay}T00:00:00Z`,
      end: `${input.endDayExcl}T00:00:00Z`,
      capacity: input.capacity ?? 1,
    } as any;
    return this.api.post<any>('/availability', body);
  }
  updateBlock(id: string, patch: { startDay?: string; endDayExcl?: string; capacity?: number }){
    const body: any = {};
    if (patch.startDay) body.start = `${patch.startDay}T00:00:00Z`;
    if (patch.endDayExcl) body.end = `${patch.endDayExcl}T00:00:00Z`;
    if (patch.capacity != null) body.capacity = patch.capacity;
    return this.api.put<any>(`/availability/${id}`, body);
  }
  removeBlock(id: string){ return this.api.delete<void>(`/availability/${id}`); }

  validateNoOverlapBlocks(candidate: { start: string; end: string }, existing: AvailabilityBlock[]): { ok: boolean; conflicts?: AvailabilityBlock[] }{
    const conflicts = (existing || []).filter(b => (candidate.start < b.end) && (b.start < candidate.end));
    return conflicts.length ? { ok:false, conflicts } : { ok:true };
  }

  computeDailyAvailability(params: { guardianId: string; startUTC: string; endUTC: string }): Observable<{ free: DailyMap; cap: DailyMap; occ: DailyMap }>{
    const { guardianId, startUTC, endUTC } = params;
    return forkJoin([
      this.listBlocks(guardianId),
      this.listExceptions(guardianId).pipe(catchError(() => of([]))),
      this.listBookingsRaw(guardianId).pipe(catchError(() => of([]))),
    ]).pipe(
      map(([blocks, exceptions, bookings]) => {
        const cap = capacityByDay(blocks, startUTC, endUTC, exceptions);
        const occ = bookingsByDay(bookings, startUTC, endUTC);
        const free = freeByDay(cap, occ);
        return { free, cap, occ };
      })
    );
  }

  hasCoverageForRange(params: { guardianId: string; startDay: string; endDayExcl: string; petCount: number }): Observable<boolean> {
    const { guardianId, startDay, endDayExcl, petCount } = params;
    const startUTC = new Date(startDay + 'T00:00:00Z').toISOString();
    const endUTC = new Date(endDayExcl + 'T00:00:00Z').toISOString();
    return this.computeDailyAvailability({ guardianId, startUTC, endUTC }).pipe(
      map(({ free }) => hasConsecutiveFreeDays(free, startDay, endDayExcl, petCount))
    );
  }

  nextFreeSpan(guardianId: string, fromDay: string): Observable<{ start: string; end: string } | null> {
    const startUTC = new Date(fromDay + 'T00:00:00Z').toISOString();
    const endUTC = new Date(new Date(startUTC).getTime() + 60*24*60*60*1000).toISOString(); // scan next ~60 days
    return this.computeDailyAvailability({ guardianId, startUTC, endUTC }).pipe(
      map(({ free }) => summarizeSpansFromDays(free, fromDay, 1))
    );
  }
}

