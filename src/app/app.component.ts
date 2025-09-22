import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "@core/auth";
import { AvatarComponent } from "@shared/ui";
import { ChatBarComponent } from "@app/chat/chat-bar/chat-bar.component";
import { ContactsPanelComponent } from "@app/chat/contacts-panel/contacts-panel.component";
import { CurrentProfileService } from "@core/profile";
import { NotificationsService } from "@core/notifications";
import { ChatService } from "@app/chat/chat.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AvatarComponent,
    ChatBarComponent,
    ContactsPanelComponent,
  ],
  templateUrl: "./app.component.html",
})
export class AppComponent implements OnInit {
  auth = inject(AuthService);
  current = inject(CurrentProfileService);
  notifications = inject(NotificationsService);
  chat = inject(ChatService);
  menuOpen = false;
  userMenuOpen = false;
  notifOpen = false;

  displayName() {
    return this.current.profile()?.displayName || this.auth.user()?.email || "";
  }

  isOwner() {
    return this.auth.user()?.role === "owner";
  }
  isGuardian() {
    return this.auth.user()?.role === "guardian";
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }
  toggleNotif() {
    this.notifOpen = !this.notifOpen;
  }
  closeMenus() {
    this.menuOpen = false;
    this.userMenuOpen = false;
  }
  logout() {
    this.auth.logout();
  }

  userNotifications() {
    const u = this.auth.user();
    return u?.id != null ? this.notifications.listFor(String(u.id)) : [];
  }
  unreadCount() {
    return this.userNotifications().filter((n) => !n.read).length;
  }

  ngOnInit(): void {
    const user = this.auth.user();
    if (user?.id) {
      this.current.loadForUser(user.id);
      this.chat.refresh();
    }
  }
}

