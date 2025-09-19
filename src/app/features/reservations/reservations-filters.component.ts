import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingStatus } from '../../shared/models/booking';

export interface ReservationsFiltersValue {
  states: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
  q?: string | null;
}

export interface ReservationStatusOption {
  value: BookingStatus;
  label: string;
}

@Component({
  selector: 'ph-reservations-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <section class="filters">
    <form class="filters-form" (ngSubmit)="onSubmit()">
      <div class="group">
        <label class="group-label">Estados</label>
        <div class="chips">
          <label class="chip" *ngFor="let option of statuses">
            <input
              type="checkbox"
              [value]="option.value"
              [checked]="isStateSelected(option.value)"
              (change)="onStatusToggle(option.value, $any($event.target).checked)"
            />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </div>

      <div class="group inline">
        <label>
          <span>Desde</span>
          <input type="date" [(ngModel)]="dateFrom" name="dateFrom" />
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" [(ngModel)]="dateTo" name="dateTo" />
        </label>
        <label class="search">
          <span>Búsqueda</span>
          <input type="text" [(ngModel)]="searchTerm" name="searchTerm" placeholder="Mascota o contraparte" />
        </label>
        <div class="actions">
          <button type="submit" class="btn primary">Buscar</button>
          <button type="button" class="btn ghost" (click)="onClear()">Limpiar</button>
        </div>
      </div>
    </form>
  </section>
  `,
  styles: [`
    :host { display:block; }
    .filters { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; margin-bottom:16px; box-shadow:0 1px 2px rgba(15,23,42,0.05); }
    .filters-form { display:flex; flex-direction:column; gap:12px; }
    .group { display:flex; flex-direction:column; gap:8px; }
    .group.inline { display:flex; flex-wrap:wrap; align-items:end; gap:16px; }
    .group-label { font-weight:600; color:#111827; }
    label { font-weight:600; color:#374151; display:flex; flex-direction:column; gap:6px; }
    input[type='date'], input[type='text'] { padding:8px 10px; border-radius:8px; border:1px solid #d1d5db; min-width:160px; }
    input[type='text'] { min-width:200px; }
    .search { flex:1 1 220px; }
    .chips { display:flex; flex-wrap:wrap; gap:8px; }
    .chip { display:flex; align-items:center; gap:6px; padding:6px 10px; border:1px solid #d1d5db; border-radius:999px; background:#f8fafc; font-size:.9rem; color:#1f2937; cursor:pointer; }
    .chip input { accent-color:#2563eb; }
    .actions { display:flex; gap:8px; align-items:center; }
    .btn { padding:8px 14px; border-radius:10px; border:1px solid #d1d5db; font-weight:600; cursor:pointer; background:#fff; color:#111827; }
    .btn.primary { background:#2563eb; border-color:#1d4ed8; color:#fff; }
    .btn.ghost { background:#f8fafc; }

    @media (max-width: 768px) {
      .group.inline { flex-direction:column; align-items:stretch; }
      input[type='date'], input[type='text'] { width:100%; }
      .actions { justify-content:flex-start; }
    }
  `]
})
export class ReservationsFiltersComponent implements OnChanges {
  @Input() statuses: ReservationStatusOption[] = [];
  @Input() value: ReservationsFiltersValue = { states: [], dateFrom: null, dateTo: null, q: null };
  @Output() search = new EventEmitter<ReservationsFiltersValue>();
  @Output() clear = new EventEmitter<void>();

  selectedStates: string[] = [];
  dateFrom: string | null = null;
  dateTo: string | null = null;
  searchTerm = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value) {
      this.selectedStates = [...(this.value.states || [])];
      this.dateFrom = this.value.dateFrom || null;
      this.dateTo = this.value.dateTo || null;
      this.searchTerm = this.value.q || '';
    }
  }

  isStateSelected(status: string){
    return this.selectedStates.includes(status);
  }

  onStatusToggle(status: string, checked?: boolean | null){
    const next = new Set(this.selectedStates);
    if (checked) {
      next.add(status);
    } else {
      next.delete(status);
    }
    this.selectedStates = Array.from(next);
  }

  onSubmit(){
    this.search.emit({
      states: this.selectedStates,
      dateFrom: this.dateFrom || null,
      dateTo: this.dateTo || null,
      q: this.searchTerm ? this.searchTerm.trim() : null,
    });
  }

  onClear(){
    this.selectedStates = [];
    this.dateFrom = null;
    this.dateTo = null;
    this.searchTerm = '';
    this.clear.emit();
  }
}
