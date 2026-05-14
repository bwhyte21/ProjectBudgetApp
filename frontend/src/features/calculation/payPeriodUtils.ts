import {
  addDays,
  addMonths,
  differenceInDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { PayFrequency, RankedBill } from "../../api/types";

export interface PeriodWindow {
  start: Date;
  end: Date;
  label: string;
}

const fmt = (d: Date) => format(d, "MMM d");
const windowLabel = (s: Date, e: Date) => `${fmt(s)} \u2013 ${fmt(e)}`;

export function getPayPeriodWindows(
  frequency: PayFrequency,
  today: Date,
  anchorDate?: string | null,
): PeriodWindow[] {
  switch (frequency) {
    case "Weekly":
    case "Biweekly": {
      const stepDays = frequency === "Weekly" ? 7 : 14;
      const windowCount = 3;
      if (anchorDate) {
        const anchor = parseISO(anchorDate.substring(0, 10) + "T00:00:00");
        const periodsElapsed = Math.floor(
          differenceInDays(today, anchor) / stepDays,
        );
        const windows: PeriodWindow[] = [];
        let start = addDays(anchor, periodsElapsed * stepDays);
        for (let i = 0; i < windowCount; i++) {
          const end = addDays(start, stepDays - 1);
          windows.push({ start, end, label: windowLabel(start, end) });
          start = addDays(start, stepDays);
        }
        return windows;
      }
      const windows: PeriodWindow[] = [];
      let start = today;
      for (let i = 0; i < windowCount; i++) {
        const end = addDays(start, stepDays - 1);
        windows.push({ start, end, label: windowLabel(start, end) });
        start = addDays(start, stepDays);
      }
      return windows;
    }
    case "Semimonthly": {
      if (today.getDate() <= 14) {
        const s1 = today;
        const e1 = new Date(today.getFullYear(), today.getMonth(), 14);
        const s2 = new Date(today.getFullYear(), today.getMonth(), 15);
        const e2 = endOfMonth(today);
        return [
          { start: s1, end: e1, label: windowLabel(s1, e1) },
          { start: s2, end: e2, label: windowLabel(s2, e2) },
        ];
      }
      const s1 = today;
      const e1 = endOfMonth(today);
      const nextMonth = addMonths(startOfMonth(today), 1);
      const s2 = nextMonth;
      const e2 = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 14);
      return [
        { start: s1, end: e1, label: windowLabel(s1, e1) },
        { start: s2, end: e2, label: windowLabel(s2, e2) },
      ];
    }
    case "Monthly":
    default: {
      const monthEnd = endOfMonth(today);
      const nextMonth = addMonths(startOfMonth(today), 1);
      const nextMonthEnd = endOfMonth(nextMonth);
      return [
        { start: today, end: monthEnd, label: windowLabel(today, monthEnd) },
        {
          start: nextMonth,
          end: nextMonthEnd,
          label: windowLabel(nextMonth, nextMonthEnd),
        },
      ];
    }
  }
}

export function countPaychecksInMonth(
  frequency: PayFrequency,
  today: Date,
  anchorDate: string,
): number {
  const stepDays = frequency === "Weekly" ? 7 : 14;
  const anchor = parseISO(anchorDate.substring(0, 10) + "T00:00:00");
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const periodsToStart = Math.ceil(
    differenceInDays(monthStart, anchor) / stepDays,
  );
  let payday = addDays(anchor, periodsToStart * stepDays);
  let count = 0;
  while (payday <= monthEnd) {
    if (payday >= monthStart) count++;
    payday = addDays(payday, stepDays);
  }
  return count;
}

export function billInWindow(bill: RankedBill, window: PeriodWindow): boolean {
  const due = parseISO(bill.nextDueDate.substring(0, 10) + "T00:00:00");
  return due >= window.start && due <= window.end;
}
