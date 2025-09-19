export type RecurrenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface AvailabilityBlock {
  id: string;
  guardianId: string;
  start: string;     // ISO date-time (UTC) start of block [start, end)
  end: string;       // ISO date-time (UTC) end of block
  capacity: number;  // capacity per day covered by this block
  recurrence?: {
    type: RecurrenceType;
    byWeekday?: number[]; // 0-6 (Sun..Sat) for WEEKLY
    until?: string;       // ISO end limit for recurrence
  };
  meta?: any;
}

export interface AvailabilityException {
  id: string;
  guardianId: string;
  start: string;  // ISO UTC start [start, end)
  end: string;    // ISO UTC end
  type: 'closed' | 'open';
  reason?: string;
}

export type DailyMap = Record<string, number>; // YYYY-MM-DD local -> value

