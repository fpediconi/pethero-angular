import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvailabilityService } from '../../../shared/services/availability.service';
import { AuthService } from '../../../auth/auth.service';
import { AvailabilityCalendar3Component } from './availability-calendar3.component';
import { AvailabilityPeriodFormComponent } from './availability-period-form.component';

@Component({
  selector: 'ph-availability-page',
  standalone: true,
  imports: [CommonModule, AvailabilityCalendar3Component, AvailabilityPeriodFormComponent],
  template: `
  <section class="card">
    <header class="hdr">
      <div>
        <h2>Mi disponibilidad</h2>
        <p class="hint">Visualizá tu disponibilidad y reservas por día. Usá “Agregar período” para publicar disponibilidad.</p>
      </div>
      <div class="actions">
        <button class="btn" (click)="openForm()">Agregar período</button>
        <button class="btn primary" (click)="reload()">Actualizar</button>
      </div>
    </header>

    <div *ngIf="loading()" class="loading">Cargando...</div>
    <ph-availability-calendar3 *ngIf="!loading() && guardianId()" [guardianId]="guardianId()!"></ph-availability-calendar3>
  </section>

  <section class="modal" *ngIf="showForm()">
    <div class="modal-inner">
      <h3>Agregar período de disponibilidad</h3>
      <ph-availability-period-form [guardianId]="guardianId()!" (saved)="onSaved()" (cancel)="closeForm()"></ph-availability-period-form>
    </div>
  </section>
  `,
  styles: [`
    :host{ display:block; }
    .card{ background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:16px; box-shadow:0 8px 24px rgba(2,8,23,.06) }
    .hdr{ display:flex; align-items:center; justify-content:space-between; padding-bottom:8px; border-bottom:1px dashed #e5e7eb }
    h2{ margin:0; font-size:1.25rem }
    .hint{ margin:4px 0 0; color:#6b7280 }
    .btn{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; border:1px solid #c7d2fe; background:#eef2ff; color:#1f2937; text-decoration:none; cursor:pointer }
    .btn.primary{ background:linear-gradient(135deg,#22d3ee,#60a5fa,#a78bfa); color:white; border:0 }
    .btn.small{ padding:6px 10px; font-size:.9rem }
    .btn.danger{ color:#b91c1c; border-color:#fecaca; background:#fee2e2 }
    .empty{ padding:12px; color:#6b7280 }
    .loading{ padding:12px; color:#374151 }
    .modal{ position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center }
    .modal-inner{ background:#fff; border-radius:12px; padding:16px; width:min(640px, 92vw); box-shadow:0 16px 48px rgba(2,8,23,.28) }
  `]
})
export class AvailabilityPageComponent {
  private availability = inject(AvailabilityService);
  private auth = inject(AuthService);

  loading = signal(true);
  guardianId = signal<string | null>(null);
  showForm = signal(false);

  ngOnInit(){
    const user = this.auth.user();
    if (!user?.id) { this.loading.set(false); return; }
    this.guardianId.set(String(user.id));
    this.loading.set(false);
  }
  reload(){ /* calendar listens to month changes and fetches itself */ }
  openForm(){ this.showForm.set(true); }
  closeForm(){ this.showForm.set(false); }
  onSaved(){ this.showForm.set(false); /* Calendar will refresh on month nav; manual reload: */ }
}
