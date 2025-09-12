import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Favorite } from '../models/favorite';
import { AuthService } from '../../auth/auth.service';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  // Cache del listado del owner actual
  private _favorites = signal<Favorite[] | null>(null);
  favoritesSig = this._favorites;
  favorites$ = computed(() => this._favorites() || []);

  private ownerKey(): string {
    const u = this.auth.user();
    if (!u) throw new Error('Debe iniciar sesión');
    if (u.role !== 'owner') throw new Error('Función disponible para dueños (Owners)');
    if (u.id == null) throw new Error('Usuario inválido');
    // En el mock, ownerId se guarda como string tipo "u1"
    return `u${u.id}`;
  }

  ensureLoaded(): Observable<Favorite[]> {
    try {
      const ownerId = this.ownerKey();
      if (this._favorites() !== null) return of(this._favorites()!);
      return this.listByOwner(ownerId).pipe(
        tap(list => this._favorites.set(list || []))
      );
    } catch (e) {
      return throwError(() => e);
    }
  }

  listByOwner(ownerId: string): Observable<Favorite[]> {
    return this.api.get<Favorite[]>('/favorites', { ownerId });
  }

  find(ownerId: string, guardianId: string): Observable<Favorite | null> {
    return this.api.get<Favorite[]>('/favorites', { ownerId, guardianId }).pipe(
      map(arr => (arr && arr.length ? arr[0] : null))
    );
  }

  add(ownerId: string, guardianId: string): Observable<Favorite> {
    const body: Favorite = {
      id: (crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2),
      ownerId,
      guardianId,
      createdAt: new Date().toISOString(),
    };
    return this.api.post<Favorite>('/favorites', body);
  }

  remove(favoriteId: string): Observable<void> {
    return this.api.delete<void>(`/favorites/${favoriteId}`);
  }

  // Atajo para vistas: devuelve si un guardian está en favoritos segun la cache actual
  isFavorite(guardianId: string): boolean {
    const list = this._favorites();
    if (!Array.isArray(list)) return false;
    return list.some(f => String(f.guardianId) === String(guardianId));
  }

  toggle(guardianId: string): Observable<{ isFavorite: boolean; favorite?: Favorite }> {
    try {
      const ownerId = this.ownerKey();
      const prev = this._favorites();
      // Asegurar cache inicial
      const base$ = prev === null ? this.listByOwner(ownerId).pipe(tap(list => this._favorites.set(list || []))) : of(prev);
      return base$.pipe(
        switchMap(() => this.find(ownerId, guardianId)),
        switchMap((existing) => {
          if (existing) {
            // Optimista: eliminar
            const before = this._favorites() || [];
            this._favorites.set(before.filter(f => f.id !== existing.id));
            return this.remove(existing.id).pipe(
              map(() => ({ isFavorite: false } as const)),
              catchError(err => {
                // Revertir en caso de error
                this._favorites.set(before);
                return throwError(() => err);
              })
            );
          } else {
            // Optimista: agregar
            const before = this._favorites() || [];
            const optimistic: Favorite = {
              id: `tmp-${Math.random().toString(36).slice(2)}`,
              ownerId,
              guardianId,
              createdAt: new Date().toISOString(),
            };
            this._favorites.set([optimistic, ...before]);
            return this.add(ownerId, guardianId).pipe(
              map((fav) => {
                // Reconciliar: reemplazar optimistic por real
                this._favorites.update(list => [fav, ...(list || []).filter(f => f.id !== optimistic.id)]);
                return { isFavorite: true, favorite: fav } as const;
              }),
              catchError(err => {
                this._favorites.set(before);
                return throwError(() => err);
              })
            );
          }
        })
      );
    } catch (e) {
      return throwError(() => e);
    }
  }
}

