import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http';
import { Payment } from '@shared/models';
/*
############################################
Name: PaymentsService
Objetive: Provide payments domain operations.
Extra info: Wraps API access, caching, and shared business rules.
############################################
*/


@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private api = inject(ApiService);
  create(payment: Partial<Payment>){ return this.api.post<Payment>('/payments', payment); }
}
