import { computeAverage } from './reviews.util';
import { Review } from '@features/reviews/models';

describe('computeAverage', () => {
  it('returns 0/0 for empty', () => {
    expect(computeAverage([])).toEqual({ avg: 0, count: 0 });
  });

  it('computes one decimal', () => {
    const reviews: Review[] = [
      { id:'1', bookingId:'b1', guardianId:'g', ownerId:'o', rating:5, createdAt:new Date().toISOString() },
      { id:'2', bookingId:'b2', guardianId:'g', ownerId:'o', rating:4, createdAt:new Date().toISOString() },
      { id:'3', bookingId:'b3', guardianId:'g', ownerId:'o', rating:3, createdAt:new Date().toISOString() },
    ];
    expect(computeAverage(reviews)).toEqual({ avg: 4, count: 3 });
  });

  it('rounds properly', () => {
    const reviews: Review[] = [
      { id:'1', bookingId:'b1', guardianId:'g', ownerId:'o', rating:5, createdAt:new Date().toISOString() },
      { id:'2', bookingId:'b2', guardianId:'g', ownerId:'o', rating:4, createdAt:new Date().toISOString() },
    ];
    // 4.5 => 4.5
    expect(computeAverage(reviews)).toEqual({ avg: 4.5, count: 2 });
  });
});


