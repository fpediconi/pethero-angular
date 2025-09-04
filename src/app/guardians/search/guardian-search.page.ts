import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { GuardiansService } from '../guardians.service';
import { GuardianProfile } from '../../shared/models/guardian';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ph-guardian-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
  <div class="card">
    <h2>Buscar Guardianes</h2>
    <form [formGroup]="filters" (ngSubmit)="search()">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px">
        <input placeholder="Ciudad" formControlName="city"/>
        <select formControlName="type">
          <option value="DOG">Perros</option>
          <option value="CAT">Gatos</option>
        </select>
        <select formControlName="size">
          <option value="SMALL">Pequeño</option>
          <option value="MEDIUM">Mediano</option>
          <option value="LARGE">Grande</option>
        </select>
        <input placeholder="Precio máx por noche" type="number" formControlName="maxPrice"/>
      </div>
      <button style="margin-top:12px">Buscar</button>
    </form>
  </div>

  <div style="display:grid; gap:12px; margin-top:12px">
    <div class="card" *ngFor="let g of results()">
      <h3>{{ g.id }} — \${{ g.pricePerNight }}/noche</h3>
      <p>{{ g.bio }}</p>
      <p><span class="badge">Rating: {{ g.ratingAvg || 0 }}/5 ({{ g.ratingCount || 0 }})</span></p>
      <a [routerLink]="['/guardians', 'profile', g.id]">Ver perfil</a>
    </div>
  </div>
  `
})
export class GuardianSearchPage {
  private fb = inject(FormBuilder);
  private guardians = inject(GuardiansService);

  filters = this.fb.group({ city:[''], type:['DOG'], size:['MEDIUM'], maxPrice:[null] });
  results = signal<GuardianProfile[]>([]);

  async search(){
    const r = await this.guardians.search(this.filters.getRawValue());
    this.results.set(r || []);
  }
}
