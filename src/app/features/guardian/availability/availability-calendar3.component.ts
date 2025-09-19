import { Component, Input, OnChanges, SimpleChanges, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvailabilityService } from '../../../shared/services/availability.service';

@Component({
  selector: 'ph-availability-calendar3',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="cal">
    <div class="cal-head">
      <button class="nav" (click)="prevMonth()" aria-label="Mes anterior"><span aria-hidden="true">‹</span></button>
      <div class="title">{{ monthLabel() }}</div>
      <button class="nav" (click)="nextMonth()" aria-label="Mes siguiente"><span aria-hidden="true">›</span></button>
    </div>
    <div class="weekdays">
      <div *ngFor="let w of weekdays">{{ w }}</div>
    </div>
    <div class="grid">
      <div *ngFor="let d of gridDays()" class="cell" [class.muted]="!d.inMonth" [class.closed]="d.state==='closed'" [class.reserved]="d.state==='reserved'" [class.open]="d.state==='open'" (click)="selectDay(d)" [attr.aria-label]="d.key">
        <div class="num">{{ d.dayNum }}</div>
        <div class="labels" *ngIf="bookingLabels(d.key).length">
          <div class="label" *ngFor="let l of bookingLabels(d.key)" [title]="l">{{ l }}</div>
        </div>
      </div>
    </div>
    <div class="legend">
      <span class="dot open"></span> Disponible
      <span class="dot reserved"></span> Reservado
      <span class="dot closed"></span> No disponible
    </div>
    <div class="details" *ngIf="selectedDay() as day">
      <h4>Detalle del día {{ day }}</h4>
      <div *ngIf="bookingsForDay(day).length; else noBk">
        <ul class="bk-list">
          <li *ngFor="let b of bookingsForDay(day)">
            <span class="tag">Reserva</span>
            <div class="kv"><span class="k">ID:</span><span class="v">{{ b.id }}</span></div>
            <div class="kv"><span class="k">Dueño:</span><span class="v">{{ ownerLabel(b) }}</span></div>
            <div class="kv"><span class="k">Mascota:</span><span class="v">{{ petLabel(b) }}</span></div>
            <div class="kv"><span class="k">Estado:</span><span class="v">{{ b?.status || '-' }}</span></div>
            <div class="kv"><span class="k">Desde:</span><span class="v">{{ b?.start | date:'mediumDate' }}</span></div>
            <div class="kv"><span class="k">Hasta:</span><span class="v">{{ b?.end | date:'mediumDate' }}</span></div>
          </li>
        </ul>
      </div>
      <ng-template #noBk><div class="muted">Sin reservas en este día.</div></ng-template>
    </div>
  </div>
  `,
  styles: [`
    .cal{ border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fff }
    .cal-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
    .title{ font-weight:700 }
    .nav{ background:#fff; border:1px solid #e5e7eb; border-radius:999px; padding:4px; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; color:#334155 }
    .weekdays{ display:grid; grid-template-columns:repeat(7,1fr); font-weight:700; color:#64748b; padding:6px 0 }
    .grid{ display:grid; grid-template-columns:repeat(7,1fr); gap:6px }
    .cell{ position:relative; aspect-ratio:1/1; border:2px solid #e5e7eb; border-radius:14px; background:#f8fafc; cursor:pointer }
    .cell .num{ position:absolute; top:6px; left:8px; font-weight:700; color:#334155 }
    .cell .labels{ position:absolute; left:6px; right:6px; bottom:6px; display:grid; gap:4px }
    .cell .label{ background:#1d4ed8; color:#fff; font-size:.75rem; padding:3px 6px; border-radius:8px; white-space:normal; line-height:1.2; box-shadow:0 1px 0 rgba(0,0,0,.15) }
    .cell.open{ background:#eafbf0; border-color:#bbf7d0 }
    .cell.reserved{ background:#fee2e2; border-color:#fecaca }
    .cell.closed{ background:#eef2f7; border-color:#e2e8f0 }
    .cell.muted{ opacity:.6 }
    .legend{ display:flex; align-items:center; gap:12px; margin-top:10px; color:#334155 }
    .dot{ display:inline-block; width:10px; height:10px; border-radius:999px; margin-right:4px; border:1px solid rgba(0,0,0,.08) }
    .dot.open{ background:#86efac }
    .dot.reserved{ background:#fecaca }
    .dot.closed{ background:#cfd8e3 }
    .details{ margin-top:12px; padding:10px; border:1px solid #e5e7eb; border-radius:10px; background:#f8fafc }
    .bk-list{ list-style:none; margin:0; padding:0; display:grid; gap:8px }
    .bk-list li{ display:grid; grid-template-columns: 1fr; gap:6px; align-items:start; background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:10px }
    .tag{ background:#e0e7ff; color:#3730a3; border:1px solid #c7d2fe; border-radius:999px; padding:0 6px; font-size:.75rem }
    .kv{ display:grid; grid-template-columns: 80px 1fr; gap:8px }
    .kv .k{ font-weight:700; color:#334155 }
    .kv .v{ color:#111827 }
  `]
})
export class AvailabilityCalendar3Component implements OnChanges {
  private availability = inject(AvailabilityService);

  @Input() guardianId!: string;

  month = signal<number>(new Date().getMonth());
  year = signal<number>(new Date().getFullYear());
  capMap = signal<Record<string, number>>({});
  occMap = signal<Record<string, number>>({});
  bookings = signal<any[]>([]);
  ownerNames = signal<Record<string, string>>({});
  petsMap = signal<Record<string, { name: string; type: string; size?: string }>>({});
  selectedDay = signal<string | null>(null);
  weekdays = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];

  ngOnChanges(changes: SimpleChanges): void { if (changes['guardianId']) this.load(); }
  monthLabel(){ const d = new Date(this.year(), this.month(), 1); return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); }
  private rangeUTC(){ const s = new Date(this.year(), this.month(), 1); const e = new Date(this.year(), this.month()+1, 1); return { startUTC: s.toISOString(), endUTC: e.toISOString() }; }

  private load(){
    if (!this.guardianId) return;
    const { startUTC, endUTC } = this.rangeUTC();
    this.availability.computeDailyAvailability({ guardianId: this.guardianId, startUTC, endUTC }).subscribe(({ cap, occ }) => { this.capMap.set(cap); this.occMap.set(occ); });
    this.availability.listBookingsRaw(this.guardianId).subscribe(list => {
      const arr = (list || []).filter((b:any) => ['ACCEPTED','CONFIRMED'].includes(b.status));
      this.bookings.set(arr);
      const ownerIds = Array.from(new Set(arr.map((b:any) => String(b.ownerId))));
      const petIds = Array.from(new Set(arr.map((b:any) => String(b.petId))));
      ownerIds.forEach(id => this.availability['api'].get<any[]>('/profiles', { userId: id }).subscribe(resp => this.ownerNames.set({ ...this.ownerNames(), [id]: String((resp && resp[0]?.displayName) || id) })));
      petIds.forEach(pid => this.availability['api'].get<any[]>('/pets', { id: pid }).subscribe(resp => { const p = resp && resp[0]; if (p) this.petsMap.set({ ...this.petsMap(), [pid]: { name: p.name, type: p.type, size: p.size } }); }));
    });
  }

  prevMonth(){ const m=this.month(); if (m===0){ this.month.set(11); this.year.set(this.year()-1);} else { this.month.set(m-1); } this.load(); }
  nextMonth(){ const m=this.month(); if (m===11){ this.month.set(0); this.year.set(this.year()+1);} else { this.month.set(m+1); } this.load(); }

  gridDays = computed(() => {
    const first = new Date(this.year(), this.month(), 1);
    const startIdx = (first.getDay()+6)%7;
    const startGrid = new Date(this.year(), this.month(), 1 - startIdx);
    const cells: { date: Date; inMonth: boolean; dayNum: number; key: string; state: 'open'|'reserved'|'closed' }[] = [];
    for (let i=0;i<42;i++){
      const d = new Date(startGrid.getFullYear(), startGrid.getMonth(), startGrid.getDate()+i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const hasBlock = (this.capMap()[key] || 0) > 0;
      const hasBooking = this.bookingsForDay(key).length > 0;
      const state = (hasBooking) ? 'reserved' : (hasBlock ? 'open' : 'closed');
      cells.push({ date: d, inMonth: d.getMonth()===this.month(), dayNum: d.getDate(), key, state });
    }
    return cells;
  });

  bookingsForDay(dayKey: string){ const start = dayKey + 'T00:00:00Z'; const end = new Date(new Date(start).getTime() + 24*60*60*1000).toISOString(); return (this.bookings() || []).filter(b => (b.start < end) && (start < b.end)); }
  bookingLabels(dayKey: string){ return this.bookingsForDay(dayKey).map((b:any) => { const owner = this.ownerNames()[String(b.ownerId)] || String(b.ownerId); const pet = this.petsMap()[String(b.petId)]; const petName = pet?.name || String(b.petId); const petType = pet?.type || ''; return `${owner} - ${petName}${petType ? ' ('+petType+')' : ''}`; }).slice(0,3); }
  petName(pid: string){ return (this.petsMap()[pid]?.name) || pid; }
  petType(pid: string){ return (this.petsMap()[pid]?.type) || ''; }
  ownerLabel(b: any){ const id = String(b?.ownerId ?? ''); return this.ownerNames()[id] || id; }
  petLabel(b: any){ const pid = String(b?.petId ?? ''); const p = this.petsMap()[pid]; return p ? `${p.name}${p.type ? ' ('+p.type+')' : ''}` : pid; }
  toDateStr(v: any){ try{ return v ? new Date(v).toISOString() : ''; } catch{ return ''; } }
  selectDay(cell: { key: string }){ this.selectedDay.set(cell.key); }
}
