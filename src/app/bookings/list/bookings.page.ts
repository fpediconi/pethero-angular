import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingsService } from '../bookings.service';
import { Booking } from '../../shared/models/booking';

@Component({
  selector: 'ph-bookings',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="card">
    <h2>Mis Reservas</h2>
    <table class="table">
      <thead><tr><th>Desde</th><th>Hasta</th><th>Estado</th></tr></thead>
      <tbody>
        <tr *ngFor="let b of bookings()">
          <td>{{ b.start | date:'shortDate' }}</td>
          <td>{{ b.end | date:'shortDate' }}</td>
          <td><span class="badge">{{ b.status }}</span></td>
        </tr>
      </tbody>
    </table>
  </div>`
})
export class BookingsPage {
  private service = inject(BookingsService);
  bookings = signal<Booking[]>([]);
  ngOnInit(){ this.service.list('u1').subscribe(b => this.bookings.set(b)); }
}