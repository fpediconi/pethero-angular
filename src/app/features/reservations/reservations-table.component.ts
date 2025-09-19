import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingHistoryItem, BookingHistoryRole } from '../../bookings/bookings.service';

@Component({
  selector: 'ph-reservations-table',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="table-card">
    <div class="loading" *ngIf="loading">Cargando reservas...</div>
    <table *ngIf="!loading && items.length">
      <thead>
        <tr>
          <th>Código</th>
          <th>Mascota</th>
          <th>{{ counterpartHeader() }}</th>
          <th>Desde</th>
          <th>Hasta</th>
          <th>Noches</th>
          <th>Importe</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let item of items">
          <td class="mono">{{ item.booking.id }}</td>
          <td>{{ item.petName }}</td>
          <td>{{ item.counterpartName }}</td>
          <td>{{ item.booking.start }}</td>
          <td>{{ item.booking.end }}</td>
          <td>{{ item.nights }}</td>
          <td>$ {{ item.totalPrice | number:'1.0-0' }}</td>
          <td>
            <span class="chip" [class.chip-warn]="item.booking.status === 'REQUESTED'">
              {{ statusLabel(item.booking.status) }}
            </span>
          </td>
          <td class="actions">
            <button type="button" class="link" (click)="view.emit(item)">Ver</button>
            <button
              type="button"
              class="link danger"
              *ngIf="canCancel(item)"
              (click)="cancel.emit(item)">
              Cancelar
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="empty" *ngIf="!loading && !items.length">No hay reservas con esos filtros.</div>
  </div>
  `,
  styles: [`
    :host{ display:block; }
    .table-card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:0; box-shadow:0 1px 2px rgba(15,23,42,0.05); }
    table{ width:100%; border-collapse:collapse; }
    th, td{ text-align:left; padding:12px; border-bottom:1px solid #e5e7eb; font-size:.95rem; }
    th{ font-weight:600; color:#1f2937; background:#f9fafb; }
    tbody tr:hover{ background:#f8fafc; }
    .mono{ font-family:'Fira Code', 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size:.85rem; }
    .chip{ display:inline-flex; align-items:center; padding:4px 10px; border-radius:999px; background:#eef2ff; border:1px solid #c7d2fe; color:#1e3a8a; font-size:.8rem; }
    .chip-warn{ background:#fff7ed; border-color:#fdba74; color:#9a3412; }
    .actions{ display:flex; gap:8px; align-items:center; }
    .link{ background:none; border:none; color:#2563eb; cursor:pointer; font-weight:600; padding:0; }
    .link.danger{ color:#dc2626; }
    .loading{ padding:24px; text-align:center; font-weight:600; color:#1f2937; }
    .empty{ padding:24px; text-align:center; color:#6b7280; }

    @media (max-width: 768px){
      table{ display:block; overflow-x:auto; }
      th, td{ white-space:nowrap; }
    }
  `]
})
export class ReservationsTableComponent {
  @Input() items: BookingHistoryItem[] = [];
  @Input() role: BookingHistoryRole = 'OWNER';
  @Input() loading = false;
  @Output() view = new EventEmitter<BookingHistoryItem>();
  @Output() cancel = new EventEmitter<BookingHistoryItem>();

  counterpartHeader(){
    return this.role === 'OWNER' ? 'Guardián' : 'Dueño';
  }

  statusLabel(status: string){
    const map: Record<string,string> = {
      REQUESTED: 'Solicitada',
      ACCEPTED: 'Aceptada',
      REJECTED: 'Rechazada',
      CANCELLED: 'Cancelada',
      CONFIRMED: 'Confirmada',
      IN_PROGRESS: 'En curso',
      COMPLETED: 'Completada'
    };
    return map[status] || status;
  }

  canCancel(item: BookingHistoryItem){
    if (this.role !== 'OWNER') return false;
    const allowed = new Set(['REQUESTED','ACCEPTED','CONFIRMED','IN_PROGRESS']);
    return allowed.has(item.booking.status);
  }
}
