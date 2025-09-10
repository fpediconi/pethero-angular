import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../chat.service';
import { AuthService } from '../../auth/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ph-chat-contacts-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host{ position:fixed; right:8px; top:70px; bottom:52px; z-index:30; }
    .panel{ width:240px; height:100%; background:#fff; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 8px 20px rgba(0,0,0,.06); display:flex; flex-direction:column; overflow:hidden }
    .head{ padding:8px 10px; font-weight:700; background:#f1f5f9; border-bottom:1px solid #e5e7eb; display:flex; align-items:center; justify-content:space-between }
    ul{ margin:0; padding:8px; list-style:none; display:flex; flex-direction:column; gap:6px; overflow:auto }
    li{ display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:10px; cursor:pointer; border:1px solid #e5e7eb }
    li:hover{ background:#f8fafc; border-color:#e5e7eb }
    .dot{ width:8px; height:8px; border-radius:50%; background:#e11d48; margin-left:auto }
    .minbtn{ background:#2563eb; color:#fff; border:none; border-radius:8px; padding:4px 8px; font-size:.85rem; cursor:pointer }
    .bubble{ position:absolute; right:0; bottom:8px; background:#2563eb; color:#fff; border:none; padding:8px 12px; border-radius:999px; box-shadow:0 6px 18px rgba(0,0,0,.2) }
  `],
  template: `
    <ng-container *ngIf="!minimized(); else mini">
      <div class="panel">
        <div class="head">
          <span>Contactos</span>
          <button class="minbtn" (click)="toggleMin()">Minimizar</button>
        </div>
        <ul>
          <li *ngFor="let c of service.contacts()">
            <span (click)="open(c.id)" style="flex:1">{{ service.displayName(c.id) }}</span>
            <a *ngIf="isOwner()" [routerLink]="['/guardians','profile', c.id]" (click)="$event.stopPropagation()" aria-label="Ver perfil">Perfil</a>
            <span class="dot" *ngIf="service.unreadCountFor(c.id)() > 0"></span>
          </li>
          <li *ngIf="service.contacts().length === 0" style="color:#64748b">Sin contactos todavía</li>
        </ul>
      </div>
    </ng-container>
    <ng-template #mini>
      <button class="bubble" (click)="toggleMin()">Contactos</button>
    </ng-template>
  `
})
export class ContactsPanelComponent {
  service = inject(ChatService);
  private auth = inject(AuthService);
  minimized = signal<boolean>(false);
  ngOnInit(){ this.service.preloadNames(); }
  open(id: string){ this.service.openChat(id); }
  isOwner(){ return this.auth.user()?.role === 'owner'; }
  toggleMin(){
    const next = !this.minimized();
    this.minimized.set(next);
    try { localStorage.setItem('pethero_chat_contacts_min', JSON.stringify(next)); } catch {}
  }
  constructor(){
    try { const raw = localStorage.getItem('pethero_chat_contacts_min'); if (raw) this.minimized.set(JSON.parse(raw)); } catch {}
  }
}
