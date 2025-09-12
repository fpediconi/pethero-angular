import { compareISO, diffDays, overlap, covers } from './date-range.util';

describe('date-range.util', () => {
  it('compareISO orders correctly', () => {
    expect(compareISO('2025-01-01','2025-01-02')).toBeLessThan(0);
    expect(compareISO('2025-01-02','2025-01-01')).toBeGreaterThan(0);
    expect(compareISO('2025-01-01','2025-01-01')).toBe(0);
  });

  it('diffDays respects exclusive end', () => {
    expect(diffDays('2025-10-01','2025-10-01')).toBe(0);
    expect(diffDays('2025-10-01','2025-10-02')).toBe(1);
    expect(diffDays('2025-10-01','2025-10-05')).toBe(4);
  });

  it('overlap uses [start,end) semantics', () => {
    // Adjacent: no overlap
    expect(overlap('2025-10-01','2025-10-05','2025-10-05','2025-10-10')).toBeFalse();
    // Identical: overlap
    expect(overlap('2025-10-01','2025-10-05','2025-10-01','2025-10-05')).toBeTrue();
    // Partial
    expect(overlap('2025-10-01','2025-10-05','2025-10-04','2025-10-08')).toBeTrue();
  });

  it('covers requires full containment', () => {
    expect(covers('2025-10-01','2025-10-10','2025-10-02','2025-10-05')).toBeTrue();
    expect(covers('2025-10-01','2025-10-10','2025-09-30','2025-10-05')).toBeFalse();
    expect(covers('2025-10-01','2025-10-10','2025-10-05','2025-10-12')).toBeFalse();
  });
});

