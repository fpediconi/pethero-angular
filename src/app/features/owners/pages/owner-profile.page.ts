import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Profile } from '@shared/models';
import { ProfileService } from '@core/profile';
import { ChatService } from '@app/chat/chat.service';

@Component({
  selector: 'ph-owner-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="profile() as p; else loading">
      <section class="hero">
        <img class="avatar" [src]="p.avatarUrl || 'https://via.placeholder.com/160'" alt="Avatar del dueño">
        <div class="meta">
          <h1 class="name">{{ p.displayName || ('Dueño ' + p.userId) }}</h1>
          <p class="city">{{ p.location || 'Ubicación no informada' }}</p>
          <div class="actions">
            <button class="btn" type="button" (click)="message(String(p.userId))">Mandar mensaje</button>
          </div>
        </div>
      </section>

      <section class="content">
        <article class="card bio">
          <h3>Sobre mí</h3>
          <p>{{ p.bio || 'Este usuario aún no escribió su bio.' }}</p>
        </article>
        <article class="card details">
          <h3>Contacto</h3>
          <div class="rows">
            <div class="row"><span class="lbl">Teléfono</span> <span>{{ p.phone || '-' }}</span></div>
            <div class="row"><span class="lbl">Ubicación</span> <span>{{ p.location || '-' }}</span></div>
          </div>
        </article>
      </section>
    </ng-container>
    <ng-template #loading>
      <div class="card">Cargando perfil…</div>
    </ng-template>
  `,
  styles: [`
    :host { display:block }
    .hero{ background: linear-gradient(135deg,#eef2ff,#ecfeff); border:1px solid #e5e7eb; border-radius:16px; padding:16px; display:grid; grid-template-columns: 120px 1fr; gap:16px; align-items:center }
    .avatar{ width:120px; height:120px; border-radius:12px; object-fit:cover; box-shadow:0 4px 10px rgba(0,0,0,.12) }
    .meta{ display:grid; gap:6px }
    .name{ margin:0; line-height:1.1 }
    .city{ margin:0; color:#6b7280 }
    .actions{ display:flex; gap:10px; margin-top:8px; flex-wrap:wrap }
    .btn{ display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border-radius:10px; border:1px solid #d1d5db; background:#fff; color:#111827; text-decoration:none }
    .content{ display:grid; gap:16px; margin-top:16px; grid-template-columns: 2fr 1fr; }
    .card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; box-shadow:0 1px 2px rgba(0,0,0,.04) }
    .bio p{ margin:0; white-space:pre-line }
    .details .rows{ display:grid; gap:10px }
    .details .row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap }
    .details .lbl{ color:#6b7280; min-width:160px; font-weight:600 }
    @media (max-width: 768px){ .hero{ grid-template-columns: 1fr; text-align:center } .meta{ justify-items:center } .content{ grid-template-columns: 1fr } }
  `]
})
export class OwnerProfilePage {
  private route = inject(ActivatedRoute);
  private profiles = inject(ProfileService);
  private chat = inject(ChatService);

  profile = signal<Profile | null>(null);

  ngOnInit(){
    const id = this.route.snapshot.paramMap.get('id');
    const userId = Number(id);
    if (!Number.isFinite(userId)) return;
    this.profiles.getByUserId(userId).subscribe(list => {
      this.profile.set(list?.[0] || { userId, displayName: `Usuario ${userId}` } as Profile);
    });
  }

  message(ownerUserId: string){
    this.chat.openChat(ownerUserId);
  }
}


