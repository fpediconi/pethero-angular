import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../shared/services/api.service';
import { PaymentVoucher } from '../shared/models/payment-voucher';
import { Booking } from '../shared/models/booking';
import { GuardiansService } from '../guardians/guardians.service';
import { ProfileService } from '../shared/services/profile.service';

@Component({
  selector: 'ph-voucher',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="voucher" *ngIf="voucher() as v; else loading">
    <header>
      <h2>Cupón de pago (50%)</h2>
      <button class="print" (click)="print()">Imprimir / Descargar</button>
    </header>
    <section class="grid">
      <div class="card">
        <h3>Datos del cupón</h3>
        <p><strong>ID:</strong> {{ v.id }}</p>
        <p><strong>Reserva:</strong> {{ v.bookingId }}</p>
        <p><strong>Monto:</strong> &#36;{{ v.amount }}</p>
        <p><strong>Vence:</strong> {{ v.dueDate | date:'short' }}</p>
        <p><strong>Estado:</strong> {{ v.status }}</p>
      </div>
      <div class="card" *ngIf="booking() as b">
        <h3>Reserva</h3>
        <p><strong>Periodo:</strong> {{ b.start | date:'shortDate' }} - {{ b.end | date:'shortDate' }}</p>
        <p><strong>Total:</strong> &#36;{{ b.totalPrice || '-' }}</p>
        <p><strong>Estado:</strong> {{ b.status }}</p>
      </div>
      <div class="card">
        <h3>Dueño</h3>
        <p>{{ ownerName() || ('Usuario ' + booking()?.ownerId) }}</p>
      </div>
      <div class="card">
        <h3>Guardián</h3>
        <p>{{ guardianName() || ('Guardián ' + booking()?.guardianId) }}</p>
      </div>
    </section>
  </div>
  <ng-template #loading><div class="card">Cargando cupón...</div></ng-template>
  `,
  styles: [`
    .voucher{ display:grid; gap:16px }
    header{ display:flex; justify-content:space-between; align-items:center }
    .grid{ display:grid; gap:12px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .card{ background:white; border:1px solid #e5e7eb; border-radius:12px; padding:12px }
    .print{ background:#2563eb; color:white; border-color:#1d4ed8; padding:6px 10px; border-radius:8px; border:1px solid }
  `]
})
export class VoucherPage {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private guardians = inject(GuardiansService);
  private profiles = inject(ProfileService);

  voucher = signal<PaymentVoucher | null>(null);
  booking = signal<Booking | null>(null);
  ownerName = signal<string>('');
  guardianName = signal<string>('');

  ngOnInit(){
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.get<PaymentVoucher>(`/paymentVouchers/${id}`).subscribe(v => {
      this.voucher.set(v);
      if (v?.bookingId){
        this.api.get<Booking>(`/bookings/${v.bookingId}`).subscribe(b => {
          this.booking.set(b);
          // Fetch names (best-effort)
          if (b?.guardianId){
            this.guardians.getProfile(b.guardianId).subscribe(g => this.guardianName.set(g?.name || ''));
          }
          if (b?.ownerId){
            const uid = Number(b.ownerId);
            if (!Number.isNaN(uid)) {
              this.profiles.getByUserId(uid).subscribe(list => {
                const p = (list || [])[0];
                if (p?.displayName) this.ownerName.set(p.displayName);
              });
            }
          }
        });
      }
    });
  }

  print(){ window.print(); }
}
