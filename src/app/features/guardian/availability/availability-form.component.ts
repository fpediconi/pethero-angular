import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AvailabilitySlot } from '../../../core/models/availability.model';
import { compareISO, diffDays, isValidRange } from '../../../core/utils/date-range.util';

@Component({
  selector: 'ph-availability-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-grid" aria-live="polite">
    <label>
      <span>Desde</span>
      <input type="date" formControlName="startDate" required />
    </label>
    <label>
      <span>Hasta</span>
      <input type="date" formControlName="endDate" required />
    </label>
    <div class="meta">
      <span>Duración: <strong>{{ nights() }}</strong> noches</span>
    </div>
    <div class="actions">
      <button type="button" class="btn" (click)="cancel.emit()">Cancelar</button>
      <button type="submit" class="btn primary" [disabled]="!!error || form.invalid">Guardar</button>
    </div>
    <p class="error" *ngIf="error">{{ error }}</p>
  </form>
  `,
  styles: [`
    .form-grid{ display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:12px; align-items:end }
    label{ display:grid; gap:6px; font-weight:600; color:#374151 }
    input{ padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font:inherit; background:#fff }
    .meta{ grid-column: span 2; color:#6b7280 }
    .actions{ grid-column: span 2; display:flex; gap:8px; justify-content:flex-end }
    .btn{ display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border-radius:10px; border:1px solid #d1d5db; background:#fff; color:#111827; text-decoration:none; cursor:pointer }
    .btn.primary{ background:#2563eb; color:white; border-color:#1d4ed8 }
    .error{ grid-column: span 2; color:#b91c1c; margin:0 }
  `]
})
export class AvailabilityFormComponent {
  private fb = inject(FormBuilder);

  @Input() initialValue: Partial<AvailabilitySlot> | null = null;
  @Input() existing: AvailabilitySlot[] = [];
  @Input() excludeId: string | null = null;
  @Output() save = new EventEmitter<{ startDate: string; endDate: string }>();
  @Output() cancel = new EventEmitter<void>();

  error: string | null = null;

  form = this.fb.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
  });

  ngOnInit(){
    if (this.initialValue){
      this.form.patchValue({
        startDate: this.initialValue.startDate || '',
        endDate: this.initialValue.endDate || '',
      });
    }
    this.form.valueChanges.subscribe(() => this.validate());
    this.validate();
  }

  nights(){
    const v = this.form.getRawValue();
    return diffDays(String(v.startDate||''), String(v.endDate||''));
  }

  private validate(){
    const { startDate, endDate } = this.form.getRawValue();
    this.error = null;
    if (!startDate || !endDate) { this.error = 'Requerido'; return; }
    if (!isValidRange(String(startDate), String(endDate))) {
      this.error = 'La fecha de fin debe ser mayor a la de inicio.';
      return;
    }
    // Overlap check excluding current id
    const conflicts = (this.existing || [])
      .filter(s => !this.excludeId || s.id !== this.excludeId)
      .filter(s => compareISO(String(startDate), s.endDate) < 0 && compareISO(s.startDate, String(endDate)) < 0);
    if (conflicts.length){
      const c = conflicts[0];
      this.error = `El bloque solapa con otro existente del ${c.startDate} al ${c.endDate}`;
      return;
    }
  }

  onSubmit(){
    if (this.error || this.form.invalid) return;
    const { startDate, endDate } = this.form.getRawValue();
    this.save.emit({ startDate: String(startDate), endDate: String(endDate) });
  }
}

