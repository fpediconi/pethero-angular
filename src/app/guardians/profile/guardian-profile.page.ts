import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GuardiansService } from '../guardians.service';
import { ChatService } from '../../chat/chat.service';
import { GuardianProfile } from '../../shared/models/guardian';
import { ReviewsService } from '../../reviews/reviews.service';
import { FavoritesService } from '../../shared/services/favorites.service';
import { AuthService } from '../../auth/auth.service';
import { ReviewsPage } from '../../reviews/reviews.page';

@Component({
  selector: 'ph-guardian-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReviewsPage],
  template: `
    <ng-container *ngIf="profile() as p">
      <section class="hero">
        <img class="avatar" [src]="p.avatarUrl || (p.photos && p.photos[0]) || 'https://via.placeholder.com/160'" alt="Avatar del guardian">
        <div class="meta">
          <h1 class="name">{{ p.name || ('Guardian ' + p.id) }}</h1>
          <p class="city">{{ p.city || 'Ciudad no informada' }}</p>
          <div class="badges">
            <span class="badge rating" (click)="scrollToReviews()" style="cursor:pointer" aria-label="Promedio de reseñas">
              ★ {{ summary().avg }}/5 ({{ summary().count }})
            </span>
            <span class="badge price">$ {{ p.pricePerNight }} / noche</span>
          </div>
          <div class="actions">
            <a class="btn primary" *ngIf="fromSearch()" [routerLink]="['/bookings/request', p.id]"
               [queryParams]="{ start: route.snapshot.queryParams['start'], end: route.snapshot.queryParams['end'], petId: route.snapshot.queryParams['petId'] }">Hacer reserva</a>
            <button class="btn" type="button" (click)="message(p.id)">Mandar mensaje</button>
            <button class="btn" *ngIf="isOwner()" type="button" (click)="toggleFav(p.id)" [disabled]="busy()"
                    [attr.aria-pressed]="isFav(p.id)"
                    [attr.aria-label]="isFav(p.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style="color:#ef4444">
                <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1 4.22 2.44C11.09 5 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54z"/>
              </svg>
              {{ isFav(p.id) ? 'Quitar' : 'Favorito' }}
            </button>
            <a class="btn" *ngIf="fromSearch()" [routerLink]="['/guardians','search']"
               [queryParams]="route.snapshot.queryParams" [queryParamsHandling]="'merge'">Volver a la búsqueda</a>
          </div>
        </div>
      </section>

      <section class="content">
        <article class="card bio">
          <h3>Sobre mí</h3>
          <p>{{ p.bio || 'Este guardian aun no escribió su bio.' }}</p>
        </article>

        <article class="card details">
          <h3>Detalles</h3>
          <div class="rows">
            <div class="row">
              <span class="lbl">Tipos aceptados</span>
              <span class="chip" *ngFor="let t of (p.acceptedTypes || [])">{{ t }}</span>
            </div>
            <div class="row">
              <span class="lbl">Tamaños aceptados</span>
              <span class="chip" *ngFor="let s of (p.acceptedSizes || [])">{{ s }}</span>
            </div>
          </div>
        </article>

        <article class="card gallery" *ngIf="(p.photos || []).length">
          <h3>Fotos</h3>
          <div class="grid">
            <img *ngFor="let url of p.photos" [src]="url" alt="Foto del hogar" class="photo">
          </div>
        </article>

        <article class="card reviews-block" id="reviews-block">
          <ph-reviews [guardianId]="p.id"></ph-reviews>
        </article>
      </section>
    </ng-container>
  `,
  styles: [`
    :host { display:block }
    .hero{ background: linear-gradient(135deg,#eef2ff,#ecfeff); border:1px solid #e5e7eb; border-radius:16px; padding:16px; display:grid; grid-template-columns: 120px 1fr; gap:16px; align-items:center }
    .avatar{ width:120px; height:120px; border-radius:12px; object-fit:cover; box-shadow:0 4px 10px rgba(0,0,0,.12) }
    .meta{ display:grid; gap:6px }
    .name{ margin:0; line-height:1.1 }
    .city{ margin:0; color:#6b7280 }
    .badges{ display:flex; gap:8px; flex-wrap:wrap; margin-top:4px }
    .badge{ display:inline-flex; align-items:center; padding:4px 10px; border-radius:999px; font-size:.85rem; border:1px solid #e5e7eb; color:#1f2937; background:#fff }
    .badge.rating{ background:#fff7ed; border-color:#fed7aa; color:#9a3412 }
    .badge.price{ background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }
    .actions{ display:flex; gap:10px; margin-top:8px; flex-wrap:wrap }
    .btn{ display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border-radius:10px; border:1px solid #d1d5db; background:#fff; color:#111827; text-decoration:none }
    .btn.primary{ background:#2563eb; color:white; border-color:#1d4ed8 }

    .content{ display:grid; gap:16px; margin-top:16px; grid-template-columns: 2fr 1fr; }
    .card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; box-shadow:0 1px 2px rgba(0,0,0,.04) }
    .bio p{ margin:0; white-space:pre-line }
    .details .rows{ display:grid; gap:10px }
    .details .row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap }
    .details .lbl{ color:#6b7280; min-width:160px; font-weight:600 }
    .chip{ padding:2px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#f8fafc; font-size:.85rem; color:#334155 }

    .gallery .grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap:8px }
    .gallery .photo{ width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:8px; border:1px solid #e5e7eb }

    @media (max-width: 768px){
      .hero{ grid-template-columns: 1fr; text-align:center }
      .meta{ justify-items:center }
      .content{ grid-template-columns: 1fr }
    }
  `]
})
export class GuardianProfilePage {
  route = inject(ActivatedRoute);
  private service = inject(GuardiansService);
  private chat = inject(ChatService);
  private reviews = inject(ReviewsService);
  private favorites = inject(FavoritesService);
  private auth = inject(AuthService);
  profile = signal<GuardianProfile | null>(null);
  summary = signal({ avg: 0, count: 0 });
  fromSearch = signal(false);
  busy = signal(false);

  ngOnInit(){
    const id = this.route.snapshot.paramMap.get('id')!;
    const qp = this.route.snapshot.queryParams || {} as any;
    // Consideramos "desde búsqueda" cuando hay rango de fechas (start/end)
    this.fromSearch.set(!!(qp['start'] && qp['end']));
    this.service.getProfile(id).subscribe(p => {
      this.profile.set(p);
      const s = this.reviews.summary(p.id);
      // Bridge: assign reactive summary signal to field
      this.summary = s as any;
    });
    const u = this.auth.user();
    if (u?.role === 'owner') this.favorites.ensureLoaded().subscribe();
  }

  message(guardianUserId: string){
    this.chat.openChat(guardianUserId);
  }

  scrollToReviews(){
    const el = document.getElementById('reviews-block');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  isOwner(){ return this.auth.user()?.role === 'owner'; }
  isFav(guardianId: string){ return this.favorites.isFavorite(guardianId); }
  toggleFav(guardianId: string){
    this.busy.set(true);
    this.favorites.toggle(guardianId).subscribe({
      next: () => this.busy.set(false),
      error: () => { this.busy.set(false); alert('No se pudo actualizar el favorito'); }
    });
  }
}
