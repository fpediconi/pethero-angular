// Daily availability helpers using YYYY-MM-DD (local day keys)
import { AvailabilityBlock, AvailabilityException, DailyMap } from '../models/availability-daily.model';

export function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODateLocal(iso: string): Date {
  const [y,m,d] = iso.split('-').map(n => parseInt(n,10));
  return new Date(y, (m-1), d, 0, 0, 0, 0);
}

export function addDaysLocal(iso: string, days: number): string {
  const d = fromISODateLocal(iso);
  d.setDate(d.getDate() + days);
  return toISODateLocal(d);
}

export function daysBetweenLocal(startISO: string, endISOExcl: string): string[] {
  const res: string[] = [];
  let curr = startISO;
  while (curr < endISOExcl) {
    res.push(curr);
    curr = addDaysLocal(curr, 1);
  }
  return res;
}

// Safer split that treats inputs as local calendar days using only the date component (YYYY-MM-DD)
export function splitToDays(startISO: string, endISO: string): string[] {
  const startDay = (startISO || '').slice(0,10);
  const endDay = (endISO || '').slice(0,10);
  return daysBetweenLocal(startDay, endDay);
}

/*
############################################
Name: expandRecurrence
Objetive: Manage the expand recurrence workflow.
Extra info: Streams data through mapping and filtering transforms before returning.
############################################
*/
export function expandRecurrence(blocks: AvailabilityBlock[], rangeStartUTC: string, rangeEndUTC: string): AvailabilityBlock[] {
  const out: AvailabilityBlock[] = [];
  const rangeDays = splitToDays(rangeStartUTC, rangeEndUTC);
  const rangeSet = new Set(rangeDays);
  for (const b of blocks){
    if (!b.recurrence){ out.push(b); continue; }
    const baseDays = splitToDays(b.start, b.end);
    const type = b.recurrence.type;
    if (type === 'DAILY'){
      for (const day of rangeDays){
        if (day >= baseDays[0]){
          const iso = day;
          out.push({ ...b, id: `${b.id}:${iso}`, start: iso, end: addDaysLocal(iso,1), recurrence: undefined });
        }
      }
    } else if (type === 'WEEKLY'){
      const weekdays = (b.recurrence.byWeekday || []).map(n => (n%7+7)%7);
      for (const day of rangeDays){
        const dt = fromISODateLocal(day);
        if (weekdays.includes(dt.getDay())){
          // ensure inside until if present
          if (b.recurrence.until && day > b.recurrence.until.slice(0,10)) continue;
          out.push({ ...b, id: `${b.id}:${day}`, start: day, end: addDaysLocal(day,1), recurrence: undefined });
        }
      }
    } else if (type === 'MONTHLY'){
      const untilDay = b.recurrence.until ? b.recurrence.until.slice(0,10) : null;
      for (const day of rangeDays){
        if (untilDay && day > untilDay) continue;
        // month-day match with base start's day-of-month
        const dom = (new Date(b.start)).getUTCDate();
        const d = fromISODateLocal(day);
        if (d.getDate() === dom) {
          out.push({ ...b, id: `${b.id}:${day}`, start: day, end: addDaysLocal(day,1), recurrence: undefined });
        }
      }
    }
  }
  return out;
}

export function applyExceptions(days: string[], exceptions: AvailabilityException[]): { closed: Set<string>; open: Set<string> } {
  const closed = new Set<string>();
  const open = new Set<string>();
  for (const ex of exceptions){
    const exDays = splitToDays(ex.start, ex.end);
    if (ex.type === 'closed') exDays.forEach(d => closed.add(d));
    if (ex.type === 'open')   exDays.forEach(d => open.add(d));
  }
  return { closed, open };
}

export function capacityByDay(blocks: AvailabilityBlock[], rangeStartUTC: string, rangeEndUTC: string, exceptions: AvailabilityException[]): DailyMap {
  const cap: DailyMap = {};
  const expanded = expandRecurrence(blocks, rangeStartUTC, rangeEndUTC);
  const { closed, open } = applyExceptions([], exceptions);
  for (const b of expanded){
    const days = splitToDays(b.start, b.end);
    for (const d of days){
      if (closed.has(d)) continue; // closed wins
      cap[d] = (cap[d] || 0) + Math.max(0, b.capacity || 0);
    }
  }
  // open exceptions can ensure at least capacity 1 if no block
  for (const d of Array.from(open)){
    if (!cap[d]) cap[d] = 1;
  }
  return cap;
}

export function bookingsByDay(bookings: { start: string; end: string; petCount?: number; status: string }[], rangeStartUTC: string, rangeEndUTC: string): DailyMap {
  const occ: DailyMap = {};
  const active = bookings.filter(b => ['ACCEPTED','CONFIRMED'].includes(b.status));
  for (const b of active){
    // Intersect booking with range
    const s = (b.start > rangeStartUTC ? b.start : rangeStartUTC);
    const e = (b.end < rangeEndUTC ? b.end : rangeEndUTC);
    const days = splitToDays(s, e);
    for (const d of days){
      occ[d] = (occ[d] || 0) + Math.max(1, b.petCount || 1);
    }
  }
  return occ;
}

export function freeByDay(cap: DailyMap, occ: DailyMap): DailyMap {
  const keys = new Set([...Object.keys(cap), ...Object.keys(occ)]);
  const out: DailyMap = {};
  for (const d of keys){ out[d] = Math.max(0, (cap[d] || 0) - (occ[d] || 0)); }
  return out;
}

export function hasConsecutiveFreeDays(free: DailyMap, reqStartDay: string, reqEndDayExcl: string, petCount = 1): boolean {
  const days = daysBetweenLocal(reqStartDay, reqEndDayExcl);
  return days.every(d => (free[d] || 0) >= petCount);
}

export function summarizeSpansFromDays(free: DailyMap, fromDay: string, minFree = 1): { start: string; end: string } | null {
  // Find first consecutive span starting at or after fromDay with free >= minFree; return [start,end) iso days
  const days = Object.keys(free).sort();
  const startIdx = Math.max(0, days.findIndex(d => d >= fromDay));
  for (let i = startIdx; i < days.length; i++){
    if ((free[days[i]] || 0) >= minFree){
      // grow span while free
      let j = i + 1;
      while (j < days.length && (free[days[j]] || 0) >= minFree && addDaysLocal(days[j-1],1) === days[j]) j++;
      return { start: days[i], end: addDaysLocal(days[j-1], 1) };
    }
  }
  return null;
}
