import {
  startOfMonth,
  endOfMonth,
  addDays,
  getDay,
  getDate,
  getDaysInMonth,
  differenceInCalendarDays,
  getYear,
  getMonth,
} from "date-fns";
import type { Frequency, OccurrenceResult } from "@/types";

/**
 * Calculate how many times a recurring item occurs in a given month
 * and on which dates.
 *
 * @param frequency - The item's payment frequency
 * @param startDate - The anchor date (when the recurring item started)
 * @param year - Target year
 * @param month - Target month (1-indexed: 1 = January)
 * @returns { count, dates } - number of occurrences and their dates
 */
export function getOccurrencesInMonth(
  frequency: Frequency,
  startDate: Date,
  year: number,
  month: number
): OccurrenceResult {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));

  // If item hasn't started yet (start date is after this month), no occurrences
  if (startDate > monthEnd) {
    return { count: 0, dates: [] };
  }

  switch (frequency) {
    case "weekly":
      return getWeeklyOccurrences(startDate, monthStart, monthEnd);
    case "biweekly":
      return getBiweeklyOccurrences(startDate, monthStart, monthEnd);
    case "monthly":
      return getMonthlyOccurrences(startDate, year, month, monthStart, monthEnd);
    case "quarterly":
      return getPeriodicOccurrences(startDate, year, month, 3, monthStart, monthEnd);
    case "semiannual":
      return getPeriodicOccurrences(startDate, year, month, 6, monthStart, monthEnd);
    case "annual":
      return getPeriodicOccurrences(startDate, year, month, 12, monthStart, monthEnd);
    default:
      return { count: 0, dates: [] };
  }
}

/**
 * Weekly: Find all occurrences of the item's weekday in the month.
 * Typically 4-5 per month.
 */
function getWeeklyOccurrences(
  startDate: Date,
  monthStart: Date,
  monthEnd: Date
): OccurrenceResult {
  const targetDayOfWeek = getDay(startDate); // 0=Sun, 1=Mon, ...
  const dates: Date[] = [];

  // Find first occurrence of targetDayOfWeek in this month
  let cursor = new Date(monthStart);
  while (getDay(cursor) !== targetDayOfWeek) {
    cursor = addDays(cursor, 1);
  }

  // Collect all occurrences
  while (cursor <= monthEnd) {
    if (cursor >= startDate) {
      dates.push(new Date(cursor));
    }
    cursor = addDays(cursor, 7);
  }

  return { count: dates.length, dates };
}

/**
 * Bi-weekly: Project forward from startDate in 14-day increments.
 * This is the critical algorithm — correctly handles "3-paycheck months".
 */
function getBiweeklyOccurrences(
  startDate: Date,
  monthStart: Date,
  monthEnd: Date
): OccurrenceResult {
  const dates: Date[] = [];

  // Calculate days from startDate to monthStart
  const daysDiff = differenceInCalendarDays(monthStart, startDate);

  let firstOccurrence: Date;

  if (daysDiff <= 0) {
    // startDate is in or after this month
    firstOccurrence = new Date(startDate);
  } else {
    // Find how many complete 14-day cycles fit before monthStart
    const cyclesPassed = Math.floor(daysDiff / 14);
    firstOccurrence = addDays(startDate, cyclesPassed * 14);

    // If firstOccurrence is before monthStart, advance one more cycle
    if (firstOccurrence < monthStart) {
      firstOccurrence = addDays(firstOccurrence, 14);
    }
  }

  // Walk forward from firstOccurrence, collecting dates in this month
  let cursor = new Date(firstOccurrence);
  while (cursor <= monthEnd) {
    if (cursor >= monthStart) {
      dates.push(new Date(cursor));
    }
    cursor = addDays(cursor, 14);
  }

  return { count: dates.length, dates };
}

/**
 * Monthly: Always exactly 1 occurrence.
 * Day is clamped to the month's last day if needed.
 * E.g., start date is Jan 31 → February occurrence is Feb 28/29.
 */
function getMonthlyOccurrences(
  startDate: Date,
  year: number,
  month: number,
  monthStart: Date,
  monthEnd: Date
): OccurrenceResult {
  const dayOfMonth = getDate(startDate);
  const lastDayOfMonth = getDaysInMonth(new Date(year, month - 1));
  const actualDay = Math.min(dayOfMonth, lastDayOfMonth);
  const occurrenceDate = new Date(year, month - 1, actualDay);

  // Don't include dates before the item was created
  if (occurrenceDate < startDate) {
    return { count: 0, dates: [] };
  }

  return { count: 1, dates: [occurrenceDate] };
}

/**
 * Periodic: quarterly (3), semi-annual (6), annual (12).
 * Check if the target month aligns with the period from the start date.
 */
function getPeriodicOccurrences(
  startDate: Date,
  year: number,
  month: number,
  periodMonths: number,
  monthStart: Date,
  monthEnd: Date
): OccurrenceResult {
  const startMonth = getMonth(startDate); // 0-indexed
  const startYear = getYear(startDate);

  // Calculate month difference
  const monthDiff = (year * 12 + (month - 1)) - (startYear * 12 + startMonth);

  // If we haven't reached the start date's month yet
  if (monthDiff < 0) {
    return { count: 0, dates: [] };
  }

  // Check if this month falls on the period cycle
  if (monthDiff % periodMonths !== 0) {
    return { count: 0, dates: [] };
  }

  // Same day-clamping logic as monthly
  const dayOfMonth = getDate(startDate);
  const lastDayOfMonth = getDaysInMonth(new Date(year, month - 1));
  const actualDay = Math.min(dayOfMonth, lastDayOfMonth);
  const occurrenceDate = new Date(year, month - 1, actualDay);

  if (occurrenceDate < startDate) {
    return { count: 0, dates: [] };
  }

  return { count: 1, dates: [occurrenceDate] };
}
