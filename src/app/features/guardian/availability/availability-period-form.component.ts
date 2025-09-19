import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AvailabilityService } from '../../../shared/services/availability.service';

@Component({
  selector: 'ph-availability-period-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-grid">
    <label>
      <span>Desde</span>
      <input type="date" formControlName="start" required />
    </label>
    <label>
      <span>Hasta (excl.)</span>
      <input type="date" formControlName="end" required />
    </label>
    <div class="actions">
      <button type="button" class="btn" (click)="cancel.emit()">Cancelar</button>
      <button type="submit" class="btn primary" [disabled]="!!error || form.invalid">Guardar</button>
    </div>
    <p class="error" *ngIf="error">{{ error }}</p>
    <p class="hint">Los rangos usan fin exclusivo [desde, hasta).</p>
  </form>
  `,
  styles: [`
    .form-grid{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; align-items:end }
    label{ display:grid; gap:6px; font-weight:600; color:#374151 }
    input{ padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font:inherit; background:#fff }
    .actions{ display:flex; gap:8px; justify-content:flex-end; grid-column: span 3 }
    .btn{ display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border-radius:10px; border:1px solid #d1d5db; background:#fff; color:#111827; text-decoration:none; cursor:pointer }
    .btn.primary{ background:#2563eb; color:white; border-color:#1d4ed8 }
    .error{ color:#b91c1c; grid-column: span 3 }
    .hint{ color:#6b7280; grid-column: span 3 }
  `]
})
export class AvailabilityPeriodFormComponent {
  private fb = inject(FormBuilder);
  private availability = inject(AvailabilityService);

  @Input() guardianId!: string;
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  error: string | null = null;

  form = this.fb.group({
    start: ['', Validators.required],
    end: ['', Validators.required],
  });

  async onSubmit(){
    this.error = null;
    const v = this.form.getRawValue();
    if (!v.start || !v.end) { this.error = 'Debe indicar fechas.'; return; }
    if (String(v.start) >= String(v.end)) { this.error = 'La fecha Hasta debe ser mayor a Desde.'; return; }
    const blocks = await new Promise<any[]>(resolve => this.availability.listBlocks(this.guardianId).subscribe(resolve));
    const candidate = { start: `${v.start}T00:00:00Z`, end: `${v.end}T00:00:00Z` };
    const check = this.availability.validateNoOverlapBlocks(candidate, blocks as any);
    if (!check.ok){
      const c = check.conflicts![0];
      this.error = `Se solapa con otro período (${(c.start||'').slice(0,10)} → ${(c.end||'').slice(0,10)})`;
      return;
    }
    this.availability.createBlock({ guardianId: this.guardianId, startDay: String(v.start), endDayExcl: String(v.end) })
      .subscribe({ next: () => this.saved.emit(), error: (e) => this.error = String(e?.message || 'No se pudo guardar') });
  }
}
