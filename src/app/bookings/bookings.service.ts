import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { Booking, BookingStatus } from '../shared/models/booking';
import { Profile } from '../shared/models/profile.model';
import { Pet } from '../shared/models/pet';
import { GuardianProfile } from '../shared/models/guardian';
import { AuthService } from '../auth/auth.service';
import { daysBetween, overlaps, validRange } from '../shared/utils/date.util';
import { NotificationsService } from '../shared/services/notifications.service';
import { AvailabilityService } from '../shared/services/availability.service';
import { covers, overlap as overlapExclusive } from '../core/utils/date-range.util';
import { firstValueFrom, of } from 'rxjs';
import { PaymentVoucherService } from '../shared/services/payment-voucher.service';


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
  bookings = this._bookings;

  constructor(){
    // Load from mock API so both users share the same data
    this.api.get<Booking[]>('/bookings').subscribe(list => {
      this._bookings.set(list || []);
      this.persist();
    });
    // Light polling to keep sessions in sync across tabs/users
    setInterval(() => {
      this.api.get<Booking[]>('/bookings').subscribe(list => {
        const curr = JSON.stringify(this._bookings());
        const next = JSON.stringify(list || []);
        if (curr !== next) this._bookings.set(list || []);
      });
    }, 4000);
  }

  private persist(){
    try { localStorage.setItem('pethero_bookings', JSON.stringify(this._bookings())); } catch { /* no-op */ }
  }

  reload(){
    return this.api.get<Booking[]>('/bookings').subscribe(list => this._bookings.set(list || []));
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
    // Consider only currently occupying or future-committed bookings
    const blocked: BookingStatus[] = ['ACCEPTED','CONFIRMED','IN_PROGRESS'];
    const hit = this.listForGuardian(guardianId).some(b => blocked.includes(b.status) && overlapExclusive(b.start, b.end, range.start, range.end));
    return of(hit);
  }

  // Create request
  async request(payload: { guardian: GuardianProfile; petId: string; start: string; end: string }): Promise<Booking> {
    const error = validRange(payload.start, payload.end);
    if (error) throw new Error(error);
    const user = this.auth.user();
    if (!user) throw new Error('Debe iniciar sesión para reservar.');

    if (!this.isGuardianAvailable(payload.guardian.id, payload.start, payload.end)) {
      throw new Error('El guardián no está disponible en ese período.');
    }
    if (!this.isOwnerFree(String(user.id), payload.start, payload.end)) {
      throw new Error('Ya tiene una reserva que se superpone en ese período.');
    }

    // Validación adicional: colisiones y cobertura por disponibilidad
    const _collide = await firstValueFrom(this.hasOccupiedCollision(payload.guardian.id, { start: payload.start, end: payload.end }));
    if (_collide) throw new Error('El guardián tiene reservas que se superponen en ese período.');
    const _slots = await firstValueFrom(this.availability.listByGuardian(payload.guardian.id));
    const _covers = (_slots || []).some(s => covers(s.startDate, s.endDate, payload.start, payload.end));
    if (!_covers) throw new Error('El guardián no tiene disponibilidad para esas fechas.');

    const nights = daysBetween(payload.start, payload.end) || 1;
    const total = nights * (payload.guardian.pricePerNight || 0);
    const booking: Booking = {
      id: Math.random().toString(36).slice(2),
      ownerId: String(user.id),
      guardianId: payload.guardian.id,
      petId: String(payload.petId),
      start: payload.start,
      end: payload.end,
      status: 'REQUESTED',
      depositPaid: false,
      totalPrice: total,
      createdAt: new Date().toISOString(),
    };

    return await new Promise<Booking>((resolve, reject) => {
      this.api.post<Booking>('/bookings', booking).subscribe({
        next: (saved) => {
          this._bookings.set([saved, ...this._bookings()]);
          this.persist();
          this.notifications.notify(payload.guardian.id, `Nueva solicitud de reserva del usuario ${user.id} (${payload.start} – ${payload.end})`);
          resolve(saved);
        },
        error: (e) => reject(e)
      });
    });
  }

  // Owner actions
  cancel(bookingId: string){
    const b = this._bookings().find(x => x.id === bookingId);
    this._update(bookingId, { status: 'CANCELLED' });
    // Void voucher if present and not paid
    if (b) this.vouchers.voidByBooking(b.id).subscribe();
    if (b) this.notifications.notify(b.guardianId, `Reserva cancelada por el dueño (${b.start} – ${b.end}).`);
  }
  pay(bookingId: string){
    const b = this._bookings().find(x => x.id === bookingId);
    this._update(bookingId, { depositPaid: true, status: 'CONFIRMED' });
    if (b) this.notifications.notify(b.guardianId, `Reserva pagada. (${b.start} – ${b.end}).`);
  }

  // Guardian actions
  accept(bookingId: string){
    const b = this._bookings().find(x => x.id === bookingId);
    if (!b) return;
    if (!this.isGuardianAvailable(b.guardianId, b.start, b.end)) {
      throw new Error('No puede aceptar dos reservas superpuestas.');
    }
    // Cobertura por disponibilidad (best-effort con caché local)
    try {
      const slots = this.availability.slotsSig() || [];
      const covered = (slots || []).some(s => s.guardianId === b.guardianId && covers(s.startDate, s.endDate, b.start, b.end));
      if (!covered) throw new Error('No hay disponibilidad para cubrir esas fechas.');
    } catch {}
    this._update(bookingId, { status: 'ACCEPTED' });
    // Issue voucher upon acceptance (best-effort)
    this.vouchers.issueForBooking(b).subscribe();
    this.notifications.notify(b.ownerId, `Tu solicitud fue aceptada por el guardián (${b.start} – ${b.end}).`);
  }
  reject(bookingId: string){
    const b = this._bookings().find(x => x.id === bookingId);
    this._update(bookingId, { status: 'REJECTED' });
    if (b) this.notifications.notify(b.ownerId, `Tu solicitud fue rechazada por el guardián.`);
  }
  finalize(bookingId: string){
    const b = this._bookings().find(x => x.id === bookingId);
    this._update(bookingId, { status: 'COMPLETED' });
    if (b) this.notifications.notify(b.ownerId, `Reserva finalizada (${b.start} – ${b.end}).`);
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


  private _update(id: string, patch: Partial<Booking>){
    const curr = this._bookings().find(x => x.id === id);
    if (!curr) return;
    const next = { ...curr, ...patch } as Booking;
    this.api.put<Booking>(`/bookings/${id}`, next).subscribe({
      next: (saved) => {
        this._bookings.set(this._bookings().map(b => b.id === id ? saved : b));
        this.persist();
      },
      error: () => {
        this._bookings.set(this._bookings().map(b => b.id === id ? next : b));
        this.persist();
      }
    });
  }
}
