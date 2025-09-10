import { Injectable, WritableSignal, computed, inject, signal } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { Review } from '../shared/models/review';
import { AuthService } from '../auth/auth.service';
import { BookingsService } from '../bookings/bookings.service';
import { map, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

export interface ReviewSummary { avg: number; count: number; breakdown?: Record<number, number>; }

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private bookings = inject(BookingsService);

  // Cache reactivo por guardianId
  private reviewsCache = new Map<string, WritableSignal<Review[]>>();
  private summaryCache = new Map<string, WritableSignal<ReviewSummary>>();

  list(guardianId: string): Observable<Review[]> {
    return this.api.get<Review[]>('/reviews', { guardianId }).pipe(
      map(list => list || [])
    );
  }

  /** Carga y memoiza reseñas para el guardián. */
  reviewsSignal(guardianId: string): WritableSignal<Review[]> {
    if (!this.reviewsCache.has(guardianId)) {
      const sig = signal<Review[]>([]);
      this.reviewsCache.set(guardianId, sig);
      this.refresh(guardianId).subscribe();
    }
    return this.reviewsCache.get(guardianId)!;
  }

  /** Fuerza recarga desde API y actualiza sumarios. */
  refresh(guardianId: string): Observable<Review[]> {
    return this.list(guardianId).pipe(
      tap(list => {
        const rSig = this.reviewsSignal(guardianId);
        rSig.set(list);
        this.computeAndSetSummary(guardianId, list);
      })
    );
  }

  /** Crea reseña (previene duplicados por bookingId en el cliente). */
  create(review: Partial<Review>): Observable<Review> {
    const user = this.auth.user();
    if (!user) throw new Error('Debe iniciar sesión.');

    if (!review.guardianId || !review.ownerId || !review.bookingId || !review.rating) {
      throw new Error('Datos incompletos de la reseña.');
    }

    // Verificar duplicado por bookingId (cliente)
    const existing = this.reviewsSignal(review.guardianId)()
      .some((r: Review) => r.bookingId === review.bookingId);
    if (existing) {
      throw new Error('Ya existe una reseña para esa reserva.');
    }

    const body: Partial<Review> = {
      ...review,
      createdAt: new Date().toISOString(),
    };
    return this.api.post<Review>('/reviews', body).pipe(
      tap(r => {
        const list = [r, ...this.reviewsSignal(r.guardianId)()];
        this.reviewsSignal(r.guardianId).set(list);
        this.computeAndSetSummary(r.guardianId, list);
      })
    );
  }

  update(id: string, patch: Partial<Review>): Observable<Review> {
    return this.api.put<Review>(`/reviews/${id}`, patch).pipe(
      tap(r => {
        const arr = this.reviewsSignal(r.guardianId)().map((x: Review) => x.id === id ? { ...x, ...r } : x);
        this.reviewsSignal(r.guardianId).set(arr);
        this.computeAndSetSummary(r.guardianId, arr);
      })
    );
  }

  delete(r: Review): Observable<void> {
    return this.api.delete<void>(`/reviews/${r.id}`).pipe(
      tap(() => {
        const arr = this.reviewsSignal(r.guardianId)().filter((x: Review) => x.id !== r.id);
        this.reviewsSignal(r.guardianId).set(arr);
        this.computeAndSetSummary(r.guardianId, arr);
      })
    );
  }

  /** Resumen memoizado por guardián. */
  summary(guardianId: string): WritableSignal<ReviewSummary> {
    if (!this.summaryCache.has(guardianId)) {
      const sig = signal<ReviewSummary>({ avg: 0, count: 0 });
      this.summaryCache.set(guardianId, sig);
      // Inicializar basado en reseñas si ya existen
      const existing = this.reviewsCache.get(guardianId)?.() || [];
      this.computeAndSetSummary(guardianId, existing);
      // Cargar desde API si aún no se cargó
      if (!this.reviewsCache.has(guardianId)) this.refresh(guardianId).subscribe();
    }
    return this.summaryCache.get(guardianId)!;
  }

  private computeAndSetSummary(guardianId: string, reviews: Review[]) {
    const count = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = count ? Math.round((sum / count) * 10) / 10 : 0;
    const breakdown: Record<number, number> = { 1:0,2:0,3:0,4:0,5:0 };
    for (const r of reviews) breakdown[r.rating as 1|2|3|4|5] = (breakdown[r.rating as 1|2|3|4|5] || 0) + 1;
    const s = { avg, count, breakdown };
    this.summaryCache.get(guardianId)?.set(s);
  }

  /** Verifica si el usuario actual (OWNER) puede reseñar al guardian. */
  canCurrentUserReview(guardianId: string, reviews?: Review[]): { allowed: boolean; pendingBookings: string[] } {
    const user = this.auth.user();
    if (!user || user.role !== 'owner' || user.id == null) return { allowed: false, pendingBookings: [] };
    const ownerId = String(user.id);
    const completed = this.bookings.listForOwner(ownerId).filter(b => b.guardianId === guardianId && b.status === 'COMPLETED');
    const existing = (reviews ?? this.reviewsSignal(guardianId)()).map(r => r.bookingId);
    const pend = completed.map(b => b.id).filter(id => !existing.includes(id));
    return { allowed: pend.length > 0, pendingBookings: pend };
  }
}
