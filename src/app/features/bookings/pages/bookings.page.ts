import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingsService } from '@features/bookings/services';
import { Booking } from '@features/bookings/models';
import { AuthService } from '@core/auth';
import { RouterLink } from '@angular/router';
import { BookingSummary } from '@features/bookings/models';
import { BookingsHistoryPanelComponent } from '@features/bookings/components';
/*
############################################
Name: BookingsPage
Objetive: Drive the bookings page experience.
Extra info: Coordinates routing context, data retrieval, and user actions.
############################################
*/



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

  ownerActive = computed(() => {
    const u = this.user();
    if (!u || u.role !== 'owner') return [];
    return this.service.listActiveForOwner(String(u.id));
  });
  ownerCompleted = computed(() => {
    const u = this.user();
    if (!u || u.role !== 'owner') return [];
    return this.service.listCompletedForOwner(String(u.id));
  });
  guardianPending = computed(() => {
    const u = this.user();
    if (!u || u.role !== 'guardian') return [];
    return this.service.listPendingRequests(String(u.id));
  });
  guardianActive = computed(() => {
    const u = this.user();
    if (!u || u.role !== 'guardian') return [];
    return this.service.listActiveForGuardian(String(u.id));
  });
  guardianCompleted = computed(() => {
    const u = this.user();
    if (!u || u.role !== 'guardian') return [];
    return this.service.listCompletedForGuardian(String(u.id));
  });

  ngOnInit(){
    this.service.reload();
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
  cancel(b: Booking){ if (confirm('¿Cancelar la reserva?')) { this.service.cancel(b.id); } }
  finalize(b: Booking){ if (confirm('¿Finalizar la reserva?')) { this.service.finalize(b.id); } }
  accept(b: Booking){ try { this.service.accept(b.id); } catch(e:any){ alert(e.message || 'No se pudo aceptar'); } }
  reject(b: Booking){ this.service.reject(b.id); }
  async pay(b: Booking){
    try {
      const voucher = await this.service.pay(b.id);
      if (!voucher) throw new Error('No se pudo obtener el comprobante.');
      if (typeof window !== 'undefined') {
        window.open(`/voucher/${voucher.id}`, '_blank');
      }
    } catch (error: any) {
      console.error('[BookingsPage] pay failed', error);
      alert(error?.message || 'No se pudo completar el pago. Intenta nuevamente.');
    }
  }
}




