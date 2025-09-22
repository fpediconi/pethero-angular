import { Routes } from '@angular/router';
import { VoucherPage } from '@features/vouchers/pages';

export const VOUCHERS_ROUTES: Routes = [
  { path: ':id', component: VoucherPage }
];
