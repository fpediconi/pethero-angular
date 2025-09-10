import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { Booking, BookingStatus } from '../shared/models/booking';
import { GuardianProfile } from '../shared/models/guardian';
import { AuthService } from '../auth/auth.service';
import { daysBetween, overlaps, validRange } from '../shared/utils/date.util';
import { NotificationsService } from '../shared/services/notifications.service';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private notifications = inject(NotificationsService);

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
    this._update(bookingId, { status: 'ACCEPTED' });
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
