import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingsService } from '@features/bookings/services';
import { Booking } from '@features/bookings/models';
import { AuthService } from '@core/auth';
import { RouterLink } from '@angular/router';
import { BookingSummary } from '@features/bookings/models';
import { BookingsHistoryPanelComponent } from '@features/bookings/components';


@Component({
  selector: 'ph-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, BookingsHistoryPanelComponent],
  template: `
  <ng-container *ngIf="user() as u">
    <div *ngIf="u.role === 'owner'" class="wrap">
      <h2 class="title">Mis Reservas</h2>
      <section>
        <h3 class="section">Activas</h3>
        <div class="grid" *ngIf="ownerActive().length; else noActiveOwner">
          <article class="booking" *ngFor="let b of ownerActive()">
            <div class="row header">
              <span class="chip status">{{ statusLabel(b) }}</span>
              <span class="chip pay" [class.ok]="b.depositPaid">{{ b.depositPaid ? 'PAGADO' : 'SIN PAGAR' }}</span>
            </div>
            <div class="row">
              <div><span class="lbl">Periodo:</span> {{ b.start | date:'shortDate' }} - {{ b.end | date:'shortDate' }}</div>
              <div><span class="lbl">Total:</span> &#36;{{ b.totalPrice || '-' }}</div>
            </div>
            <div class="actions">
              <button class="danger" (click)="cancel(b)">Cancelar</button>
              <button class="primary" *ngIf="!b.depositPaid" (click)="pay(b)">Pagar</button>
              <a class="btnlink" [routerLink]="['/guardians','profile', b.guardianId]">Ver perfil del guardián</a>
            </div>
          </article>
        </div>
        <ng-template #noActiveOwner><div class="empty card">No tienes reservas activas.</div></ng-template>
      </section>
      <section>
        <h3 class="section">Finalizadas / Canceladas</h3>
        <div class="grid" *ngIf="ownerCompleted().length; else noDoneOwner">
          <article class="booking muted" *ngFor="let b of ownerCompleted()">
            <div class="row header">
              <span class="chip status">{{ statusLabel(b) }}</span>
            </div>
            <div class="row">
              <div><span class="lbl">Periodo:</span> {{ b.start | date:'shortDate' }} - {{ b.end | date:'shortDate' }}</div>
              <div><span class="lbl">Total:</span> &#36;{{ b.totalPrice || '-' }}</div>
            </div>
          </article>
        </div>
        <ng-template #noDoneOwner><div class="empty card">Aún no hay reservas finalizadas.</div></ng-template>
      </section>
    </div>

    <div *ngIf="u.role === 'guardian'" class="wrap">
      <h2 class="title">Reservas (Guardián)</h2>
      <section>
        <h3 class="section">Solicitudes Pendientes</h3>
        <div class="grid" *ngIf="guardianPending().length; else noPending">
          <article class="booking" *ngFor="let b of guardianPending()">
            <div class="row header">
              <span class="chip status warn">PENDIENTE</span>
            </div>
            <div class="row">
              <div><span class="lbl">Periodo:</span> {{ b.start | date:'shortDate' }} - {{ b.end | date:'shortDate' }}</div>
            </div>
            <div class="actions">
              <button class="primary" (click)="accept(b)">Aceptar</button>
              <button class="danger" (click)="reject(b)">Rechazar</button>
            </div>
          </article>
        </div>
        <ng-template #noPending><div class="empty card">No hay solicitudes pendientes.</div></ng-template>
      </section>
      <section>
        <h3 class="section">Activas</h3>
        <div class="grid" *ngIf="guardianActive().length; else noActiveG">
          <article class="booking" *ngFor="let b of guardianActive()">
            <div class="row header">
              <span class="chip status">{{ statusLabel(b) }}</span>
              <span class="chip pay" [class.ok]="b.depositPaid">{{ b.depositPaid ? 'PAGADO' : 'SIN PAGAR' }}</span>
            </div>
            <div class="row">
              <div><span class="lbl">Periodo:</span> {{ b.start | date:'shortDate' }} - {{ b.end | date:'shortDate' }}</div>
            </div>
            <div class="actions">
              <button class="primary" (click)="finalize(b)">Finalizar</button>
              <button class="danger" (click)="cancel(b)">Cancelar</button>
              <a class="btnlink" [routerLink]="['/owners','profile', b.ownerId]">Ver perfil del dueño</a>
            </div>
          </article>
        </div>
        <ng-template #noActiveG><div class="empty card">No hay reservas activas.</div></ng-template>
      </section>
      <div style="margin-top:24px">
        <ph-bookings-history-panel
          [roleView]="u.role === 'owner' ? 'OWNER' : 'GUARDIAN'">
        </ph-bookings-history-panel>
      </div>
    </div>
  </ng-container>
  `,
  styles: [`
    .wrap{ display:grid; gap:16px }
    .title{ margin:0 }
    .section{ color:#374151; margin: 4px 0 }
    .grid{ display:grid; gap:12px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
    .booking{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; box-shadow:0 1px 2px rgba(0,0,0,.04) }
    .booking.muted{ opacity: .9; }
    .row{ display:flex; justify-content:space-between; align-items:center; margin: 6px 0 }
    .row.header{ margin-top:0 }
    .lbl{ color:#6b7280 }
    .chip{ display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; font-size:.8rem; border:1px solid #e5e7eb; color:#374151 }
    .chip.status{ background:#eef2ff; border-color:#c7d2fe; color:#3730a3 }
    .chip.status.warn{ background:#fff7ed; border-color:#fed7aa; color:#9a3412 }
    .chip.pay{ background:#f1f5f9; border-color:#e2e8f0; color:#0f172a }
    .chip.pay.ok{ background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }
    .actions{ display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap }
    button{ padding:6px 10px; border-radius:8px; border:1px solid #d1d5db; background:#fff; cursor:pointer }
    .primary{ background:#2563eb; color:white; border-color:#1d4ed8 }
    .danger{ background:#ef4444; color:white; border-color:#dc2626 }
    .btnlink{ display:inline-flex; align-items:center; padding:6px 10px; border-radius:8px; border:1px solid #d1d5db; text-decoration:none; color:#111827; background:#fff }
    .empty{ text-align:center; color:#6b7280 }
  `]
})
export class BookingsPage {
  private service = inject(BookingsService);
  private auth = inject(AuthService);
  user = this.auth.user;

  ownerActive = signal<Booking[]>([]);
  ownerCompleted = signal<Booking[]>([]);
  guardianPending = signal<Booking[]>([]);
  guardianActive = signal<Booking[]>([]);
  guardianCompleted = signal<Booking[]>([]);

  ngOnInit(){
    this.service.reload();
    this.refresh();
    // Keep in sync with changes to the bookings store
    effect(() => { void this.service.bookings(); this.refresh(); });
  }

  private refresh(){
    const u = this.user();
    if (!u) return;
    if (u.role === 'owner'){
      this.ownerActive.set(this.service.listActiveForOwner(String(u.id)));
      this.ownerCompleted.set(this.service.listCompletedForOwner(String(u.id)));
    }
    if (u.role === 'guardian'){
      this.guardianPending.set(this.service.listPendingRequests(String(u.id)));
      this.guardianActive.set(this.service.listActiveForGuardian(String(u.id)));
      this.guardianCompleted.set(this.service.listCompletedForGuardian(String(u.id)));
    }
  }

  statusLabel(b: Booking){
    const map: Record<string,string> = {
      REQUESTED: 'PENDIENTE',
      ACCEPTED: 'ACEPTADA',
      REJECTED: 'RECHAZADA',
      CANCELLED: 'CANCELADA',
      CONFIRMED: 'CONFIRMADA',
      IN_PROGRESS: 'EN CURSO',
      COMPLETED: 'FINALIZADA',
    };
    return map[b.status] || b.status;
  }

  // Acciones
  cancel(b: Booking){ if (confirm('¿Cancelar la reserva?')) { this.service.cancel(b.id); this.refresh(); } }
  finalize(b: Booking){ if (confirm('¿Finalizar la reserva?')) { this.service.finalize(b.id); this.refresh(); } }
  accept(b: Booking){ try { this.service.accept(b.id); } catch(e:any){ alert(e.message || 'No se pudo aceptar'); } finally { this.refresh(); } }
  reject(b: Booking){ this.service.reject(b.id); this.refresh(); }
  pay(b: Booking){
    const warnPending = b.status === 'REQUESTED' ? '\nIMPORTANTE: Si luego cancelas, no se reintegra el pago.' : '';
    const ok = confirm(`Simular pago por $${b.totalPrice || ''}. ¿Confirmar?${warnPending}`);
    if (ok) { this.service.pay(b.id); this.refresh(); }
  }
}



