import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http';
import { Payment } from '@shared/models';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private api = inject(ApiService);
  create(payment: Partial<Payment>){ return this.api.post<Payment>('/payments', payment); }
}
