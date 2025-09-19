import { Routes } from '@angular/router';
import { CheckoutPage } from './checkout.page';
export const PAYMENTS_ROUTES: Routes = [
  { path: 'checkout/:bookingId', component: CheckoutPage }
];
