import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '@core/http';
import { PaymentVoucher } from '@features/vouchers/models';
import { Booking } from '@features/bookings/models';
import { map, switchMap, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PaymentVoucherService {
  private api = inject(ApiService);

  // Config: hours until expiration
  private readonly DUE_HOURS = 48;

  // Cache by booking id
  private _voucherByBooking = signal<Record<string, PaymentVoucher | null>>({});
  voucherByBookingSig = this._voucherByBooking;

  private setCache(bookingId: string, voucher: PaymentVoucher | null){
    const curr = this._voucherByBooking();
    this._voucherByBooking.set({ ...curr, [bookingId]: voucher });
  }

  getByBookingId(bookingId: string): Observable<PaymentVoucher | null> {
    return this.api.get<PaymentVoucher[]>(`/paymentVouchers`, { bookingId }).pipe(
      map(list => (list && list.length ? list[0] : null)),
      tap(v => this.setCache(bookingId, v))
    );
  }

  // Helper: calculate 50% with consistent rounding
  private halfAmount(total?: number){
    const t = Number(total || 0);
    return Math.round(t * 0.5);
  }

  // Ensure a voucher exists for an accepted booking. Does not duplicate active ISSUED vouchers.
  issueForBooking(booking: Booking): Observable<PaymentVoucher> {
    return this.getByBookingId(booking.id).pipe(
      switchMap(existing => {
        if (existing) {
          // If already issued and not expired, return as is
          if (existing.status === 'ISSUED') {
            const now = Date.now();
            const due = Date.parse(existing.dueDate);
            if (isFinite(due) && now > due) {
              // Expire then create a new one
              return this.expireIfNeeded(existing).pipe(
                switchMap(() => this.createVoucher(booking))
              );
            }
            return of(existing);
          }
          // If already paid, just return it (no new voucher needed)
          if (existing.status === 'PAID') return of(existing);
          // If expired/void, create a fresh one
          return this.createVoucher(booking);
        }
        // No voucher yet => create
        return this.createVoucher(booking);
      }),
      tap(v => this.setCache(booking.id, v))
    );
  }

  private createVoucher(booking: Booking): Observable<PaymentVoucher> {
    const id = Math.random().toString(36).slice(2);
    const due = new Date(Date.now() + this.DUE_HOURS * 60 * 60 * 1000).toISOString();
    const voucher: PaymentVoucher = {
      id,
      bookingId: booking.id,
      amount: this.halfAmount(booking.totalPrice),
      dueDate: due,
      status: 'ISSUED',
      createdAt: new Date().toISOString(),
    };
    return this.api.post<PaymentVoucher>('/paymentVouchers', voucher).pipe(
      tap(v => this.setCache(booking.id, v))
    );
  }

  markPaid(voucherId: string): Observable<PaymentVoucher> {
    return this.api.get<PaymentVoucher>(`/paymentVouchers/${voucherId}`).pipe(
      switchMap(v => this.api.put<PaymentVoucher>(`/paymentVouchers/${voucherId}`, { ...v, status: 'PAID' })),
      tap(v => this.setCache(v.bookingId, v))
    );
  }

  expireIfNeeded(voucher: PaymentVoucher): Observable<PaymentVoucher | null> {
    try {
      const due = Date.parse(voucher.dueDate);
      const now = Date.now();
      if (voucher.status === 'ISSUED' && isFinite(due) && now > due) {
        const next = { ...voucher, status: 'EXPIRED' as const };
        return this.api.put<PaymentVoucher>(`/paymentVouchers/${voucher.id}`, next).pipe(
          tap(v => this.setCache(v.bookingId, v))
        );
      }
      return of(voucher);
    } catch {
      return of(voucher);
    }
  }

  voidByBooking(bookingId: string): Observable<PaymentVoucher | null> {
    return this.getByBookingId(bookingId).pipe(
      switchMap(v => {
        if (!v) return of(null);
        if (v.status === 'PAID') return of(v); // don't void paid vouchers
        const next = { ...v, status: 'VOID' as const };
        return this.api.put<PaymentVoucher>(`/paymentVouchers/${v.id}`, next).pipe(
          tap(saved => this.setCache(saved.bookingId, saved))
        );
      })
    );
  }
}


