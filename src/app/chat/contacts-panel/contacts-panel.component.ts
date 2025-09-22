import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ChatService } from "@app/chat/chat.service";
import { AuthService } from "@core/auth";
import { RouterLink } from "@angular/router";

@Component({
  selector: "ph-chat-contacts-panel",
  standalone: true,
  imports: [CommonModule, RouterLink],
  styleUrls: ["./contacts-panel.component.css"],
  templateUrl: "./contacts-panel.component.html",
})
export class ContactsPanelComponent {
  service = inject(ChatService);
  private auth = inject(AuthService);
  minimized = signal<boolean>(false);
  ngOnInit() {
    this.service.preloadNames();
  }
  open(id: string) {
    this.service.openChat(id);
  }
  isOwner() {
    return this.auth.user()?.role === "owner";
  }
  toggleMin() {
    const next = !this.minimized();
    this.minimized.set(next);
    try {
      localStorage.setItem("pethero_chat_contacts_min", JSON.stringify(next));
    } catch {}
  }
  constructor() {
    try {
      const raw = localStorage.getItem("pethero_chat_contacts_min");
      if (raw) this.minimized.set(JSON.parse(raw));
    } catch {}
  }
}

