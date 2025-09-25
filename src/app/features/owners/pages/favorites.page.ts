import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '@features/owners/services';
import { Favorite } from '@features/owners/models';
import { AuthService } from '@core/auth';
import { ApiService } from '@core/http';
import { GuardianProfile } from '@features/guardians/models';
import { forkJoin } from 'rxjs';
/*
############################################
Name: FavoritesPage
Objetive: Drive the favorites page experience.
Extra info: Coordinates routing context, data retrieval, and user actions.
############################################
*/


@Component({
  selector: 'ph-owner-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <section class="header">
    <h2>Mis favoritos</h2>
  </section>

  <section class="list" *ngIf="!loading(); else loadingTpl">
    <div *ngIf="guardians().length === 0" class="empty card">Aun no agregaste guardianes a favoritos.</div>

    <article class="g-card card" *ngFor="let g of guardians()">
      <img class="avatar" [src]="g.avatarUrl || (g.photos && g.photos[0]) || 'https://via.placeholder.com/96'" alt="Avatar">
      <div class="info">
        <div class="header-row">
          <h3 class="name">{{ g.name || ('Guardian ' + g.id) }}</h3>
          <div class="right">
            <button class="icon-btn heart filled" type="button"
              aria-label="Quitar de favoritos" [attr.aria-pressed]="true"
              (click)="toggle(g.id)" [disabled]="busyId() === g.id">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1 4.22 2.44C11.09 5 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54z"/></svg>
            </button>
          </div>
        </div>
        <p class="city">{{ g.city }}</p>
        <p class="bio">{{ g.bio }}</p>
        <div class="chips">
          <span class="chip">$ {{ g.pricePerNight }}/noche</span>
        </div>
        <div class="actions">
          <a class="btn" [routerLink]="['/guardians','profile', g.id]">Ver perfil</a>
        </div>
      </div>
    </article>
  </section>

  <ng-template #loadingTpl>
    <div class="empty card">Cargando favoritos...</div>
  </ng-template>
  `,
  styles: [`
    :host{ display:block; padding:16px }
    .header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px }
    h2{ margin:0 }
    .card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; box-shadow:0 1px 2px rgba(0,0,0,.04) }
    .empty{ text-align:center; color:#6b7280 }
    .list{ display:grid; gap:12px; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); }
    .g-card{ display:grid; grid-template-columns: 96px 1fr; gap:14px; align-items:center }
    .avatar{ width:96px; height:96px; border-radius:10px; object-fit:cover; box-shadow:0 1px 6px rgba(0,0,0,.12) }
    .info{ display:grid; gap:6px }
    .header-row{ display:flex; align-items:center; justify-content:space-between; gap:10px }
    .name{ margin:0 }
    .city{ margin:0; color:#6b7280 }
    .bio{ margin:0 }
    .chips{ display:flex; gap:8px; flex-wrap:wrap }
    .chip{ padding:2px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#f8fafc; font-size:.85rem; color:#334155 }
    .actions{ display:flex; gap:10px; flex-wrap:wrap }
    .btn{ display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border-radius:10px; border:1px solid #d1d5db; background:#fff; color:#111827; text-decoration:none; cursor:pointer }
    .icon-btn{ display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:999px; border:1px solid #e5e7eb; background:#fff; color:#ef4444; cursor:pointer }
    .icon-btn.heart{ color:#ef4444 }
    .icon-btn.heart.filled{ background:#fee2e2; border-color:#fecaca }
  `]
})
export class FavoritesPage {
  private favoritesSvc = inject(FavoritesService);
  private api = inject(ApiService);
  private auth = inject(AuthService);

  loading = signal(true);
  favorites = signal<Favorite[]>([]);
  guardians = signal<GuardianProfile[]>([]);
  busyId = signal<string | null>(null);

  constructor(){
    // React a cambios de favoritos
    effect(() => {
      const list = this.favoritesSvc.favoritesSig();
      if (Array.isArray(list)) {
        // Orden por createdAt desc
        const ordered = [...list].sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        this.favorites.set(ordered);
        this.loadGuardians();
      }
    });
  }

  ngOnInit(){
    // Carga inicial + sincroniza inmediatamente la vista
    this.favoritesSvc.ensureLoaded().subscribe({
      next: () => {
        const list = this.favoritesSvc.favoritesSig();
        if (Array.isArray(list)) {
          const ordered = [...list].sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          this.favorites.set(ordered);
          this.loadGuardians();
        }
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  
  /*
  ############################################
  Name: loadGuardians
  Objetive: Load guardians data.
  Extra info: Coordinates asynchronous calls with state updates and error handling.
  ############################################
  */
  loadGuardians(){
    const ids = this.favorites().map(f => f.guardianId);
    if (!ids.length) { this.guardians.set([]); return; }
    // Intento batch con ?id=A&id=B
    this.api.get<GuardianProfile[]>('/guardians', { id: ids }).subscribe(gs => {
      // Mantener el orden segun favoritos
      const list = gs || [];
      if ((!list || list.length === 0) && ids.length) {
        const requests = ids.map(id => this.api.get<GuardianProfile>(`/guardians/${encodeURIComponent(id)}`));
        forkJoin(requests).subscribe(items => {
          const map = new Map((items || []).map(g => [String(g.id), g] as const));
          const ordered: GuardianProfile[] = [];
          for (const f of this.favorites()){
            const g = map.get(String(f.guardianId));
            if (g) ordered.push(g);
          }
          this.guardians.set(ordered);
        });
        return;
      }
      const map = new Map(list.map(g => [String(g.id), g] as const));
      const ordered: GuardianProfile[] = [];
      for (const f of this.favorites()){
        const g = map.get(String(f.guardianId));
        if (g) ordered.push(g);
      }
      this.guardians.set(ordered);
    });
  }

  toggle(guardianId: string){
    this.busyId.set(guardianId);
    this.favoritesSvc.toggle(guardianId).subscribe({
      next: () => { this.busyId.set(null); },
      error: () => { this.busyId.set(null); alert('No se pudo actualizar el favorito.'); }
    });
  }
}




