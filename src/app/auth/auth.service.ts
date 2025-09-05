import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { User } from '../core/models/user.model';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(null);
  user = this._user;

  private http = inject(HttpClient);
  private api = environment.apiBaseUrl;

  constructor(){
    // Restaurar sesión si existe en sessionStorage
    try {
      const token = sessionStorage.getItem('pethero_token');
      const rawUser = sessionStorage.getItem('pethero_user');
      if (token && rawUser) {
        this._user.set(JSON.parse(rawUser) as User);
      }
    } catch { /* no-op */ }
  }

  // Login real contra backend/mock (json-server): /users?email=..&password=..
  login(email: string, password: string): Observable<User> {
    const params = new HttpParams().set('email', email).set('password', password);
    return this.http.get<User[]>(`${this.api}/users`, { params }).pipe(
      map(users => {
        const user = users[0];
        if (!user) throw new Error('Credenciales inválidas');
        return user;
      }),
      tap(user => this.persistSession(user))
    );
  }

  // Registro: crea el usuario en /users. La creación de Profile se maneja fuera (ProfileService)
  register(payload: { email: string; password: string; role: User['role'] }): Observable<User> {
    const body: User = {
      email: payload.email,
      password: payload.password,
      role: payload.role,
      createdAt: new Date().toISOString(),
    } as User;
    return this.http.post<User>(`${this.api}/users`, body).pipe(
      tap(user => this.persistSession(user))
    );
  }

  // Expone una forma segura de persistir la sesión desde componentes que completen datos
  persistSession(user: User) {
    try {
      sessionStorage.setItem('pethero_token', `mock-${user.id}`);
      sessionStorage.setItem('pethero_user', JSON.stringify(user));
      this._user.set(user);
    } catch { /* no-op */ }
  }

  isLoggedIn(){ return !!this._user(); }

  logout(){
    try {
      sessionStorage.removeItem('pethero_token');
      sessionStorage.removeItem('pethero_user');
    } finally {
      this._user.set(null);
      location.assign('/');
    }
  }
}
