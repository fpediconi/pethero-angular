import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { GuardiansService } from '@features/guardians/services';
import { GuardianProfile } from '@features/guardians/models';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth';
import { PetsService } from '@features/pets/services';
import { Pet } from '@features/pets/models';
import { BookingsService } from '@features/bookings/services';
import { ReviewsService } from '@features/reviews/services';
import { validRange } from '@shared/utils';
import { FavoritesService } from '@features/owners/services';
import { AvailabilityService } from '@features/guardians/services';
import { covers } from '@core/utils';
import { firstValueFrom } from 'rxjs';
/*
############################################
Name: GuardianSearchPage
Objetive: Drive the guardian search page experience.
Extra info: Coordinates routing context, data retrieval, and user actions.
############################################
*/


@Component({
  selector: 'ph-guardian-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
  <section class="filter card">
    <h2 class="title">Buscar Guardianes</h2>
    <form [formGroup]="filters" (ngSubmit)="search()" class="form-grid">
      <label>
        <span>Ciudad</span>
        <input placeholder="Ej: Mar del Plata" formControlName="city"/>
      </label>
      <label>
        <span>Desde</span>
        <input type="date" formControlName="start"/>
      </label>
      <label>
        <span>Hasta (exclusivo)</span>
        <input type="date" formControlName="end"/>
      </label>
      <label>
        <span>Mascota</span>
        <select formControlName="petId" [disabled]="!pets().length">
          <option value="" disabled selected>Elige tu mascota</option>
          <option *ngFor="let p of pets()" [value]="p.id">{{ p.name }} ({{ p.type }}, {{ p.size }})</option>
        </select>
      </label>
      <label>
        <span>Precio max/noche</span>
        <input placeholder="Ej: 8000" type="number" formControlName="maxPrice"/>
      </label>
      <div class="form-actions">
        <button class="btn primary" type="submit">Buscar</button>
      </div>
    </form>
    <p class="error" *ngIf="error()">{{ error() }}</p>
    <p *ngIf="!pets().length" class="muted">No tienes mascotas cargadas. Ve a Mis Mascotas para agregar una.</p>
  </section>

  <section class="results" *ngIf="results().length; else empty">
    <article class="g-card" *ngFor="let g of results()">
      <img class="avatar" [src]="g.avatarUrl || (g.photos && g.photos[0]) || 'https://via.placeholder.com/96'" alt="Avatar">
      <div class="info">
        <div class="header">
          <h3 class="name">{{ g.name || ('Guardian ' + g.id) }}</h3>
          <span class="badge price">&#36;{{ g.pricePerNight }}/noche</span>
        </div>
        <p class="city">{{ g.city }}</p>
        <p class="bio">{{ g.bio }}</p>
        <div class="chips">
          <span class="chip">Rating: {{ sum(g.id).avg }}/5 ({{ sum(g.id).count }})</span>
          <span class="chip" [class.ok]="isAvail(g.id)">{{ isAvail(g.id) ? 'Disponible' : 'No disponible' }}</span>
        </div>
        <div class="actions">
          <a class="btn" [routerLink]="['/guardians', 'profile', g.id]"
             [queryParams]="{ city: filters.value.city, start: filters.value.start, end: filters.value.end, petId: filters.value.petId, maxPrice: filters.value.maxPrice }"
             [queryParamsHandling]="'merge'">Ver perfil</a>
          <a class="btn primary" [routerLink]="['/bookings','request', g.id]"
             [queryParams]="{ start: filters.value.start, end: filters.value.end, petId: filters.value.petId }">Hacer reserva</a>
          <button *ngIf="isOwner()" class="icon-btn heart" type="button"
                  (click)="toggleFav(g.id)"
                  [disabled]="busyId() === g.id"
                  [class.filled]="isFav(g.id)"
                  [attr.aria-pressed]="isFav(g.id)"
                  [attr.aria-label]="isFav(g.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1 4.22 2.44C11.09 5 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54z"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  </section>
  <ng-template #empty>
    <div class="empty card">No hay resultados. Ajusta filtros y vuelve a intentar.</div>
  </ng-template>
  `,
  styles: [`
    :host{ display:block; padding-bottom:8px }
    .card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; box-shadow:0 1px 2px rgba(0,0,0,.04) }
    .title{ margin:0 0 8px 0 }
    .filter{ background: linear-gradient(135deg,#eff6ff,#ecfeff); border-color:#dbeafe }
    .form-grid{ display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:12px; align-items:end }
    label{ display:grid; gap:6px; font-weight:600; color:#374151 }
    input, select{ padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font:inherit; background:#fff }
    .form-actions{ display:flex; justify-content:flex-end }
    .btn{ display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border-radius:10px; border:1px solid #d1d5db; background:#fff; color:#111827; text-decoration:none; cursor:pointer }
    .btn.primary{ background:#2563eb; color:white; border-color:#1d4ed8 }
    /* keep buttons always active; request page revalida */
    .muted{ color:#6b7280; margin:6px 0 0 }
    .error{ color:#b91c1c; margin-top:8px }

    .results{ display:grid; gap:12px; margin-top:14px; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); }
    .g-card{ display:grid; grid-template-columns: 96px 1fr; gap:14px; align-items:center; border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fff }
    .g-card .avatar{ width:96px; height:96px; border-radius:10px; object-fit:cover; box-shadow:0 1px 6px rgba(0,0,0,.12) }
    .info{ display:grid; gap:6px }
    .header{ display:flex; align-items:center; justify-content:space-between; gap:12px }
    .name{ margin:0 }
    .city{ margin:0; color:#6b7280 }
    .bio{ margin:0 }
    .chips{ display:flex; gap:8px; flex-wrap:wrap }
    /* Oculta etiqueta de disponibilidad para evitar confusion */
    .chips .chip + .chip{ display:none }
    .chip{ padding:2px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#f8fafc; font-size:.85rem; color:#334155 }
    .chip.ok{ background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }
    .badge.price{ background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; padding:4px 10px; border-radius:999px; font-size:.85rem }
    .actions{ display:flex; gap:10px; flex-wrap:wrap }
    .empty{ text-align:center; color:#6b7280 }
    .icon-btn{ display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:999px; border:1px solid #e5e7eb; background:#fff; color:#ef4444; cursor:pointer }
    .icon-btn.heart.filled{ background:#fee2e2; border-color:#fecaca }

    @media (max-width: 920px){ .form-grid{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
    @media (max-width: 520px){ .form-grid{ grid-template-columns: 1fr } .results{ grid-template-columns: 1fr } .g-card{ grid-template-columns: 1fr } }
  `]
})


export class GuardianSearchPage {
  private fb = inject(FormBuilder);
  private guardians = inject(GuardiansService);
  private auth = inject(AuthService);
  private petsService = inject(PetsService);
  private bookings = inject(BookingsService);
  private reviews = inject(ReviewsService);
  private favorites = inject(FavoritesService);
  private availability = inject(AvailabilityService);
  
  filters = this.fb.group({
    city:[''],
    start:['', Validators.required],
    end:['', Validators.required],
    petId:['', Validators.required],
    maxPrice:[null]
  });
  results = signal<GuardianProfile[]>([]);
  pets = signal<Pet[]>([]);
  error = signal<string | null>(null);
  busyId = signal<string | null>(null);
  availMap = signal<Record<string, boolean>>({});

  addDays(dateStr: string, days: number){
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0,10); // YYYY-MM-DD
  }
  foldCity(s: string){
    return (s || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')    // quita acentos
      .replace(/\s+/g, ' ');             // colapsa espacios
  }
  
  ngOnInit() {
  const user = this.auth.user();

  if (user?.role === 'owner') {
    this.petsService.list().subscribe({
      next: (pets) => {
        const arr = pets ?? [];
        this.pets.set(arr);

        if (arr.length === 1) {
          this.filters.patchValue({ petId: String(arr[0].id) });
        }
      },
      error: () => {
        this.pets.set([]);
      }
    });

    this.favorites.ensureLoaded().subscribe();
  } else {
    // Si es guardián, no pegamos a /pets
    this.pets.set([]);
  }
}


  
  /*
  ############################################
  Name: search
  Objetive: Execute the search workflow.
  Extra info: Coordinates asynchronous calls with state updates and error handling.
  ############################################
  */
  async search(){
    this.error.set(null);
    const f = this.filters.getRawValue();
    const err = validRange(String(f.start || ''), String(f.end || ''));
    if (err) { this.error.set(err); this.results.set([]); return; }
    if (!f.petId) { this.error.set('Seleccione una mascota para buscar.'); this.results.set([]); return; }

    const pet = this.pets().find(p => String(p.id) === String(f.petId));
    const base = await this.guardians.search({ city: f.city, maxPrice: f.maxPrice });
    const prelim = (base || [])
      // Compatibilidad por TIPO de mascota (sin forzar tamano)
      .filter(g => pet ? (g.acceptedTypes || []).includes(pet.type as any) : true)
      // Precio: menor estrictamente al maximo
      .filter(g => {
        const maxOk = !f.maxPrice || (g.pricePerNight || 0) <= Number(f.maxPrice);
        const q = this.foldCity(f.city || '');
        const city = this.foldCity(g.city || '');
        const cityOk = !q || city === q;      

        return maxOk && cityOk;
      });

    // Compute availability per guardian (cubre todo el rango y SIN colisiones por reservas)
    const availability: Record<string, boolean> = {};
    for (const g of prelim){
      try {
        const checks = prelim.map(async g => {
          const ok = await firstValueFrom(
            this.availability.hasCoverageForRange({
              guardianId: g.id,
              startDay: String(f.start),
              endDayExcl: String(f.end),
              petCount: 1
            })
          );
          const collide = await firstValueFrom(
            this.bookings.hasOccupiedCollision(g.id, { start: String(f.start), end: String(f.end) })
          );
          availability[g.id] = ok && !collide;
        });
        await Promise.all(checks);
        this.availMap.set(availability);

      } catch {
        availability[g.id] = false;
      }
    }

    // Sort: available first, then by price
    const sorted = prelim.slice().sort((a,b) => {
      const avA = availability[a.id] ? 1 : 0;
      const avB = availability[b.id] ? 1 : 0;
      if (avA !== avB) return avB - avA;
      return (a.pricePerNight||0) - (b.pricePerNight||0);
    });
    const onlyAvail = sorted.filter(g => availability[g.id]);

    this.availMap.set(availability);
    // Mostrar resultados aunque ninguno este disponible; el chip indica el estado
    // Solo mostrar error si no hay resultados tras filtros basicos
    if (!onlyAvail.length) {
      this.error.set('No hay guardianes disponibles para ese periodo.');
    } else {
      this.error.set(null);
    }
    this.results.set(onlyAvail);
  }

  sum(id: string){
    return this.reviews.summary(id)();
  }

  isOwner(){ return this.auth.user()?.role === 'owner'; }
  isFav(guardianId: string){ return this.favorites.isFavorite(guardianId); }
  toggleFav(guardianId: string){
    this.busyId.set(guardianId);
    this.favorites.toggle(guardianId).subscribe({
      next: () => this.busyId.set(null),
      error: () => { this.busyId.set(null); alert('No se pudo actualizar el favorito'); }
    });
  }

  isAvail(guardianId: string){ return !!this.availMap()[guardianId]; }
}




