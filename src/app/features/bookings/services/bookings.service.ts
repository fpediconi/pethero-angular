import { Injectable, inject, signal, effect } from '@angular/core';
import { ApiService } from '@core/http';
import { Booking, BookingStatus } from '@features/bookings/models';
import { PaymentVoucher } from '@features/vouchers/models';
import { Profile } from '@shared/models';
import { Pet } from '@features/pets/models';
import { GuardianProfile } from '@features/guardians/models';
import { AuthService } from '@core/auth';
import { daysBetween, overlaps, validRange } from '@shared/utils';
import { NotificationsService } from '@core/notifications';
import { AvailabilityService } from '@features/guardians/services';
import { covers, overlap as overlapExclusive } from '@core/utils';
import { firstValueFrom, of, Subscription } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PaymentVoucherService } from '@features/vouchers/services';


export type BookingHistoryRole = 'OWNER' | 'GUARDIAN';

export interface BookingHistoryQuery {
  role: BookingHistoryRole;
  userId: string;
  states?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  q?: string;
}

export interface BookingHistoryItem {
  booking: Booking;
  roleView: BookingHistoryRole;
  counterpartName: string;
  petName: string;
  nights: number;
  totalPrice: number;
}

export interface BookingHistoryResult {
  items: BookingHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
}
/*
############################################
Name: BookingsService
Objetive: Provide bookings domain operations.
Extra info: Wraps API access, caching, and shared business rules.
############################################
*/


@Injectable({ providedIn: 'root' })
export class BookingsService {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private notifications = inject(NotificationsService);
  private availability = inject(AvailabilityService);
  private vouchers = inject(PaymentVoucherService);

  private historyDefaultPageSize = 10;

  private petNameCache = new Map<string, string>();
  private profileNameCache = new Map<string, string>();
  private petNameRequests = new Map<string, Promise<string>>();
  private profileNameRequests = new Map<string, Promise<string>>();

  private _bookings = signal<Booking[]>([]);
  bookings = this._bookings.asReadonly();
  private activeScope: { role: 'owner' | 'guardian'; userId: string } | null = null;
  private reloadSub: Subscription | null = null;

  constructor(){
    effect(() => {
      const user = this.auth.user();
      if (!user || user.id == null) {
        this.teardownReloadSubscription();
        this.activeScope = null;
        this._bookings.set([]);
        return;
      }
      this.reload();
    });
  }

  reload(){
    const user = this.auth.user();
    if (!user || user.id == null) {
      this.teardownReloadSubscription();
      this.activeScope = null;
      this._bookings.set([]);
      return;
    }

    const scope = { role: user.role, userId: String(user.id) } as const;
    this.activeScope = scope;

    const params = scope.role === 'owner'
      ? { ownerId: scope.userId }
      : { guardianId: scope.userId };

    this.teardownReloadSubscription();
    this.reloadSub = this.api.get<Booking[]>('/bookings', params).subscribe({
      next: (list) => {
        if (this.isActiveScope(scope)) {
          this._bookings.set(list || []);
        }
      },
      error: () => {
        if (this.isActiveScope(scope)) {
          this._bookings.set([]);
        }
      },
    });
    return this.reloadSub;
  }

  private teardownReloadSubscription(){
    if (this.reloadSub) {
      this.reloadSub.unsubscribe();
      this.reloadSub = null;
    }
  }

  private isActiveScope(scope: { role: 'owner' | 'guardian'; userId: string }){
    return !!this.activeScope && this.activeScope.role === scope.role && this.activeScope.userId === scope.userId;
  }

  // Owner queries
  listForOwner(ownerId: string){ return this._bookings().filter(b => b.ownerId === ownerId); }
  listForGuardian(guardianId: string){ return this._bookings().filter(b => b.guardianId === guardianId); }

  listActiveForOwner(ownerId: string){
    const active: BookingStatus[] = ['REQUESTED','ACCEPTED','CONFIRMED','IN_PROGRESS'];
    return this.listForOwner(ownerId).filter(b => active.includes(b.status));
  }
  listCompletedForOwner(ownerId: string){
    const done: BookingStatus[] = ['CANCELLED','REJECTED','COMPLETED'];
    return this.listForOwner(ownerId).filter(b => done.includes(b.status));
  }
  listActiveForGuardian(guardianId: string){
    const active: BookingStatus[] = ['ACCEPTED','CONFIRMED','IN_PROGRESS'];
    return this.listForGuardian(guardianId).filter(b => active.includes(b.status));
  }
  listCompletedForGuardian(guardianId: string){
    const done: BookingStatus[] = ['CANCELLED','REJECTED','COMPLETED'];
    return this.listForGuardian(guardianId).filter(b => done.includes(b.status));
  }
  listPendingRequests(guardianId: string){ return this.listForGuardian(guardianId).filter(b => b.status === 'REQUESTED'); }

  // Availability helpers
  isGuardianAvailable(guardianId: string, start: string, end: string){
    const blocked: BookingStatus[] = ['ACCEPTED','CONFIRMED','IN_PROGRESS'];
    return !this.listForGuardian(guardianId).some(b => blocked.includes(b.status) && overlaps(b.start, b.end, start, end));
  }
  isOwnerFree(ownerId: string, start: string, end: string){
    const blocked: BookingStatus[] = ['ACCEPTED','CONFIRMED','IN_PROGRESS'];
    return !this.listForOwner(ownerId).some(b => blocked.includes(b.status) && overlaps(b.start, b.end, start, end));
  }

  // Helper: collision with occupied bookings using [start,end) semantics
  hasOccupiedCollision(guardianId: string, range: { start: string; end: string }){
    const blocked: BookingStatus[] = ['ACCEPTED','CONFIRMED','IN_PROGRESS'];
    return this.api.get<Booking[]>('/bookings', { guardianId }).pipe(
      map((list) => {
        const bookings = list || [];
        return bookings.some((b) => blocked.includes(b.status) && overlapExclusive(b.start, b.end, range.start, range.end));
      }),
      catchError(() => of(false))
    );
  }


  // Create request
  
  /*
  ############################################
  Name: request
  Objetive: Manage the request workflow.
  Extra info: Coordinates asynchronous calls with state updates and error handling.
  ############################################
  */
  async request(payload: { guardian: GuardianProfile; petId: string; start: string; end: string }): Promise<Booking> {
    const error = validRange(payload.start, payload.end);
    if (error) throw new Error(error);
    const user = this.auth.user();
    if (!user) throw new Error('Debe iniciar sesion para reservar.');

    if (!this.isOwnerFree(String(user.id), payload.start, payload.end)) {
      throw new Error('Ya tiene una reserva que se superpone en ese periodo.');
    }

    const collision = await firstValueFrom(this.hasOccupiedCollision(payload.guardian.id, { start: payload.start, end: payload.end }));
    if (collision) throw new Error('El guardian tiene reservas que se superponen en ese periodo.');
    const coverage = await firstValueFrom(this.availability.listByGuardian(payload.guardian.id));
    const hasCoverage = (coverage || []).some((slot) => covers(slot.startDate, slot.endDate, payload.start, payload.end));
    if (!hasCoverage) throw new Error('El guardian no tiene disponibilidad para esas fechas.');

    const nights = daysBetween(payload.start, payload.end) || 1;
    const total = nights * (payload.guardian.pricePerNight || 0);

    const body = {
      ownerId: String(user.id),
      guardianId: payload.guardian.id,
      petId: String(payload.petId),
      start: payload.start,
      end: payload.end,
      status: 'REQUESTED',
      totalPrice: total,
    } as Partial<Booking>;

    const saved = await firstValueFrom(this.api.post<Booking>('/bookings', body));
    this.addBookingEntry(saved);
    this.notifications.notify(payload.guardian.id, `Nueva solicitud de reserva del usuario ${user.id} (${payload.start} - ${payload.end})`);
    return saved;
  }

  // Owner actions
  cancel(bookingId: string){
    const booking = this.findOwnedBooking(bookingId);
    if (!booking) {
      console.warn('[BookingsService] cancel: booking not found', bookingId);
      return;
    }
    this.applyBookingUpdate(booking, { status: 'CANCELLED' }, (saved) => {
      this.vouchers.voidByBooking(saved.id).subscribe();
      this.notifications.notify(saved.guardianId, `Reserva cancelada por el dueno (${saved.start} - ${saved.end}).`);
    });
  }
  async pay(bookingId: string): Promise<PaymentVoucher | null> {
    const booking = this.findOwnedBooking(bookingId);
    if (!booking) {
      console.warn('[BookingsService] pay: booking not found', bookingId);
      return null;
    }
    try {
      let voucher = await firstValueFrom(this.vouchers.getByBookingId(booking.id));
      if (!voucher || voucher.status === 'EXPIRED' || voucher.status === 'VOID') {
        voucher = await firstValueFrom(this.vouchers.issueForBooking(booking));
      }
      if (!voucher) throw new Error('No se pudo obtener el voucher de pago.');
      if (voucher.status !== 'PAID') {
        voucher = await firstValueFrom(this.vouchers.markPaid(voucher.id));
      }
      const payload = { ...booking, depositPaid: true, status: 'CONFIRMED' as BookingStatus };
      const saved = await firstValueFrom(this.api.put<Booking>(`/bookings/${booking.id}`, payload));
      this.replaceBooking(saved);
      this.notifications.notify(saved.guardianId, `Reserva pagada. (${saved.start} - ${saved.end}).`);
      return voucher;
    } catch (error) {
      console.error('[BookingsService] pay failed', error);
      throw error;
    }
  }

  // Guardian actions
  accept(bookingId: string){
    const booking = this.findGuardianBooking(bookingId);
    if (!booking) {
      console.warn('[BookingsService] accept: booking not found', bookingId);
      return;
    }
    if (!this.isGuardianAvailable(booking.guardianId, booking.start, booking.end)) {
      throw new Error('No puede aceptar dos reservas superpuestas.');
    }
    try {
      const slots = this.availability.slotsSig() || [];
      const covered = (slots || []).some((s) => s.guardianId === booking.guardianId && covers(s.startDate, s.endDate, booking.start, booking.end));
      if (!covered) throw new Error('No hay disponibilidad para cubrir esas fechas.');
    } catch (error) {
      console.error('[BookingsService] accept availability check failed', error);
    }
    this.applyBookingUpdate(booking, { status: 'ACCEPTED' }, (saved) => {
      this.vouchers.issueForBooking(saved).subscribe();
      this.notifications.notify(saved.ownerId, `Tu solicitud fue aceptada por el guardian (${saved.start} - ${saved.end}).`);
    });
  }
  reject(bookingId: string){
    const booking = this.findGuardianBooking(bookingId);
    if (!booking) {
      console.warn('[BookingsService] reject: booking not found', bookingId);
      return;
    }
    this.applyBookingUpdate(booking, { status: 'REJECTED' }, (saved) => {
      this.notifications.notify(saved.ownerId, 'Tu solicitud fue rechazada por el guardian.');
    });
  }
  finalize(bookingId: string){
    const booking = this.findGuardianBooking(bookingId);
    if (!booking) {
      console.warn('[BookingsService] finalize: booking not found', bookingId);
      return;
    }
    this.applyBookingUpdate(booking, { status: 'COMPLETED' }, (saved) => {
      this.notifications.notify(saved.ownerId, `Reserva finalizada (${saved.start} - ${saved.end}).`);
    });
  }

  async searchHistory(query: BookingHistoryQuery): Promise<BookingHistoryResult> {
    if (!query.role) throw new Error('role is required');
    if (!query.userId) throw new Error('userId is required');

    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.max(1, query.pageSize ?? this.historyDefaultPageSize);
    const dataset = await this.loadHistoryData(query);
    const total = dataset.length;
    const start = (page - 1) * pageSize;
    const items = dataset.slice(start, start + pageSize);

    return { items, total, page, pageSize };
  }

  
  /*
  ############################################
  Name: exportHistoryCsv
  Objetive: Export history csv.
  Extra info: Coordinates asynchronous calls with state updates and error handling.
  ############################################
  */
  async exportHistoryCsv(query: BookingHistoryQuery): Promise<string> {
    const dataset = await this.loadHistoryData(query);
    const header = ['bookingId','roleView','counterpartName','petName','startDate','endDate','nights','totalPrice','status'];
    const rows = dataset.map(item => [
      item.booking.id,
      item.roleView,
      item.counterpartName,
      item.petName,
      item.booking.start,
      item.booking.end,
      String(item.nights),
      String(item.totalPrice ?? 0),
      item.booking.status
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(cell => this.escapeCsv(cell)).join(','))
      .join('\\r\\n');

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const filename = this.buildCsvFilename(query.role);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.display = 'none';
        if (document.body) {
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          link.click();
        }
        URL.revokeObjectURL(url);
      } catch {
        // ignore download errors
      }
    }

    return csv;
  }

  
  private findOwnedBooking(bookingId: string){
    const booking = this.findBooking(bookingId);
    const currentId = this.currentUserId();
    if (!booking || !currentId) return null;
    return booking.ownerId === currentId ? booking : null;
  }

  private findGuardianBooking(bookingId: string){
    const booking = this.findBooking(bookingId);
    const currentId = this.currentUserId();
    if (!booking || !currentId) return null;
    return booking.guardianId === currentId ? booking : null;
  }

  private findBooking(bookingId: string){
    return this._bookings().find((b) => String(b.id) === String(bookingId));
  }

  private currentUserId(){
    const user = this.auth.user();
    return user?.id != null ? String(user.id) : null;
  }

  private applyBookingUpdate(booking: Booking, patch: Partial<Booking>, after?: (saved: Booking) => void){
    const payload = { ...booking, ...patch } as Booking;
    this.api.put<Booking>(`/bookings/${booking.id}`, payload).subscribe({
      next: (saved) => {
        this.replaceBooking(saved);
        after?.(saved);
      },
      error: (error) => {
        console.error('[BookingsService] update failed', error);
      },
    });
  }

  private replaceBooking(next: Booking){
    this._bookings.set(this._bookings().map((b) => (b.id === next.id ? next : b)));
  }

  private addBookingEntry(booking: Booking){
    const scope = this.activeScope;
    if (!scope) return;
    if (scope.role === 'owner' && booking.ownerId !== scope.userId) return;
    if (scope.role === 'guardian' && booking.guardianId !== scope.userId) return;
    const exists = this._bookings().some((b) => b.id === booking.id);
    if (exists) {
      this.replaceBooking(booking);
    } else {
      this._bookings.set([booking, ...this._bookings()]);
    }
  }

  /*
  ############################################
  Name: loadHistoryData
  Objetive: Load history data.
  Extra info: Coordinates asynchronous calls with state updates and error handling.
  ############################################
  */
  private async loadHistoryData(query: BookingHistoryQuery): Promise<BookingHistoryItem[]> {
    const params: Record<string, string> = { _sort: 'start', _order: 'desc' };
    const userId = String(query.userId);

    if (query.role === 'OWNER') {
      params.ownerId = userId;
    } else {
      params.guardianId = userId;
    }

    if (query.dateFrom) params.start_gte = query.dateFrom;
    if (query.dateTo) params.end_lte = query.dateTo;

    let list: Booking[] = [];
    try {
      const data = await firstValueFrom(this.api.get<Booking[]>('/bookings', params));
      list = Array.isArray(data) ? data.slice() : [];
    } catch {
      list = [];
    }

    const states = (query.states || [])
      .map(s => String(s ?? '').toUpperCase())
      .filter(Boolean);
    if (states.length) {
      const allowed = new Set(states);
      list = list.filter(b => allowed.has(String(b.status ?? '').toUpperCase()));
    }

    list.sort((a, b) => String(b.start ?? '').localeCompare(String(a.start ?? '')));

    const enriched = await Promise.all(list.map(async booking => {
      const petName = await this.getPetName(String(booking.petId));
      const counterpartId = query.role === 'OWNER' ? booking.guardianId : booking.ownerId;
      const counterpartName = await this.getProfileName(String(counterpartId ?? ''));
      const nights = Math.max(1, daysBetween(booking.start, booking.end));
      const totalPrice = typeof booking.totalPrice === 'number'
        ? booking.totalPrice
        : nights * Number((booking as any).pricePerNight || 0);

      return {
        booking,
        roleView: query.role,
        petName,
        counterpartName,
        nights,
        totalPrice,
      } as BookingHistoryItem;
    }));

    if (query.q) {
      const needle = this.normalize(query.q);
      if (needle) {
        return enriched.filter(item => {
          const pet = this.normalize(item.petName);
          const counterpart = this.normalize(item.counterpartName);
          return pet.includes(needle) || counterpart.includes(needle);
        });
      }
    }

    return enriched;
  }

  
  /*
  ############################################
  Name: getPetName
  Objetive: Retrieve pet name.
  Extra info: Coordinates asynchronous calls with state updates and error handling.
  ############################################
  */
  private async getPetName(petId: string): Promise<string> {
    const key = petId || '';
    if (!key) return 'Mascota';
    if (this.petNameCache.has(key)) return this.petNameCache.get(key)!;
    if (this.petNameRequests.has(key)) return this.petNameRequests.get(key)!;

    const request = firstValueFrom(this.api.get<Pet>(`/pets/${key}`))
      .then(pet => {
        const name = pet && (pet as any).name ? String(pet.name) : `Mascota ${key}`;
        this.petNameCache.set(key, name);
        this.petNameRequests.delete(key);
        return name;
      })
      .catch(() => {
        const fallback = `Mascota ${key}`;
        this.petNameCache.set(key, fallback);
        this.petNameRequests.delete(key);
        return fallback;
      });

    this.petNameRequests.set(key, request);
    return request;
  }

  
  /*
  ############################################
  Name: getProfileName
  Objetive: Retrieve profile name.
  Extra info: Coordinates asynchronous calls with state updates and error handling.
  ############################################
  */
  private async getProfileName(userId: string): Promise<string> {
    const key = userId || '';
    if (!key) return 'Usuario';
    if (this.profileNameCache.has(key)) return this.profileNameCache.get(key)!;
    if (this.profileNameRequests.has(key)) return this.profileNameRequests.get(key)!;

    const request = firstValueFrom(this.api.get<Profile[]>('/profiles', { userId: key }))
      .then(list => {
        const name = (list?.[0]?.displayName || '').trim();
        const value = name || `Usuario ${key}`;
        this.profileNameCache.set(key, value);
        this.profileNameRequests.delete(key);
        return value;
      })
      .catch(() => {
        const value = `Usuario ${key}`;
        this.profileNameCache.set(key, value);
        this.profileNameRequests.delete(key);
        return value;
      });

    this.profileNameRequests.set(key, request);
    return request;
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }

  private escapeCsv(value: string | number | boolean | null | undefined): string {
    const raw = value == null ? '' : String(value);
    if (/[",\r\n]/.test(raw)) {
      return '"' + raw.replace(/"/g, '""') + '"';
    }
    return raw;
  }

  private buildCsvFilename(role: BookingHistoryRole): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    return `reservas_${role}_${stamp}.csv`;
  }


}
