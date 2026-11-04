import { AppError } from './httpError.js';

export const REPORT_TIME_ZONE = 'Asia/Jakarta';

export interface DateRange {
  startDate: string;
  endDate: string;
  start: Date;
  endExclusive: Date;
  timezone: string;
}

function isDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year as number, (month as number) - 1, day as number));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === (month as number) - 1 &&
    date.getUTCDate() === day
  );
}

function addDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year as number, (month as number) - 1, (day as number) + days));

  return date.toISOString().slice(0, 10);
}

function currentJakartaMonth(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);

  return { year, month };
}

export function formatJakartaDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function resolveDateRange(startDate?: string, endDate?: string): DateRange {
  const { year, month } = currentJakartaMonth();
  const defaultStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const defaultEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const start = startDate ?? defaultStart;
  const end = endDate ?? defaultEnd;

  if (!isDateString(start) || !isDateString(end)) {
    throw new AppError(422, 'Format tanggal tidak valid', {
      details: {
        fields: {
          startDate: 'Gunakan format YYYY-MM-DD',
          endDate: 'Gunakan format YYYY-MM-DD',
        },
      },
    });
  }

  if (start > end) {
    throw new AppError(422, 'Rentang tanggal tidak valid', {
      details: { fields: { endDate: 'endDate tidak boleh sebelum startDate' } },
    });
  }

  return {
    startDate: start,
    endDate: end,
    start: new Date(`${start}T00:00:00+07:00`),
    endExclusive: new Date(`${addDays(end, 1)}T00:00:00+07:00`),
    timezone: REPORT_TIME_ZONE,
  };
}
