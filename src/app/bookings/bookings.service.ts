import { Injectable, inject } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { Booking } from '../shared/models/booking';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private api = inject(ApiService);
  list(userId: string){ return this.api.get<Booking[]>('/bookings', { userId }); }
  request(payload: any){ return this.api.post<Booking>('/bookings', payload); }
}