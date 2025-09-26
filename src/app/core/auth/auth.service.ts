import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '@shared/models';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';

interface AuthSessionResponse {
  token?: string | null;
  accessToken?: string | null;
  user?: User | null;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = environment.apiBaseUrl;

  private readonly tokenKey = 'pethero_token';
  private _user = signal<User | null>(null);
  user = this._user.asReadonly();

  private _token = signal<string | null>(null);
  private inflightSession: Observable<User | null> | null = null;

  constructor() {
    const stored = this.readStoredToken();
    if (stored) {
      this._token.set(stored);
      this.loadSession().subscribe({
        next: () => {},
        error: () => {},
      });
    }
  }

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<AuthSessionResponse>(`${this.api}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          const token = this.extractToken(res);
          this.persistSession(res.user ?? null, token);
        }),
        map((res) => {
          const user = res.user;
          if (!user) {
            throw new Error('Respuesta de autenticacion invalida');
          }
          return user;
        })
      );
  }

  register(payload: { email: string; password: string; role: User['role'] }): Observable<User> {
    return this.http
      .post<AuthSessionResponse>(`${this.api}/auth/register`, payload)
      .pipe(
        tap((res) => {
          const token = this.extractToken(res);
          this.persistSession(res.user ?? null, token);
        }),
        map((res) => {
          const user = res.user;
          if (!user) {
            throw new Error('No se pudo registrar el usuario.');
          }
          return user;
        })
      );
  }

  persistSession(user: User | null, token?: string | null) {
    if (token != null) {
      this.storeToken(token);
    }
    this._user.set(user);
  }

  isLoggedIn() {
    return !!this._user();
  }

  hasToken() {
    return !!this._token();
  }

  token() {
    return this._token();
  }

  loadSession(force = false): Observable<User | null> {
    if (!this.hasToken()) {
      this.clearSession();
      return of(null);
    }

    if (!force) {
      const current = this._user();
      if (current) {
        return of(current);
      }
      if (this.inflightSession) {
        return this.inflightSession;
      }
    }

    const request = this.http
      .get<User | { user?: User | null } | null>(`${this.api}/auth/me`)
      .pipe(
        map((payload) => {
          if (!payload) {
            return null;
          }
          if (typeof payload === 'object' && 'user' in payload) {
            const nested = (payload as { user?: User | null }).user;
            return nested ?? null;
          }
          return payload as User;
        }),
        tap((user) => this.persistSession(user ?? null)),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
        finalize(() => {
          this.inflightSession = null;
        }),
        shareReplay(1)
      );
    this.inflightSession = request;
    return request;
  }

  logout(options: { redirect?: boolean } = {}) {
    const redirect = options.redirect !== false;
    const finish = () => {
      this.clearSession();
      if (redirect && typeof location !== 'undefined') {
        location.assign('/auth/login');
      }
    };

    if (!this.hasToken()) {
      finish();
      return;
    }

    this.http.post(`${this.api}/auth/logout`, {}).pipe(catchError(() => of(null))).subscribe({
      next: () => finish(),
      error: () => finish(),
    });
  }

  updateCurrentUser(patch: Partial<User>) {
    const current = this._user();
    if (!current) {
      return;
    }
    this._user.set({ ...current, ...patch });
  }

  private extractToken(res: AuthSessionResponse): string | null {
    const token = res.token || res.accessToken;
    return token ?? null;
  }

  private clearSession() {
    this.storeToken(null);
    this._user.set(null);
    this.inflightSession = null;
  }

  private readStoredToken(): string | null {
    try {
      return sessionStorage.getItem(this.tokenKey);
    } catch {
      return null;
    }
  }

  private storeToken(token: string | null) {
    this._token.set(token ?? null);
    try {
      if (token) {
        sessionStorage.setItem(this.tokenKey, token);
      } else {
        sessionStorage.removeItem(this.tokenKey);
      }
    } catch {
      /* no-op */
    }
  }
}
