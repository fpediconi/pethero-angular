import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingsService } from '@features/bookings/services';
import { GuardiansService } from '@features/guardians/services';
import { Pet } from '@features/pets/models';
import { GuardianProfile } from '@features/guardians/models';
import { validRange } from '@shared/utils';
import { PetsService } from '@features/pets/services';
/*
############################################
Name: BookingRequestPage
Objetive: Drive the booking request page experience.
Extra info: Coordinates routing context, data retrieval, and user actions.
############################################
*/


@Component({
  selector: 'ph-booking-request',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="card" *ngIf="guardian() as g">
    <h2>Confirmar reserva</h2>
    <p>Guardian: <b>{{ g.name || ('Guardian ' + g.id) }}</b></p>
    <p>Periodo: <b>{{ start() }}  {{ end() }}</b></p>
    <p>Mascota: <b>{{ pet()?.name }}</b> ({{ pet()?.type }}, {{ pet()?.size }})</p>
    <p class="error" *ngIf="error()">{{ error() }}</p>
    <div style="display:flex; gap:12px; margin-top:12px">
      <button (click)="confirm()" [disabled]="submitting()">Confirmar</button>
      <button (click)="cancel()">Cancelar</button>
    </div>
  </div>`
})
export class BookingRequestPage {
  private bookings = inject(BookingsService);
  private guardians = inject(GuardiansService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private petsService = inject(PetsService);

  pets = signal<Pet[]>([]);
  submitting = signal(false);
  error = signal<string | null>(null);
  guardianId = this.route.snapshot.paramMap.get('guardianId')!;
  guardian = signal<GuardianProfile | null>(null);

  // Query data
  start = signal('');
  end = signal('');
  petId = signal<string>('');
  pet = signal<Pet | null>(null);

  async confirm(){
    this.error.set(null);
    const err = validRange(this.start(), this.end());
    if (err) { this.error.set(err); return; }
    const g = this.guardian();
    const p = this.pet();
    if (!g || !p) { this.error.set('Faltan datos de la reserva.'); return; }
    try {
      this.submitting.set(true);
      await this.bookings.request({ guardian: g, petId: String(p.id), start: this.start(), end: this.end() });
      this.router.navigateByUrl('/bookings');
    } catch (e: any) {
      this.error.set(e?.message || 'No se pudo crear la solicitud. Proba nuevamente.');
    } finally {
      this.submitting.set(false);
    }
  }

  cancel(){ this.router.navigateByUrl('/guardians/search'); }

  
  /*
  ############################################
  Name: ngOnInit
  Objetive: Bootstrap the component once the view is initialized.
  Extra info: Coordinates asynchronous calls with state updates and error handling.
  ############################################
  */
  ngOnInit(){
    const qp = this.route.snapshot.queryParamMap;
    const start = qp.get('start') || '';
    const end = qp.get('end') || '';
    const petId = qp.get('petId') || '';
    this.start.set(start);
    this.end.set(end);
    this.petId.set(petId);

    this.guardians.getProfile(this.guardianId).subscribe(p => this.guardian.set(p));
    // Try to materialize the pet info for confirmation display
    const ownerId = sessionStorage.getItem('pethero_user') ? JSON.parse(sessionStorage.getItem('pethero_user')!).id : null;
    if (ownerId != null) {
      const ownerKey = `u${ownerId}`;
      this.petsService.list(String(ownerKey)).subscribe(list => {
        this.pets.set(list || []);
        const found = (list || []).find(x => String(x.id) === String(petId));
        if (found) this.pet.set(found);
      });
    }
  }
}

