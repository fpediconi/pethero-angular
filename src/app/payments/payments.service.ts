import { Injectable, inject } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { Payment } from '../shared/models/payment';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private api = inject(ApiService);
  create(payment: Partial<Payment>){ return this.api.post<Payment>('/payments', payment); }
}