import { Injectable, signal } from '@angular/core';
import { User } from '../shared/models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(null);
  user = this._user;

  login(email: string, _password: string){
    const fakeUser: User = { id: 'u1', role: 'OWNER', name: 'Fran', email, favorites: [] };
    sessionStorage.setItem('pethero_token', 'mocktoken');
    this._user.set(fakeUser);
  }
  registerOwner(name: string, email: string){ this.login(email, ''); }
  registerGuardian(name: string, email: string){ this.login(email, ''); }
  isLoggedIn(){ return !!this._user(); }
  logout(){ sessionStorage.removeItem('pethero_token'); this._user.set(null); location.assign('/'); }
}