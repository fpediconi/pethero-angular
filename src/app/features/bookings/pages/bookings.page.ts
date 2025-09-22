import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingsService } from '@features/bookings/services';
import { Booking } from '@features/bookings/models';
import { AuthService } from '@core/auth';
import { RouterLink } from '@angular/router';
import { BookingSummary } from '@features/bookings/models';
import { BookingsHistoryPanelComponent } from '@features/bookings/components';


@Component({
  selector: 'ph-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, BookingsHistoryPanelComponent],
  templateUrl: "./bookings.page.html",
  styleUrls: ["./bookings.page.css"],
})
export class BookingsPage {
  private service = inject(BookingsService);
  private auth = inject(AuthService);
  user = this.auth.user;

  ownerActive = signal<Booking[]>([]);
  ownerCompleted = signal<Booking[]>([]);
  guardianPending = signal<Booking[]>([]);
  guardianActive = signal<Booking[]>([]);
  guardianCompleted = signal<Booking[]>([]);

  private syncBookingsEffect = effect(() => {
    void this.service.bookings();
    this.refresh();
  });

  ngOnInit(){
    this.service.reload();
    this.refresh();
  }

  private refresh(){
    const u = this.user();
    if (!u) return;
    if (u.role === 'owner'){
      this.ownerActive.set(this.service.listActiveForOwner(String(u.id)));
      this.ownerCompleted.set(this.service.listCompletedForOwner(String(u.id)));
    }
    if (u.role === 'guardian'){
      this.guardianPending.set(this.service.listPendingRequests(String(u.id)));
      this.guardianActive.set(this.service.listActiveForGuardian(String(u.id)));
      this.guardianCompleted.set(this.service.listCompletedForGuardian(String(u.id)));
    }
  }

  statusLabel(b: Booking){
    const map: Record<string,string> = {
      REQUESTED: 'PENDIENTE',
      ACCEPTED: 'ACEPTADA',
      REJECTED: 'RECHAZADA',
      CANCELLED: 'CANCELADA',
      CONFIRMED: 'CONFIRMADA',
      IN_PROGRESS: 'EN CURSO',
      COMPLETED: 'FINALIZADA',
    };
    return map[b.status] || b.status;
  }

  // Acciones
  cancel(b: Booking){ if (confirm('¿Cancelar la reserva?')) { this.service.cancel(b.id); this.refresh(); } }
  finalize(b: Booking){ if (confirm('¿Finalizar la reserva?')) { this.service.finalize(b.id); this.refresh(); } }
  accept(b: Booking){ try { this.service.accept(b.id); } catch(e:any){ alert(e.message || 'No se pudo aceptar'); } finally { this.refresh(); } }
  reject(b: Booking){ this.service.reject(b.id); this.refresh(); }
  pay(b: Booking){
    const warnPending = b.status === 'REQUESTED' ? '\nIMPORTANTE: Si luego cancelas, no se reintegra el pago.' : '';
    const ok = confirm(`Simular pago por $${b.totalPrice || ''}. ¿Confirmar?${warnPending}`);
    if (ok) { this.service.pay(b.id); this.refresh(); }
  }
}



