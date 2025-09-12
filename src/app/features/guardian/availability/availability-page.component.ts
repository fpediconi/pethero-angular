import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvailabilityService } from '../../../shared/services/availability.service';
import { AvailabilitySlot } from '../../../core/models/availability.model';
import { AuthService } from '../../../auth/auth.service';
import { AvailabilityFormComponent } from './availability-form.component';
import { diffDays } from '../../../core/utils/date-range.util';

@Component({
  selector: 'ph-availability-page',
  standalone: true,
  imports: [CommonModule, AvailabilityFormComponent],
  template: `
  <section class="card">
    <header class="hdr">
      <div>
        <h2>Mi disponibilidad</h2>
        <p class="hint">Definí las fechas en las que podés hospedar</p>
      </div>
      <button class="btn primary" (click)="openCreate()">Agregar disponibilidad</button>
    </header>

    <div *ngIf="loading()" class="loading">Cargando...</div>
    <div *ngIf="!loading() && (!slots()?.length)" class="empty">No hay disponibilidad cargada.</div>

    <table *ngIf="!loading() && slots()?.length" class="table">
      <thead><tr><th>Desde</th><th>Hasta</th><th>Duración</th><th>Acciones</th></tr></thead>
      <tbody>
        <tr *ngFor="let s of slots()">
          <td>{{ s.startDate }}</td>
          <td>{{ s.endDate }}</td>
          <td>{{ nights(s) }} noches</td>
          <td class="actions">
            <button class="btn small" (click)="openEdit(s)">Editar</button>
            <button class="btn small danger" (click)="remove(s)">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="modal" *ngIf="modalOpen()">
    <div class="modal-inner">
      <h3>{{ editing() ? 'Editar disponibilidad' : 'Nueva disponibilidad' }}</h3>
      <ph-availability-form
        [initialValue]="editing() || null"
        [existing]="slots() || []"
        [excludeId]="editing()?.id || null"
        (save)="save($event)"
        (cancel)="close()"></ph-availability-form>
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
    .table{ width:100%; border-collapse: collapse; margin-top:12px; background:#fff }
    thead th{ background:#f8fafc; color:#334155; border-bottom:2px solid #e5e7eb }
    th, td{ text-align:left; padding:10px 12px; border-bottom:1px solid #e5e7eb }
    .actions{ display:flex; gap:8px }
    .empty{ padding:12px; color:#6b7280 }
    .loading{ padding:12px; color:#374151 }
    .modal{ position:fixed; inset:0; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center }
    .modal-inner{ background:#fff; border-radius:12px; padding:16px; width:min(560px, 92vw); box-shadow:0 16px 48px rgba(2,8,23,.28) }
  `]
})
export class AvailabilityPageComponent {
  private availability = inject(AvailabilityService);
  private auth = inject(AuthService);

  loading = signal(true);
  modalOpen = signal(false);
  editing = signal<AvailabilitySlot | null>(null);

  slots = computed(() => this.availability.slotsSig() || []);

  ngOnInit(){
    const user = this.auth.user();
    if (!user?.id) { this.loading.set(false); return; }
    this.availability.listByGuardian(String(user.id)).subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false)
    });
  }

  nights(s: AvailabilitySlot){ return diffDays(s.startDate, s.endDate); }

  openCreate(){ this.editing.set(null); this.modalOpen.set(true); }
  openEdit(s: AvailabilitySlot){ this.editing.set(s); this.modalOpen.set(true); }
  close(){ this.modalOpen.set(false); }

  save(payload: { startDate: string; endDate: string }){
    const user = this.auth.user();
    if (!user?.id) return;
    const gid = String(user.id);
    const current = this.editing();
    if (!current){
      this.availability.create({ guardianId: gid, startDate: payload.startDate, endDate: payload.endDate }).subscribe({
        next: () => this.modalOpen.set(false),
        error: (e) => alert(String(e?.message || 'No se pudo crear el bloque.'))
      });
    } else {
      this.availability.update(current.id, { startDate: payload.startDate, endDate: payload.endDate }).subscribe({
        next: () => this.modalOpen.set(false),
        error: (e) => alert(String(e?.message || 'No se pudo actualizar el bloque.'))
      });
    }
  }

  remove(s: AvailabilitySlot){
    if (!confirm(`¿Eliminar disponibilidad del ${s.startDate} al ${s.endDate}?`)) return;
    this.availability.remove(s.id).subscribe({
      next: () => {},
      error: () => alert('No se pudo eliminar el bloque')
    });
  }
}
