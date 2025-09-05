import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GuardiansService } from '../guardians.service';
import { ChatService } from '../../chat/chat.service';
import { GuardianProfile } from '../../shared/models/guardian';

@Component({
  selector: 'ph-guardian-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <ng-container *ngIf="profile() as p">
      <section class="hero">
        <img class="avatar" [src]="p.avatarUrl || (p.photos && p.photos[0]) || 'https://via.placeholder.com/160'" alt="Avatar del guardián">
        <div class="meta">
          <h1 class="name">{{ p.name || ('Guardián ' + p.id) }}</h1>
          <p class="city">{{ p.city || 'Ciudad no informada' }}</p>
          <div class="badges">
            <span class="badge rating">⭐ {{ p.ratingAvg || 0 }}/5 ({{ p.ratingCount || 0 }})</span>
            <span class="badge price">$ {{ p.pricePerNight }} / noche</span>
          </div>
          <div class="actions">
            <a class="btn primary" [routerLink]="['/bookings/request', p.id]"
               [queryParams]="{ start: route.snapshot.queryParams['start'], end: route.snapshot.queryParams['end'], petId: route.snapshot.queryParams['petId'] }">Hacer reserva</a>
            <button class="btn" type="button" (click)="message(p.id)">Mandar mensaje</button>
            <a class="btn" [routerLink]="['/guardians','search']"
               [queryParams]="route.snapshot.queryParams" [queryParamsHandling]="'merge'">Volver a la búsqueda</a>
          </div>
        </div>
      </section>

      <section class="content">
        <article class="card bio">
          <h3>Sobre mí</h3>
          <p>{{ p.bio || 'Este guardián aún no escribió su bio.' }}</p>
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
  profile = signal<GuardianProfile | null>(null);

  ngOnInit(){
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.getProfile(id).subscribe(p => this.profile.set(p));
  }

  message(guardianUserId: string){
    this.chat.openChat(guardianUserId);
  }
}
