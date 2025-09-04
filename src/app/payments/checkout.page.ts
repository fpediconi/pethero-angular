import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentsService } from './payments.service';

@Component({
  selector: 'ph-checkout',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="card">
    <h2>Checkout — Depósito 50%</h2>
    <p>Monto de ejemplo: \${{ amount() }}</p>
    <button (click)="pay()">Pagar</button>
    <p *ngIf="status()">{{ status() }}</p>
  </div>
  `
})
export class CheckoutPage {
  private payments = inject(PaymentsService);
  amount = signal(5000);
  status = signal('');

  pay(){
    this.status.set('Pago simulado aprobado ✔️');
  }
}
