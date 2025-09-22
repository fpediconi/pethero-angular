import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth';
import { CurrentProfileService } from '@core/profile';
import { NotificationsService } from '@core/notifications';
import { BookingsService } from '@features/bookings/services';
import { PetsService } from '@features/pets/services';
import { ReviewsService } from '@features/reviews/services';
import { AvailabilityService } from '@features/guardians/services';
import { ChatService } from '@app/chat/chat.service';
import { Booking } from '@features/bookings/models';
import { ApiService } from '@core/http';
import { AvatarComponent } from '@shared/ui';

@Component({
  standalone: true,
  selector: 'ph-home-page',
  imports: [CommonModule, RouterLink, AvatarComponent],
  templateUrl: "./home.page.html",
  styleUrls: ["./home.page.css"],
})
export class HomePageComponent {
  auth = inject(AuthService);
  current = inject(CurrentProfileService);
  notifications = inject(NotificationsService);
  bookings = inject(BookingsService);
  pets = inject(PetsService);
  reviews = inject(ReviewsService);
  availability = inject(AvailabilityService);
  chat = inject(ChatService);
  api = inject(ApiService);

  user = computed(() => this.auth.user());
  profile = computed(() => this.current.profile());

  avatarUrl = computed(() => {
    const u = this.user();
    const url = (this.current.profile()?.avatarUrl || '').trim();
    if (url) return url;
    const id = u?.id ? String(u.id) : 'guest';
    return `https://i.pravatar.cc/120?u=${id}`;
  });

  // Greeting
  greet = signal('Hola');

  // Owner state
  petsCount = signal(0);
  ownerPendingPay = signal(0);
  nextOwnerBooking = signal<string | null>(null);

  // Guardian state
  guardianCompleted = signal(0);
  guardianEarnings = signal(0);
  ratingAvg = signal(0);
  ratingCount = signal(0);
  nextAvailability = signal<string | null>(null);

  // Activity
  unreadMsgs = computed(() => {
    const me = String(this.user()?.id || '');
    if (!me) return 0;
    return this.chat.messages().filter(m => m.toUserId === me && m.status !== 'READ').length;
  });

  recentNotifications = computed(() => {
    const u = this.user();
    if (!u?.id) return [] as ReturnType<typeof this.notifications.listFor>;
    return this.notifications.listFor(String(u.id))
      .slice()
      .sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0,3);
  });

  displayName(){
    return this.profile()?.displayName || this.user()?.email || 'Usuario';
  }
  roleLabel(){
    const r = this.user()?.role;
    return r === 'guardian' ? 'Guardián' : r === 'owner' ? 'Dueño/a' : '¡';
  }
  isOwner(){ return this.user()?.role === 'owner'; }
  isGuardian(){ return this.user()?.role === 'guardian'; }

  unreadCount(){
    const u = this.user();
    return u?.id ? this.notifications.listFor(String(u.id)).filter(n => !n.read).length : 0;
  }

  ownerActive(){
    const u = this.user();
    return u?.id ? this.bookings.listActiveForOwner(String(u.id)).length : 0;
  }

  guardianPending(){
    const u = this.user();
    return u?.id ? this.bookings.listPendingRequests(String(u.id)).length : 0;
  }

  guardianActive(){
    const u = this.user();
    return u?.id ? this.bookings.listActiveForGuardian(String(u.id)).length : 0;
  }

  // Spark data
  private normalize(values: number[]): number[] {
    if (!values.length) return [];
    const max = Math.max(...values, 1);
    return values.map(v => Math.max(12, Math.round((v / max) * 100))); // min 12%
  }
  private lastBy(arr: Booking[], n = 10){
    return arr
      .slice()
      .sort((a,b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      .slice(-n);
  }
  ownerSpark(){
    const u = this.user();
    if (!u?.id) return [] as number[];
    const last = this.lastBy(this.bookings.listForOwner(String(u.id)));
    const values = last.map(b => Math.max(1, b.totalPrice || 0));
    return this.normalize(values);
  }
  guardianSpark(){
    const u = this.user();
    if (!u?.id) return [] as number[];
    const last = this.lastBy(this.bookings.listForGuardian(String(u.id)));
    const values = last.map(b => Math.max(1, b.totalPrice || 0));
    return this.normalize(values);
  }

  ngOnInit(){
    const u = this.user();
    if (!u?.id) return;

    // Rotate greeting per visit
    try {
      const list = ['Hola', '¡Qué bueno verte!', 'Bienvenido/a de vuelta', '¡Hey!', '¿Listo/a para cuidar?'];
      const last = sessionStorage.getItem('pethero_greet_last') || '';
      let pick = list[Math.floor(Math.random()*list.length)];
      if (pick === last) pick = list[(list.indexOf(pick)+1) % list.length];
      this.greet.set(pick);
      sessionStorage.setItem('pethero_greet_last', pick);
    } catch {}

    if (u.role === 'owner'){
            // Robust pets count: fetch all and filter to ensure accuracy (supports legacy ownerId formats)
      this.api.get<any[]>('/pets').subscribe({
        next: all => {
          const uid = String(u.id);
          const email = String((this.user()?.email || '')).toLowerCase();
          const count = (all || []).filter(p => {
            const oid = String((p as any).ownerId ?? '').toLowerCase();
            const oemail = String((p as any).ownerEmail ?? '').toLowerCase();
            return oid === uid || oid === ('u' + uid) || oemail === email;
          }).length;
          this.petsCount.set(count);
        },
        error: () => {}
      });

      const act = this.bookings.listActiveForOwner(String(u.id));
      this.ownerPendingPay.set(act.filter(b => !b.depositPaid).length);
      if (act.length){
        const next = act
          .map(b => new Date(b.start))
          .filter(d => !isNaN(d.getTime()))
          .sort((a,b) => a.getTime()-b.getTime())[0];
        this.nextOwnerBooking.set(next ? next.toISOString() : null);
      }
    }

    if (u.role === 'guardian'){
      const gid = String(u.id);
      const active = this.bookings.listActiveForGuardian(gid);
      const completed = this.bookings.listCompletedForGuardian(gid);
      this.guardianCompleted.set(completed.length);
      const earn = [...active, ...completed]
        .filter(b => ['CONFIRMED','IN_PROGRESS','COMPLETED'].includes(b.status))
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      this.guardianEarnings.set(earn);

      this.reviews.list(gid).subscribe({
        next: list => {
          const count = (list || []).length;
          const avg = count ? (list!.reduce((s,r) => s + (r.rating||0), 0) / count) : 0;
          this.ratingCount.set(count);
          this.ratingAvg.set(avg);
        },
        error: () => { this.ratingCount.set(0); this.ratingAvg.set(0); }
      });

      const today = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const todayISO = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
      this.availability.findNextAvailability(gid, todayISO).subscribe({
        next: (nextIso) => this.nextAvailability.set(nextIso),
        error: () => this.nextAvailability.set(null)
      });
    }
  }
}

