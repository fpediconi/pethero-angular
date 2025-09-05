export function parseISO(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

export function daysBetween(start: string | Date, end: string | Date): number {
  const s = parseISO(start);
  const e = parseISO(end);
  const ms = e.getTime() - s.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function isPast(date: string | Date): boolean {
  const d = parseISO(date);
  const today = new Date();
  today.setHours(0,0,0,0);
  return d < today;
}

export function overlaps(aStart: string | Date, aEnd: string | Date, bStart: string | Date, bEnd: string | Date): boolean {
  const as = parseISO(aStart).getTime();
  const ae = parseISO(aEnd).getTime();
  const bs = parseISO(bStart).getTime();
  const be = parseISO(bEnd).getTime();
  return as <= be && bs <= ae;
}

export function validRange(start?: string, end?: string): string | null {
  if (!start || !end) return 'Debe indicar fecha de inicio y fin.';
  const s = parseISO(start);
  const e = parseISO(end);
  if (e < s) return 'La fecha de fin no puede ser menor a la de inicio.';
  if (isPast(s)) return 'No puede reservar fechas en el pasado.';
  return null;
}

