import { Injectable, signal } from '@angular/core';
import { NotificationItem } from '../models/notification';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private _items = signal<NotificationItem[]>([]);
  items = this._items;

  constructor(){
    try {
      const raw = localStorage.getItem('pethero_notifications');
      if (raw) this._items.set(JSON.parse(raw));
    } catch { /* no-op */ }
  }

  private persist(){
    try { localStorage.setItem('pethero_notifications', JSON.stringify(this._items())); } catch {}
  }

  notify(userId: string | number, message: string){
    const item: NotificationItem = {
      id: Math.random().toString(36).slice(2),
      userId,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    };
    this._items.set([item, ...this._items()]);
    this.persist();
  }

  listFor(userId: string | number){ return this._items().filter(i => String(i.userId) === String(userId)); }
}

