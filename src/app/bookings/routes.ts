import { Routes } from '@angular/router';
import { BookingsPage } from './list/bookings.page';
import { BookingRequestPage } from './request/booking-request.page';

export const BOOKINGS_ROUTES: Routes = [
  { path: '', component: BookingsPage },
  { path: 'request/:guardianId', component: BookingRequestPage }
];