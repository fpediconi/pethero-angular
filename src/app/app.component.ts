import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { AvatarComponent } from './shared/ui/avatar.component';
import { ChatBarComponent } from './chat/chat-bar/chat-bar.component';
import { ContactsPanelComponent } from './chat/contacts-panel/contacts-panel.component';
import { CurrentProfileService } from './shared/services/current-profile.service';
import { NotificationsService } from './shared/services/notifications.service';
import { ChatService } from './chat/chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, AvatarComponent, ChatBarComponent, ContactsPanelComponent],
  template: `
  <header class="site-header">
    <nav class="nav">
      <div class="brand">
        <a class="brand-link" routerLink="/" (click)="closeMenus()">
          <span class="logo" aria-hidden="true">
            <img src="assets/minilogo-pet-hero.png" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:inherit;display:block;" />
          </span>
          <span class="brand-name">PetHero</span>
        </a>
      </div>

      <button class="hamburger" aria-label="Abrir menÃº" [attr.aria-expanded]="menuOpen" (click)="menuOpen = !menuOpen">
        <span></span><span></span><span></span>
      </button>

      <div class="links" [class.open]="menuOpen">
        <a routerLink="/guardians/search" routerLinkActive="active" *ngIf="isOwner()" (click)="closeMenus()">Guardianes</a>
        <a routerLink="/guardian/availability" routerLinkActive="active" *ngIf="isGuardian()" (click)="closeMenus()">Mi disponibilidad</a>
        <a routerLink="/home" routerLinkActive="active" *ngIf="auth.isLoggedIn()" (click)="closeMenus()">Home</a>
        <a routerLink="/owners/pets" routerLinkActive="active" *ngIf="isOwner()" (click)="closeMenus()">Mis Mascotas</a>
        <a routerLink="/owners/favorites" routerLinkActive="active" *ngIf="isOwner()" (click)="closeMenus()">Mis favoritos</a>
        <a routerLink="/bookings" routerLinkActive="active" *ngIf="auth.isLoggedIn()" (click)="closeMenus()">Reservas</a>
      </div>

      <div class="actions">
        <ng-container *ngIf="auth.isLoggedIn(); else loggedOut">
          <div class="notify" [class.open]="notifOpen">
            <button class="icon-btn" aria-label="Notificaciones" (click)="toggleNotif()">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2m6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1z"/></svg>
              <span class="dot" *ngIf="unreadCount() > 0"></span>
            </button>
            <div class="dropdown" *ngIf="notifOpen">
              <div class="dropdown-title">Notificaciones</div>
              <div *ngIf="userNotifications().length === 0" class="empty">Sin notificaciones</div>
              <ul>
                <li *ngFor="let n of userNotifications()">{{ n.message }} â€” {{ n.createdAt | date:'short' }}</li>
              </ul>
            </div>
          </div>
          <div class="user" [class.open]="userMenuOpen">
            <button class="user-btn" (click)="toggleUserMenu()" [attr.aria-expanded]="userMenuOpen" aria-haspopup="menu">
              <app-avatar [src]="current.profile()?.avatarUrl || ''" [name]="displayName()" size="sm"></app-avatar>
              <span class="user-name">{{ auth.user()?.email }}</span>
              <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
            </button>
            <div class="dropdown" *ngIf="userMenuOpen" role="menu">
              <a routerLink="/me/profile" (click)="closeMenus()" role="menuitem">Mi perfil</a>
              <button (click)="logout()" role="menuitem" class="linklike">Salir</button>
            </div>
          </div>
        </ng-container>
        <ng-template #loggedOut>
          <a class="btn" routerLink="/auth/login" (click)="closeMenus()">Ingresar</a>
        </ng-template>
      </div>
    </nav>
  </header>

  <main class="container">
    <router-outlet></router-outlet>
  </main>

  <ph-chat-contacts-panel *ngIf="auth.isLoggedIn()"></ph-chat-contacts-panel>
  <ph-chat-bar *ngIf="auth.isLoggedIn()"></ph-chat-bar>
  `
})
export class AppComponent implements OnInit {
  auth = inject(AuthService);
  current = inject(CurrentProfileService);
  notifications = inject(NotificationsService);
  chat = inject(ChatService);
  menuOpen = false;
  userMenuOpen = false;
  notifOpen = false;

  displayName(){
    return this.current.profile()?.displayName || this.auth.user()?.email || '';
  }

  isOwner(){ return this.auth.user()?.role === 'owner'; }
  isGuardian(){ return this.auth.user()?.role === 'guardian'; }

  toggleUserMenu(){ this.userMenuOpen = !this.userMenuOpen; }
  toggleNotif(){ this.notifOpen = !this.notifOpen; }
  closeMenus(){ this.menuOpen = false; this.userMenuOpen = false; }
  logout(){ this.auth.logout(); }

  userNotifications(){
    const u = this.auth.user();
    return u?.id != null ? this.notifications.listFor(String(u.id)) : [];
  }
  unreadCount(){ return this.userNotifications().filter(n => !n.read).length; }

  ngOnInit(): void {
    const user = this.auth.user();
    if (user?.id) {
      this.current.loadForUser(user.id);
      this.chat.refresh();
    }
  }
}
