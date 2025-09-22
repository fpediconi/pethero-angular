import {
  Component,
  ElementRef,
  ViewChildren,
  QueryList,
  inject,
  signal,
  AfterViewInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { ChatService } from "@app/chat/chat.service";

@Component({
  selector: "ph-chat-bar",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styleUrls: ["./chat-bar.component.css"],
  templateUrl: "./chat-bar.component.html",
})
export class ChatBarComponent implements AfterViewInit {
  service = inject(ChatService);
  fb = inject(FormBuilder);
  me = this.service.currentUserId;

  // track which windows are expanded (subset of openWith)
  openWindows = signal<string[]>([]);
  forms: Record<string, ReturnType<FormBuilder["group"]>> = {} as any;
  @ViewChildren("tabEl") tabEls!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren("msgsEl") msgsEls!: QueryList<ElementRef<HTMLElement>>;
  positions = signal<Record<string, number>>({});

  windowIds = signal<string[]>([]);
  typingTick = this.service.typingTick;

  toggleWindow(id: string) {
    const set = new Set(this.openWindows());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.openWindows.set(Array.from(set));
    if (!this.forms[id])
      this.forms[id] = this.fb.group({ body: ["", Validators.required] });
    this.updateWindowIds();
    setTimeout(() => this.scrollBottom(id));
  }

  close(id: string) {
    this.service.closeChat(id);
    this.openWindows.set(this.openWindows().filter((x) => x !== id));
    this.updateWindowIds();
  }

  send(id: string) {
    const v = this.forms[id].value as any;
    if (!v?.body) return;
    this.service.send(id, v.body);
    this.forms[id].reset();
    setTimeout(() => this.scrollBottom(id));
  }

  markRead(id: string) {
    this.service.markAsRead(id);
  }

  ngAfterViewInit(): void {
    const refresh = () => this.updateTabPositions();
    this.tabEls.changes.subscribe(refresh);
    setTimeout(refresh);
    window.addEventListener("resize", refresh);
    // Scroll when message containers render
    const refreshScroll = () =>
      this.windowIds().forEach((id) => this.scrollBottom(id));
    this.msgsEls.changes.subscribe(() => setTimeout(refreshScroll));
  }

  private updateTabPositions() {
    const map: Record<string, number> = {};
    const arr = this.tabEls?.toArray() || [];
    for (const elRef of arr) {
      const el = elRef.nativeElement as HTMLElement;
      const id = el.getAttribute("data-id") || "";
      if (!id) continue;
      const rect = el.getBoundingClientRect();
      map[id] = Math.max(8, rect.left + window.scrollX);
    }
    this.positions.set(map);
  }

  tabLeft(id: string) {
    const pos = this.positions()[id];
    if (Number.isFinite(pos)) return pos as number;
    const idx = Math.max(0, this.service.openWith().indexOf(id));
    return 12 + idx * 160; // fallback spacing
  }

  private updateWindowIds() {
    const order = this.service.openWith();
    const active = new Set(this.openWindows());
    this.windowIds.set(order.filter((id) => active.has(id)));
  }

  private findMsgsEl(id: string) {
    const arr = this.msgsEls?.toArray() || [];
    for (const ref of arr) {
      const el = ref.nativeElement as HTMLElement;
      if (el.getAttribute("data-id") === id) return el;
    }
    return null;
  }

  private scrollBottom(id: string) {
    const el = this.findMsgsEl(id);
    if (!el) return;
    el.scrollTop = el.scrollHeight + 1000;
  }

  onTyping(id: string) {
    this.service.setTyping(id);
  }
  isTyping(id: string) {
    void this.typingTick();
    return this.service.isTypingFrom(id);
  }
}

