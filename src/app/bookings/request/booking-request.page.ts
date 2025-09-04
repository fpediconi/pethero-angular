import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingsService } from '../bookings.service';
import { GuardiansService } from '../../guardians/guardians.service';
import { Pet } from '../../shared/models/pet';

@Component({
  selector: 'ph-booking-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="card">
    <h2>Solicitar Reserva</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input type="date" formControlName="start">
      <input type="date" formControlName="end">
      <select formControlName="petId">
        <option value="" disabled selected>Elegí tu mascota</option>
        <option *ngFor="let p of pets()" [value]="p.id">{{ p.name }}</option>
      </select>
      <button [disabled]="form.invalid || submitting()">Enviar</button>
      <p class="error" *ngIf="error()">{{ error() }}</p>
    </form>
  </div>`
})
export class BookingRequestPage {
  private fb = inject(FormBuilder);
  private bookings = inject(BookingsService);
  private guardians = inject(GuardiansService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  pets = signal<Pet[]>([{ id:'pet1', ownerId:'u1', name:'Luna', type:'DOG', size:'MEDIUM' } as Pet]);
  submitting = signal(false);
  error = signal<string | null>(null);
  guardianId = this.route.snapshot.paramMap.get('guardianId')!;

  form = this.fb.group({
    start: ['', Validators.required],
    end: ['', Validators.required],
    petId: ['', Validators.required]
  });

  async submit(){
    this.error.set(null);
    if (this.form.invalid) return;

    // Caso alternativo del PDF: sin mascotas -> redirigir a registrar mascota
    if (!this.pets().length) {
      this.router.navigateByUrl('/owners/pets');
      return;
    }

    const { start, end, petId } = this.form.getRawValue();
    if (new Date(end!) < new Date(start!)) {
      this.error.set('La fecha de fin no puede ser menor a la de inicio.');
      return;
    }
    try {
      this.submitting.set(true);
      await this.bookings.request({ guardianId: this.guardianId, petId, start, end });
      location.assign('/payments/checkout');
    } catch {
      this.error.set('No se pudo crear la solicitud. Probá nuevamente.');
    } finally {
      this.submitting.set(false);
    }
  }
}