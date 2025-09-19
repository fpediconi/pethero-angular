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
  // Use [start, end) semantics to avoid treating back-to-back ranges as overlapping
  const as = parseISO(aStart).getTime();
  const ae = parseISO(aEnd).getTime();
  const bs = parseISO(bStart).getTime();
  const be = parseISO(bEnd).getTime();
  return as < be && bs < ae;
}

export function validRange(start?: string, end?: string): string | null {
  if (!start || !end) return 'Debe indicar fecha de inicio y fin.';
  const s = parseISO(start);
  const e = parseISO(end);
  if (e < s) return 'La fecha de fin no puede ser menor a la de inicio.';
  if (isPast(s)) return 'No puede reservar fechas en el pasado.';
  return null;
}

export function formatRelative(date: string | Date): string {
  const d = parseISO(date).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - d) / 1000));
  if (diff < 60) return `hace ${diff}s`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `hace ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months}m`;
  const years = Math.floor(months / 12);
  return `hace ${years}a`;
}
