// src/app/features/bookings-history/csv-export.util.ts
/*
############################################
Name: exportBookingsCsv
Objetive: Export bookings csv.
Extra info: Streams data through mapping and filtering transforms before returning.
############################################
*/
export function exportBookingsCsv(rows: any[], filename = 'bookings.csv') {
  if (!rows?.length) return;

  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    // escapado CSV basico
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => esc(r[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
