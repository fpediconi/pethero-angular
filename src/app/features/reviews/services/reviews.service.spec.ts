import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReviewsService } from '@features/reviews/services/reviews.service';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '@core/auth';
import { BookingsService } from '@features/bookings/services';

describe('ReviewsService', () => {
  let svc: ReviewsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReviewsService, AuthService, BookingsService]
    });
    svc = TestBed.inject(ReviewsService);
    http = TestBed.inject(HttpTestingController);
    // Simula sesión de owner id=1
    TestBed.inject(AuthService).persistSession({ id: 1, email: 't@t', role: 'owner' } as any);
  });

  afterEach(() => http.verify());

  it('lists reviews by guardian', () => {
    const base = environment.apiBaseUrl;
    svc.list('g1').subscribe(r => expect(r.length).toBe(1));
    const req = http.expectOne(`${base}/reviews?guardianId=g1`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'r1' }]);
  });

  it('creates a review', () => {
    const base = environment.apiBaseUrl;
    // Pre-carga cache para validación de duplicados
    svc.reviewsSignal('g1').set([]);
    const payload = { guardianId: 'g1', ownerId: '1', bookingId: 'b1', rating: 5 };
    svc.create(payload).subscribe(r => expect(r.id).toBe('r1'));
    const req = http.expectOne(`${base}/reviews`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.guardianId).toBe('g1');
    req.flush({ id: 'r1', ...payload, createdAt: new Date().toISOString() });
  });
});


