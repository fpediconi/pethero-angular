import { Routes } from '@angular/router';
import { VoucherPage } from './voucher.page';

export const VOUCHERS_ROUTES: Routes = [
  { path: ':id', component: VoucherPage }
];

