import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewsService } from './reviews.service';
import { Review } from '../shared/models/review';
import { RatingComponent } from '../shared/ui/rating.component';
import { AvatarComponent } from '../shared/ui/avatar.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { formatRelative } from '../shared/utils/date.util';

@Component({
  selector: 'ph-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RatingComponent, AvatarComponent],
  template: `
    <section class="card reviews">
      <header class="head">
        <h2 id="reviews-title">Reseñas</h2>
        <div class="summary" *ngIf="summary() as s">
          <ph-rating [value]="s.avg" [readonly]="true" [showValue]="true" ariaLabel="Promedio de calificación"></ph-rating>
          <span class="count">({{ s.count }} reseñas)</span>
          <button class="btn link" type="button" (click)="toggleForm()" *ngIf="canReview().allowed">Escribir reseña</button>
        </div>
      </header>

      <form *ngIf="formOpen()" class="review-form" (ngSubmit)="submit()" aria-labelledby="reviews-title">
        <label class="row">
          <span class="lbl">Tu calificación</span>
          <ph-rating [(value)]="form.rating" ariaLabel="Seleccionar calificación" [showValue]="true"></ph-rating>
        </label>
        <label class="row">
          <span class="lbl">Reserva</span>
          <select [(ngModel)]="form.bookingId" name="bookingId" required>
            <option value="" disabled selected>Elegí la reserva</option>
            <option *ngFor="let id of canReview().pendingBookings" [value]="id">{{ id }}</option>
          </select>
        </label>
        <label class="row">
          <span class="lbl">Comentario</span>
          <textarea [(ngModel)]="form.comment" name="comment" rows="3" placeholder="¿Cómo fue tu experiencia?" maxlength="600"></textarea>
        </label>
        <div class="actions">
          <button class="btn" type="button" (click)="toggleForm()">Cancelar</button>
          <button class="btn primary" type="submit" [disabled]="!formValid()">Publicar</button>
        </div>
        <p class="muted">Puedes editar o borrar tu reseña durante 15 minutos.</p>
        <p class="error" *ngIf="error()">{{ error() }}</p>
      </form>

      <ul class="list">
        <li *ngFor="let r of pagedReviews()" class="item">
          <div class="meta">
            <app-avatar size="sm" [src]="ownerAvatar(r.ownerId)" [name]="'Owner ' + r.ownerId"></app-avatar>
            <ph-rating [value]="r.rating" [readonly]="true" ariaLabel="Calificación"></ph-rating>
            <span class="time">{{ rel(r.createdAt) }}</span>
          </div>
          <p class="comment" *ngIf="r.comment">{{ r.comment }}</p>
          <div class="row actions" *ngIf="editable(r)">
            <button class="btn link" type="button" (click)="startEdit(r)">Editar</button>
            <button class="btn link danger" type="button" (click)="remove(r)">Borrar</button>
          </div>
        </li>
      </ul>
      <div class="more" *ngIf="hasMore()">
        <button class="btn" type="button" (click)="loadMore()">Ver más</button>
      </div>
    </section>
  `,
  styles: [`
    :host{ display:block }
    .card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; box-shadow:0 1px 2px rgba(0,0,0,.04) }
    .reviews{ background:#fff !important; color:#111827 }
    .head{ display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap }
    .summary{ display:flex; align-items:center; gap:10px }
    .count{ color:#6b7280 }
    .review-form{ display:grid; gap:10px; margin-top:10px }
    .row{ display:grid; gap:6px }
    .lbl{ font-weight:600; color:#374151 }
    textarea, select{ padding:8px 10px; border:1px solid #d1d5db; border-radius:8px; font:inherit; background:#fff }
    .btn{ display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:10px; border:1px solid #d1d5db; background:#fff; color:#111827; text-decoration:none; cursor:pointer }
    .btn.primary{ background:#2563eb; color:#fff; border-color:#1d4ed8 }
    .btn.link{ background:transparent; border:none; color:#2563eb; padding:0 }
    .btn.link.danger{ color:#b91c1c }
    .muted{ color:#6b7280 }
    .error{ color:#b91c1c }
    .list{ list-style:none; padding:0; margin:12px 0 0; display:grid; gap:14px }
    .item{ border-top:1px solid #e5e7eb; padding-top:12px }
    .item:first-child{ border-top:none; padding-top:0 }
    .meta{ display:flex; align-items:center; gap:8px; color:#6b7280 }
    .comment{ margin:8px 0 0 }
    .more{ display:flex; justify-content:center; margin-top:12px }
    /* Fuerza estilo claro en reseñas para mejor legibilidad */
    @media (prefers-color-scheme: dark){ .reviews{ background:#fff !important; color:#111827 } }
  `]
})
export class ReviewsPage implements OnInit {
  private reviews = inject(ReviewsService);
  private auth = inject(AuthService);

  @Input() guardianId!: string;

  pageSize = 5;
  page = signal(1);
  error = signal<string | null>(null);
  formOpen = signal(false);
  form: { rating: number; comment: string; bookingId: string } = { rating: 0, comment: '', bookingId: '' };

  items = computed(() => this.reviews.reviewsSignal(this.guardianId)());
  summary = computed(() => this.reviews.summary(this.guardianId)());
  canReview = computed(() => this.reviews.canCurrentUserReview(this.guardianId, this.items()));
  pagedReviews = computed(() => this.items().slice(0, this.page() * this.pageSize));
  hasMore = computed(() => this.items().length > this.pagedReviews().length);

  ngOnInit(){
    if (!this.guardianId) {
      // Fallback si se usara vía ruta separada (no requerido por ahora)
    }
    this.reviews.refresh(this.guardianId).subscribe();
  }

  toggleForm(){
    this.formOpen.set(!this.formOpen());
    this.error.set(null);
    if (this.formOpen()) this.form = { rating: 0, comment: '', bookingId: '' };
  }

  formValid(){
    return this.form.rating >= 1 && this.form.rating <= 5 && !!this.form.bookingId;
  }

  submit(){
    this.error.set(null);
    const user = this.auth.user();
    if (!user || user.id == null) { this.error.set('Debes iniciar sesión.'); return; }
    const can = this.canReview();
    if (!can.allowed) { this.error.set('No puedes reseñar este perfil.'); return; }
    if (!can.pendingBookings.includes(this.form.bookingId)) { this.error.set('La reserva seleccionada no es válida.'); return; }

    const payload: Partial<Review> = {
      guardianId: this.guardianId,
      ownerId: String(user.id),
      bookingId: this.form.bookingId,
      rating: this.form.rating,
      comment: this.form.comment?.trim() || undefined,
    };
    this.reviews.create(payload).subscribe({
      next: () => { this.toggleForm(); this.page.set(1); },
      error: (e) => this.error.set(String(e?.message || e))
    });
  }

  loadMore(){ this.page.set(this.page() + 1); }

  rel(d: string){ return formatRelative(d); }
  ownerAvatar(ownerId: string){ return ''; /* Integrable a perfiles si existe */ }

  editable(r: Review){
    const user = this.auth.user();
    if (!user || user.id == null) return false;
    const isAuthor = String(user.id) === r.ownerId;
    if (!isAuthor) return false;
    const created = new Date(r.createdAt).getTime();
    return (Date.now() - created) <= 15 * 60 * 1000; // 15 minutos
  }

  startEdit(r: Review){
    // Edición mínima: reabrir form con datos (mantener bookingId bloqueado)
    this.formOpen.set(true);
    this.form = { rating: r.rating, comment: r.comment || '', bookingId: r.bookingId };
    // Guardado como update no implementado desde formulario por simplicidad.
  }

  remove(r: Review){
    if (!this.editable(r)) return;
    this.reviews.delete(r).subscribe();
  }
}
