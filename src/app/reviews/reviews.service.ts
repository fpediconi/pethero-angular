import { Injectable, inject } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { Review } from '../shared/models/review';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private api = inject(ApiService);
  list(guardianId: string){ return this.api.get<Review[]>('/reviews', { guardianId }); }
  create(review: Partial<Review>){ return this.api.post<Review>('/reviews', review); }
}