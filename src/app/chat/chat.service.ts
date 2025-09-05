import { Injectable, computed, inject, signal } from '@angular/core';
import { Message } from '../shared/models/message';
import { AuthService } from '../auth/auth.service';
import { GuardiansService } from '../guardians/guardians.service';
import { BookingsService } from '../bookings/bookings.service';
import { ChatContact, ChatThread } from './chat.models';
import { ProfileService } from '../shared/services/profile.service';
import { ApiService } from '../shared/services/api.service';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

function threadId(a: string, b: string){
  return [a, b].sort().join('|');
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private auth = inject(AuthService);
  private guardians = inject(GuardiansService);
  private bookings = inject(BookingsService);
  private profiles = inject(ProfileService);
  private api = inject(ApiService);

  private _messages = signal<Message[]>([]);
  private _threads = signal<ChatThread[]>([]);
  private _openWith = signal<string[]>([]); // array of contact userIds with open windows
  private _error = signal<string | null>(null);
  private _names = signal<Record<string,string>>({});
  private _typingTick = signal(0);

  messages = this._messages;
  threads = this._threads;
  openWith = this._openWith;
  error = this._error;
  names = this._names;
  typingTick = this._typingTick;

  constructor(){
    // Restore from localStorage
    try {
      const rawMsgs = localStorage.getItem('pethero_chat_messages');
      const rawThr  = localStorage.getItem('pethero_chat_threads');
      const rawNames = localStorage.getItem('pethero_chat_names');
      if (rawMsgs) this._messages.set(JSON.parse(rawMsgs));
      if (rawThr)  this._threads.set(JSON.parse(rawThr));
      if (rawNames) this._names.set(JSON.parse(rawNames));
    } catch { /* no-op */ }

    // Ensure threads exist for any existing messages (idempotente)
    this.backfillThreadsFromMessages();

    // Poll for new messages periodically for the logged user
    setInterval(() => {
      // avoid unnecessary calls if no user
      if (this.auth.user()?.id) this.refresh();
    }, 5000);

    // Tick typing freshness (for UI updates)
    setInterval(() => {
      this._typingTick.update(n => (n + 1) % 1_000_000);
    }, 600);
  }

  private persist(){
    try {
      localStorage.setItem('pethero_chat_messages', JSON.stringify(this._messages()));
      localStorage.setItem('pethero_chat_threads', JSON.stringify(this._threads()));
      localStorage.setItem('pethero_chat_names', JSON.stringify(this._names()));
    } catch { /* no-op */ }
  }

  // Load messages involving current user from API
  refresh(){
    const me = this.auth.user();
    if (!me?.id) return;
    const id = String(me.id);
    const q1$ = this.api.get<Message[]>(`/messages`, { fromUserId: id }).pipe(catchError(() => of([] as Message[])));
    const q2$ = this.api.get<Message[]>(`/messages`, { toUserId: id }).pipe(catchError(() => of([] as Message[])));
    forkJoin([q1$, q2$]).pipe(
      map(([a,b]) => [...a, ...b].sort((x,y) => (x.createdAt||'').localeCompare(y.createdAt||'')))
    ).subscribe(list => {
      this._messages.set(list);
      this.backfillThreadsFromMessages();
      this.persist();
      // Preload counterpart names
      const ids = new Set<string>();
      for (const m of list){ ids.add(m.fromUserId); ids.add(m.toUserId); }
      ids.delete(id);
      ids.forEach(i => this.ensureName(i));
    });
  }

  // Computed helpers
  currentUserId = computed(() => String(this.auth.user()?.id || ''));

  conversationsWith = (otherUserId: string) => (
    computed(() => {
      const me = this.currentUserId();
      const tid = threadId(me, otherUserId);
      return this._messages()
        .filter(m => threadId(m.fromUserId, m.toUserId) === tid)
        .sort((a,b) => a.createdAt.localeCompare(b.createdAt));
    })
  );

  unreadCountFor = (otherUserId: string) => (
    computed(() => {
      const me = this.currentUserId();
      return this._messages().filter(m => m.toUserId === me && m.fromUserId === otherUserId && m.status !== 'READ').length;
    })
  );

  // Contacts are derived from bookings and prior threads
  contacts = computed<ChatContact[]>(() => {
    const me = this.auth.user();
    if (!me?.id) return [];
    const myId = String(me.id);

    const set = new Map<string, ChatContact>();
    // From existing threads
    for (const t of this._threads()){
      const other = t.a === myId ? t.b : (t.b === myId ? t.a : null);
      if (other) set.set(other, { id: other, name: this.displayName(other) });
    }
    // From existing messages (resiliencia si no hay thread)
    for (const m of this._messages()){
      if (m.fromUserId === myId) set.set(m.toUserId, { id: m.toUserId, name: this.displayName(m.toUserId) });
      if (m.toUserId === myId) set.set(m.fromUserId, { id: m.fromUserId, name: this.displayName(m.fromUserId) });
    }
    // From bookings interactions
    if (me.role === 'owner'){
      for (const b of this.bookings.listForOwner(myId)){
        set.set(b.guardianId, { id: b.guardianId, name: this.displayName(b.guardianId) });
      }
    } else {
      for (const b of this.bookings.listForGuardian(myId)){
        set.set(b.ownerId, { id: b.ownerId, name: this.displayName(b.ownerId) });
      }
    }
    return Array.from(set.values());
  });

  // Open/close chat windows
  openChat(withUserId: string){
    const me = this.currentUserId();
    if (!me) { this._error.set('Debe iniciar sesión para chatear.'); return; }
    if (!this._openWith().includes(withUserId)){
      this._openWith.set([withUserId, ...this._openWith()]);
    }
    this.ensureName(withUserId);
    this.ensureThread(me, withUserId);
    this.markAsReceived(withUserId); // mark pending as received when opening
  }

  closeChat(withUserId: string){
    this._openWith.set(this._openWith().filter(id => id !== withUserId));
  }

  // Messaging
  send(toUserId: string, body: string){
    const me = this.currentUserId();
    if (!me) { this._error.set('Sesión no válida.'); return; }
    const msg: Message = {
      id: Math.random().toString(36).slice(2),
      fromUserId: me,
      toUserId,
      body: body.trim(),
      createdAt: new Date().toISOString(),
      status: 'SENT'
    };
    // Persist via API (json-server) and update local state
    this.api.post<Message>('/messages', msg).pipe(catchError(() => of(msg))).subscribe(saved => {
      const next = { ...msg, id: saved?.id || msg.id } as Message;
      this._messages.set([...this._messages(), next]);
      this.bumpThread(me, toUserId, toUserId);
      this.persist();
    });
  }

  // Mark received and read
  markAsReceived(fromUserId: string){
    const me = this.currentUserId();
    const updated = this._messages().map(m => {
      if (m.toUserId === me && m.fromUserId === fromUserId && m.status === 'SENT'){
        return { ...m, status: 'RECEIVED' as const };
      }
      return m;
    });
    this._messages.set(updated);
    this.persist();
  }

  markAsRead(withUserId: string){
    const me = this.currentUserId();
    const updated = this._messages().map(m => {
      if (m.toUserId === me && m.fromUserId === withUserId && m.status !== 'READ'){
        return { ...m, status: 'READ' as const };
      }
      return m;
    });
    this._messages.set(updated);
    this.persist();
  }

  private ensureThread(a: string, b: string){
    const id = threadId(a,b);
    if (!this._threads().some(t => t.id === id)){
      const thr: ChatThread = { id, a, b, lastAt: new Date().toISOString() };
      this._threads.set([thr, ...this._threads()]);
      this.persist();
    }
  }

  private bumpThread(a: string, b: string, unreadFor: string){
    const id = threadId(a,b);
    const now = new Date().toISOString();
    const list = this._threads();
    const idx = list.findIndex(t => t.id === id);
    if (idx >= 0){
      const next: ChatThread = { ...list[idx], lastAt: now, unreadFor };
      const reordered = [next, ...list.filter((_,i) => i !== idx)];
      this._threads.set(reordered);
    } else {
      const thr: ChatThread = { id, a, b, lastAt: now, unreadFor };
      this._threads.set([thr, ...list]);
    }
    this.persist();
  }

  // Names handling
  displayName(userId: string){
    return this._names()[userId] || `Usuario ${userId}`;
  }

  ensureName(userId: string){
    if (this._names()[userId]) return;
    const num = Number(userId);
    if (!Number.isFinite(num)) return; // fallback for non-numeric ids
    this.profiles.getByUserId(num).subscribe({
      next: (list) => {
        const name = (list?.[0]?.displayName || '').trim();
        if (name){
          this._names.set({ ...this._names(), [userId]: name });
          this.persist();
        }
      },
      error: () => { /* silent */ }
    });
  }

  preloadNames(){
    const ids = this.contacts().map(c => c.id);
    ids.forEach(id => this.ensureName(id));
  }

  private backfillThreadsFromMessages(){
    const list = this._messages();
    if (!list.length) return;
    const seen = new Set(this._threads().map(t => t.id));
    const add: ChatThread[] = [];
    for (const m of list){
      const id = threadId(m.fromUserId, m.toUserId);
      if (!seen.has(id)){
        add.push({ id, a: [m.fromUserId, m.toUserId].sort()[0], b: [m.fromUserId, m.toUserId].sort()[1], lastAt: m.createdAt });
        seen.add(id);
      }
    }
    if (add.length){
      this._threads.set([...add, ...this._threads()]);
      this.persist();
    }
  }

  // Typing indicator (ephemeral via localStorage)
  private typingKey(to: string, from: string){ return `pethero_typing_to_${to}_from_${from}`; }
  setTyping(toUserId: string){
    const me = this.currentUserId();
    if (!me) return;
    const key = this.typingKey(toUserId, me);
    try { localStorage.setItem(key, String(Date.now() + 1500)); } catch {}
  }
  isTypingFrom(otherUserId: string){
    const me = this.currentUserId();
    if (!me) return false;
    const key = this.typingKey(me, otherUserId);
    try {
      const raw = localStorage.getItem(key);
      const exp = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(exp) && exp > Date.now();
    } catch { return false; }
  }
}
