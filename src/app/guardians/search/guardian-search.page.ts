import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { GuardiansService } from '../guardians.service';
import { GuardianProfile } from '../../shared/models/guardian';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { PetsService } from '../../owners/pets/pets.service';
import { Pet } from '../../shared/models/pet';
import { BookingsService } from '../../bookings/bookings.service';
import { ReviewsService } from '../../reviews/reviews.service';
import { validRange } from '../../shared/utils/date.util';

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
        <span>Hasta</span>
        <input type="date" formControlName="end"/>
      </label>
      <label>
        <span>Mascota</span>
        <select formControlName="petId" [disabled]="!pets().length">
          <option value="" disabled selected>Elegí tu mascota</option>
          <option *ngFor="let p of pets()" [value]="p.id">{{ p.name }} ({{ p.type }}, {{ p.size }})</option>
        </select>
      </label>
      <label>
        <span>Precio máx/noche</span>
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
          <h3 class="name">{{ g.name || ('Guardián ' + g.id) }}</h3>
          <span class="badge price">&#36;{{ g.pricePerNight }}/noche</span>
        </div>
        <p class="city">{{ g.city }}</p>
        <p class="bio">{{ g.bio }}</p>
        <div class="chips">
          <span class="chip">Rating: {{ sum(g.id).avg }}/5 ({{ sum(g.id).count }})</span>
          <span class="chip">Disponible: {{ filters.value.start }} &rarr; {{ filters.value.end }}</span>
        </div>
        <div class="actions">
          <a class="btn" [routerLink]="['/guardians', 'profile', g.id]"
             [queryParams]="{ city: filters.value.city, start: filters.value.start, end: filters.value.end, petId: filters.value.petId, maxPrice: filters.value.maxPrice }"
             [queryParamsHandling]="'merge'">Ver perfil</a>
          <a class="btn primary" [routerLink]="['/bookings','request', g.id]"
             [queryParams]="{ start: filters.value.start, end: filters.value.end, petId: filters.value.petId }">Hacer reserva</a>
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
    .chip{ padding:2px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#f8fafc; font-size:.85rem; color:#334155 }
    .badge.price{ background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; padding:4px 10px; border-radius:999px; font-size:.85rem }
    .actions{ display:flex; gap:10px; flex-wrap:wrap }
    .empty{ text-align:center; color:#6b7280 }

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

  ngOnInit(){
    const user = this.auth.user();
    if (user?.role === 'owner' && user.id != null) {
      const ownerKey = `u${user.id}`;
      this.petsService.list(ownerKey).subscribe(p => {
        const arr = p || [];
        this.pets.set(arr);
        if (arr.length === 1) this.filters.patchValue({ petId: String(arr[0].id) });
      });
    }
  }

  async search(){
    this.error.set(null);
    const f = this.filters.getRawValue();
    const err = validRange(String(f.start || ''), String(f.end || ''));
    if (err) { this.error.set(err); this.results.set([]); return; }
    if (!f.petId) { this.error.set('Seleccione una mascota para buscar.'); this.results.set([]); return; }

    const pet = this.pets().find(p => String(p.id) === String(f.petId));
    const base = await this.guardians.search({ city: f.city, maxPrice: f.maxPrice });
    const filtered = (base || [])
      .filter(g => pet ? (g.acceptedTypes || []).includes(pet.type as any) : true)
      .filter(g => pet ? (g.acceptedSizes || []).includes(pet.size as any) : true)
      .filter(g => {
        const maxOk = !f.maxPrice || (g.pricePerNight || 0) <= Number(f.maxPrice);
        const q = (f.city || '').trim();
        if (!q) return maxOk;
        const city = (g.city || '').toString();
        return maxOk && city.toLowerCase().includes(q.toLowerCase());
      })
      .filter(g => this.bookings.isGuardianAvailable(g.id, String(f.start), String(f.end)))
      .sort((a,b) => (a.pricePerNight||0) - (b.pricePerNight||0));
    if (!filtered.length) this.error.set('No hay guardianes disponibles para ese período.');
    this.results.set(filtered);
  }

  sum(id: string){
    return this.reviews.summary(id)();
  }
}
