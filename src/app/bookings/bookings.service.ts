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

  // In-memory store (simulación de persistencia)
  private _bookings = signal<Booking[]>([]);
  bookings = this._bookings;

  constructor(){
    // Inicializa con datos de localStorage si existen
    try {
      const raw = localStorage.getItem('pethero_bookings');
      if (raw) this._bookings.set(JSON.parse(raw));
    } catch { /* no-op */ }
  }

  private persist(){
    try { localStorage.setItem('pethero_bookings', JSON.stringify(this._bookings())); } catch { /* no-op */ }
  }

  // Listas por rol
  listForOwner(ownerId: string){
    return this._bookings().filter(b => b.ownerId === ownerId);
  }
  listForGuardian(guardianId: string){
    return this._bookings().filter(b => b.guardianId === guardianId);
  }

  listActiveForOwner(ownerId: string){
    const active: BookingStatus[] = ['REQUESTED','ACCEPTED','CONFIRMED','IN_PROGRESS'];
    return this.listForOwner(ownerId).filter(b => active.includes(b.status));
  }
  listCompletedForOwner(ownerId: string){
    const done: BookingStatus[] = ['CANCELLED','REJECTED','COMPLETED'];
    return this.listForOwner(ownerId).filter(b => done.includes(b.status));
  }
  listActiveForGuardian(guardianId: string){
    // Para guardián, las 'activas' no incluyen PENDIENTES (REQUESTED)
    const active: BookingStatus[] = ['ACCEPTED','CONFIRMED','IN_PROGRESS'];
    return this.listForGuardian(guardianId).filter(b => active.includes(b.status));
  }
  listCompletedForGuardian(guardianId: string){
    const done: BookingStatus[] = ['CANCELLED','REJECTED','COMPLETED'];
    return this.listForGuardian(guardianId).filter(b => done.includes(b.status));
  }
  listPendingRequests(guardianId: string){
    return this.listForGuardian(guardianId).filter(b => b.status === 'REQUESTED');
  }

  // Disponibilidad del guardián: no debe superponer con reservas aceptadas/confirmadas/en curso
  isGuardianAvailable(guardianId: string, start: string, end: string){
    const blocked: BookingStatus[] = ['ACCEPTED','CONFIRMED','IN_PROGRESS'];
    return !this.listForGuardian(guardianId).some(b => blocked.includes(b.status) && overlaps(b.start, b.end, start, end));
  }

  // Disponibilidad del dueño (no superposición para su mascota)
  isOwnerFree(ownerId: string, start: string, end: string){
    const blocked: BookingStatus[] = ['ACCEPTED','CONFIRMED','IN_PROGRESS'];
    return !this.listForOwner(ownerId).some(b => blocked.includes(b.status) && overlaps(b.start, b.end, start, end));
  }

  // Crear solicitud (REQUESTED). Calcula precio total: noches * pricePerNight del guardián
  async request(payload: { guardian: GuardianProfile; petId: string; start: string; end: string }): Promise<Booking> {
    const error = validRange(payload.start, payload.end);
    if (error) throw new Error(error);
    const user = this.auth.user();
    if (!user) throw new Error('Debe iniciar sesión para reservar.');

    // Validaciones
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

    this._bookings.set([booking, ...this._bookings()]);
    this.persist();
    // Notificar a guardián (nueva solicitud)
    this.notifications.notify(payload.guardian.id, `Nueva solicitud de reserva del usuario ${user.id} (${payload.start} → ${payload.end})`);
    return booking;
  }

  // Acciones de dueño
  cancel(bookingId: string){
    const b = this._bookings().find(x => x.id === bookingId);
    this._update(bookingId, { status: 'CANCELLED' });
    if (b) this.notifications.notify(b.guardianId, `Reserva cancelada por el dueño (${b.start} → ${b.end}).`);
  }
  pay(bookingId: string){
    // Simular pago y marcar como confirmado
    const b = this._bookings().find(x => x.id === bookingId);
    this._update(bookingId, { depositPaid: true, status: 'CONFIRMED' });
    if (b) this.notifications.notify(b.guardianId, `Reserva pagada. (${b.start} → ${b.end}).`);
  }

  // Acciones de guardián
  accept(bookingId: string){
    const b = this._bookings().find(x => x.id === bookingId);
    if (!b) return;
    if (!this.isGuardianAvailable(b.guardianId, b.start, b.end)) {
      throw new Error('No puede aceptar dos reservas superpuestas.');
    }
    this._update(bookingId, { status: 'ACCEPTED' });
    this.notifications.notify(b.ownerId, `Tu solicitud fue aceptada por el guardián (${b.start} → ${b.end}).`);
  }
  reject(bookingId: string){
    const b = this._bookings().find(x => x.id === bookingId);
    this._update(bookingId, { status: 'REJECTED' });
    if (b) this.notifications.notify(b.ownerId, `Tu solicitud fue rechazada por el guardián.`);
  }
  finalize(bookingId: string){
    const b = this._bookings().find(x => x.id === bookingId);
    this._update(bookingId, { status: 'COMPLETED' });
    if (b) this.notifications.notify(b.ownerId, `Reserva finalizada (${b.start} → ${b.end}).`);
  }

  private _update(id: string, patch: Partial<Booking>){
    this._bookings.set(this._bookings().map(b => b.id === id ? { ...b, ...patch } : b));
    this.persist();
  }
}
