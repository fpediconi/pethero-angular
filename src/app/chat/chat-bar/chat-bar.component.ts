import { Component, ElementRef, ViewChildren, QueryList, inject, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ChatService } from '../chat.service';

@Component({
  selector: 'ph-chat-bar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styles: [`
    :host{ position:fixed; left:0; right:0; bottom:0; z-index:40; pointer-events:none }
    .bar{ pointer-events:all; background:#f5f7fb; border-top:1px solid #dfe6ee; padding:6px 10px; display:flex; gap:8px; align-items:center }
    .tab{ background:#fff; border:1px solid #cfd8e3; border-bottom-width:2px; padding:6px 10px; border-radius:10px; display:flex; align-items:center; gap:8px; cursor:pointer }
    .tab .dot{ width:8px; height:8px; border-radius:50%; background:#e11d48 }
    .tab .name{ max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
    .windows{ position:fixed; left:0; bottom:72px; pointer-events:all; z-index:41 }
    .window{ position:absolute; bottom:0; width:300px; background:#fff; border:1px solid #cfd8e3; border-radius:12px; box-shadow:0 10px 24px rgba(0,0,0,.12); overflow:visible; display:flex; flex-direction:column; z-index:42; box-sizing:border-box }
    .win-head{ background:#e7eef7; color:#1f2a37; padding:8px 10px; font-weight:700; display:flex; align-items:center; justify-content:space-between }
    .msgs{ padding:8px; display:flex; flex-direction:column; gap:6px; max-height:240px; overflow:auto; background:#f9fbfe; box-sizing:border-box }
    .msg{ max-width:80%; padding:6px 10px; border-radius:12px; }
    .me{ align-self:flex-end; background:#dbeafe; border:1px solid #bfdbfe }
    .other{ align-self:flex-start; background:#f3f4f6; border:1px solid #e5e7eb }
    form{ display:flex; gap:6px; padding:8px; border-top:1px solid #e5e7eb; background:#fff; border-bottom-left-radius:12px; border-bottom-right-radius:12px; box-sizing:border-box }
    input{ flex:1; min-width:0; padding:8px 10px; border:1px solid #cfd8e3; border-radius:8px; box-sizing:border-box }
    button{ padding:8px 10px; border-radius:8px; background:#2563eb; color:#fff; border:none; white-space:nowrap; box-sizing:border-box }
    .typing{ color:#6b7280; font-size:.85rem; padding:0 10px 6px }
  `],
  template: `
    <div class="bar">
      <div class="tab" *ngFor="let id of service.openWith()" #tabEl [attr.data-id]="id" (click)="toggleWindow(id)">
        <span class="name">{{ service.displayName(id) }}</span>
        <span class="dot" *ngIf="service.unreadCountFor(id)() > 0"></span>
        <button (click)="close(id); $event.stopPropagation()" class="linklike" aria-label="Cerrar">×</button>
      </div>
    </div>

    <div class="windows">
      <div class="window" *ngFor="let id of windowIds()" [style.left.px]="tabLeft(id)">
        <div class="win-head">
          <span>Chat con {{ service.displayName(id) }}</span>
          <button class="linklike" (click)="close(id)">×</button>
        </div>
        <div class="msgs" #msgsEl [attr.data-id]="id" (mouseenter)="markRead(id)">
          <div *ngFor="let m of service.conversationsWith(id)()" [class]="'msg ' + (m.fromUserId === me() ? 'me' : 'other')">
            {{ m.body }}
          </div>
        </div>
        <div class="typing" *ngIf="isTyping(id)">Escribiendo…</div>
        <form [formGroup]="forms[id]" (ngSubmit)="send(id)">
          <input placeholder="Escribe un mensaje" formControlName="body" (input)="onTyping(id)" />
          <button [disabled]="forms[id].invalid">Enviar</button>
        </form>
      </div>
    </div>
  `
})
export class ChatBarComponent implements AfterViewInit {
  service = inject(ChatService);
  fb = inject(FormBuilder);
  me = this.service.currentUserId;

  // track which windows are expanded (subset of openWith)
  openWindows = signal<string[]>([]);
  forms: Record<string, ReturnType<FormBuilder['group']>> = {} as any;
  @ViewChildren('tabEl') tabEls!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('msgsEl') msgsEls!: QueryList<ElementRef<HTMLElement>>;
  positions = signal<Record<string, number>>({});

  windowIds = signal<string[]>([]);
  typingTick = this.service.typingTick;

  toggleWindow(id: string){
    const set = new Set(this.openWindows());
    if (set.has(id)) set.delete(id); else set.add(id);
    this.openWindows.set(Array.from(set));
    if (!this.forms[id]) this.forms[id] = this.fb.group({ body: ['', Validators.required] });
    this.updateWindowIds();
    setTimeout(() => this.scrollBottom(id));
  }

  close(id: string){
    this.service.closeChat(id);
    this.openWindows.set(this.openWindows().filter(x => x !== id));
    this.updateWindowIds();
  }

  send(id: string){
    const v = this.forms[id].value as any;
    if (!v?.body) return;
    this.service.send(id, v.body);
    this.forms[id].reset();
    setTimeout(() => this.scrollBottom(id));
  }

  markRead(id: string){
    this.service.markAsRead(id);
  }

  ngAfterViewInit(): void {
    const refresh = () => this.updateTabPositions();
    this.tabEls.changes.subscribe(refresh);
    setTimeout(refresh);
    window.addEventListener('resize', refresh);
    // Scroll when message containers render
    const refreshScroll = () => this.windowIds().forEach(id => this.scrollBottom(id));
    this.msgsEls.changes.subscribe(() => setTimeout(refreshScroll));
  }

  private updateTabPositions(){
    const map: Record<string, number> = {};
    const arr = this.tabEls?.toArray() || [];
    for (const elRef of arr){
      const el = elRef.nativeElement as HTMLElement;
      const id = el.getAttribute('data-id') || '';
      if (!id) continue;
      const rect = el.getBoundingClientRect();
      map[id] = Math.max(8, rect.left + window.scrollX);
    }
    this.positions.set(map);
  }

  tabLeft(id: string){
    const pos = this.positions()[id];
    if (Number.isFinite(pos)) return pos as number;
    const idx = Math.max(0, this.service.openWith().indexOf(id));
    return 12 + idx * 160; // fallback spacing
  }

  private updateWindowIds(){
    const order = this.service.openWith();
    const active = new Set(this.openWindows());
    this.windowIds.set(order.filter(id => active.has(id)));
  }

  private findMsgsEl(id: string){
    const arr = this.msgsEls?.toArray() || [];
    for (const ref of arr){
      const el = ref.nativeElement as HTMLElement;
      if (el.getAttribute('data-id') === id) return el;
    }
    return null;
  }

  private scrollBottom(id: string){
    const el = this.findMsgsEl(id);
    if (!el) return;
    el.scrollTop = el.scrollHeight + 1000;
  }

  onTyping(id: string){ this.service.setTyping(id); }
  isTyping(id: string){ void this.typingTick(); return this.service.isTypingFrom(id); }
}
