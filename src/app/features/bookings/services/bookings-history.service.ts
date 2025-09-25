// src/app/bookings/bookings-history.service.ts
// Adaptador sobre BookingsService (mock/json-server)
import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { BookingSummary, HistoryQuery, Paged } from '@features/bookings/models';
import { BookingsService, BookingHistoryQuery } from '@features/bookings/services/bookings.service';
import { AuthService } from '@core/auth';
/*
############################################
Name: BookingsHistoryService
Objetive: Provide bookings history domain operations.
Extra info: Wraps API access, caching, and shared business rules.
############################################
*/


@Injectable({ providedIn: 'root' })
export class BookingsHistoryService {
  private bookings = inject(BookingsService);
  private auth = inject(AuthService);

  // Bridge HistoryQuery -> BookingHistoryQuery
  private toHistoryQuery(q: HistoryQuery): BookingHistoryQuery {
    const u = this.auth.user();
    const userId = String(u?.id ?? '');

    return {
      role: q.roleView === 'OWNER' ? 'OWNER' : 'GUARDIAN',
      userId,
      states: q.status && q.status !== 'ANY' ? [q.status] : undefined,
      dateFrom: q.from || undefined,
      dateTo: q.to || undefined,
      page: (q.page ?? 0) + 1,           // BookingsService usa 1-based
      pageSize: q.pageSize ?? 10,
      q: q.q || undefined
    };
  }

  
  /*
  ############################################
  Name: search
  Objetive: Execute the search workflow.
  Extra info: Streams data through mapping and filtering transforms before returning.
  ############################################
  */
  search(qry: HistoryQuery): Observable<Paged<BookingSummary>> {
    const hq = this.toHistoryQuery(qry);

    return from(this.bookings.searchHistory(hq)).pipe(
      map(res => ({
        items: res.items.map(it => {
          // El panel muestra UNA de estas dos columnas segun el rol.
          // Cargamos solo la relevante y dejamos la otra vacia para evitar pedir mas datos.
          const ownerName    = hq.role === 'GUARDIAN' ? it.counterpartName : '';
          const guardianName = hq.role === 'OWNER'    ? it.counterpartName : '';

          return {
            id: it.booking.id,
            code: it.booking.id,
            startDate: it.booking.start,
            endDate: it.booking.end,
            nights: it.nights,
            petName: it.petName,
            ownerName,
            guardianName,
            ownerId: it.booking.ownerId,
            guardianId: it.booking.guardianId,
            total: it.totalPrice ?? 0,
            status: it.booking.status as any,
            createdAt: it.booking.createdAt
          } as BookingSummary;
        }),
        total: res.total,
        page: (res.page ?? 1) - 1,        // devolver 0-based al panel
        pageSize: res.pageSize ?? hq.pageSize!
      }))
    );
  }
}


