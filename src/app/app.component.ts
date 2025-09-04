import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
  <nav>
    <a routerLink="/">Pet Hero</a>
    <a routerLink="/guardians/search">Guardianes</a>
    <a routerLink="/owners/pets">Mis Mascotas</a>
    <a routerLink="/bookings">Reservas</a>
    <span class="spacer"></span>
    <ng-container *ngIf="auth.isLoggedIn(); else loggedOut">
      <span class="badge">{{ auth.user()?.name }}</span>
      <a routerLink="/messages">Mensajes</a>
      <button (click)="logout()">Salir</button>
    </ng-container>
    <ng-template #loggedOut>
      <a routerLink="/auth/login">Ingresar</a>
    </ng-template>
  </nav>
  <div class="container">
    <router-outlet></router-outlet>
  </div>`
})
export class AppComponent {
  auth = inject(AuthService);
  logout(){ this.auth.logout(); }
}