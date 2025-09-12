// Utilities for working with ISO dates (YYYY-MM-DD) as [start, end) ranges

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function compareISO(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffDays(startISO: string, endISO: string): number {
  // Treat as dates with end exclusive: nights count
  const s = new Date(startISO + 'T00:00:00Z').getTime();
  const e = new Date(endISO + 'T00:00:00Z').getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((e - s) / oneDay));
}

export function isValidRange(startISO: string, endISO: string): boolean {
  if (!startISO || !endISO) return false;
  return compareISO(startISO, endISO) < 0;
}

// Overlap using [start, end) semantics
export function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return compareISO(aStart, bEnd) < 0 && compareISO(bStart, aEnd) < 0;
}

// A slot covers the requested range entirely (using [start, end) semantics)
export function covers(slotStart: string, slotEnd: string, reqStart: string, reqEnd: string): boolean {
  return compareISO(slotStart, reqStart) <= 0 && compareISO(slotEnd, reqEnd) >= 0;
}

