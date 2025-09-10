import { Review } from '../shared/models/review';

export function computeAverage(reviews: Review[]): { avg: number; count: number } {
  const count = (reviews || []).length;
  if (!count) return { avg: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
  return { avg: Math.round((sum / count) * 10) / 10, count };
}

