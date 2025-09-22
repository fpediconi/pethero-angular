import { Routes } from '@angular/router';
import { BookingRequestPage, BookingsPage } from '@features/bookings/pages';

export const BOOKINGS_ROUTES: Routes = [
  { path: '', component: BookingsPage },
  { path: 'request/:guardianId', component: BookingRequestPage }
];

