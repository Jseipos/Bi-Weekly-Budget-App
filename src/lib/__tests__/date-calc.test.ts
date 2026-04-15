import { describe, it, expect } from "vitest";
import { getOccurrencesInMonth } from "../date-calc";

describe("getOccurrencesInMonth", () => {
  // ==================== WEEKLY ====================
  describe("weekly", () => {
    it("returns 4 occurrences for a typical month", () => {
      // Feb 2026 has 28 days. A Friday recurring starting Jan 2 2026 (Friday)
      const start = new Date(2026, 0, 2); // Jan 2, 2026 = Friday
      const result = getOccurrencesInMonth("weekly", start, 2026, 2);
      expect(result.count).toBe(4); // Feb 6, 13, 20, 27
      expect(result.dates).toHaveLength(4);
    });

    it("returns 5 occurrences when month has 5 of that weekday", () => {
      // Jan 2026 starts on Thursday. Thursdays: 1, 8, 15, 22, 29 = 5
      const start = new Date(2026, 0, 1); // Jan 1, 2026 = Thursday
      const result = getOccurrencesInMonth("weekly", start, 2026, 1);
      expect(result.count).toBe(5);
    });

    it("returns 0 if start date is in the future", () => {
      const start = new Date(2027, 0, 1); // Jan 2027
      const result = getOccurrencesInMonth("weekly", start, 2026, 6);
      expect(result.count).toBe(0);
    });

    it("handles start date in the same month", () => {
      // Start mid-month
      const start = new Date(2026, 1, 15); // Feb 15 2026 = Sunday
      const result = getOccurrencesInMonth("weekly", start, 2026, 2);
      // Should only include Feb 15, 22
      expect(result.count).toBe(2);
    });
  });

  // ==================== BI-WEEKLY ====================
  describe("biweekly", () => {
    it("returns 2 occurrences for a typical month", () => {
      // Bi-weekly starting Jan 3 2026 (Saturday)
      // Jan: Jan 3, Jan 17, Jan 31 = 3
      // Feb: Feb 14, Feb 28 = 2
      const start = new Date(2026, 0, 3);
      const result = getOccurrencesInMonth("biweekly", start, 2026, 2);
      expect(result.count).toBe(2);
      expect(result.dates[0].getDate()).toBe(14);
      expect(result.dates[1].getDate()).toBe(28);
    });

    it("returns 3 occurrences for a 3-paycheck month", () => {
      // Bi-weekly starting Jan 3 2026
      // Jan: Jan 3, Jan 17, Jan 31 = 3 occurrences!
      const start = new Date(2026, 0, 3);
      const result = getOccurrencesInMonth("biweekly", start, 2026, 1);
      expect(result.count).toBe(3);
      expect(result.dates[0].getDate()).toBe(3);
      expect(result.dates[1].getDate()).toBe(17);
      expect(result.dates[2].getDate()).toBe(31);
    });

    it("correctly projects from a distant start date", () => {
      // Start Jan 3 2025, check July 2026
      const start = new Date(2025, 0, 3);
      const result = getOccurrencesInMonth("biweekly", start, 2026, 7);
      // Should have 2 or 3 occurrences, dates should be valid July dates
      expect(result.count).toBeGreaterThanOrEqual(2);
      expect(result.count).toBeLessThanOrEqual(3);
      for (const d of result.dates) {
        expect(d.getMonth()).toBe(6); // July (0-indexed)
        expect(d.getFullYear()).toBe(2026);
      }
    });

    it("returns 0 if start date is after the month", () => {
      const start = new Date(2026, 6, 1); // Jul 2026
      const result = getOccurrencesInMonth("biweekly", start, 2026, 3);
      expect(result.count).toBe(0);
    });

    it("handles start date in the target month", () => {
      const start = new Date(2026, 2, 10); // Mar 10 2026
      const result = getOccurrencesInMonth("biweekly", start, 2026, 3);
      // Mar 10, Mar 24 = 2
      expect(result.count).toBe(2);
      expect(result.dates[0].getDate()).toBe(10);
      expect(result.dates[1].getDate()).toBe(24);
    });
  });

  // ==================== MONTHLY ====================
  describe("monthly", () => {
    it("returns 1 occurrence on the correct day", () => {
      const start = new Date(2026, 0, 15); // Jan 15
      const result = getOccurrencesInMonth("monthly", start, 2026, 3);
      expect(result.count).toBe(1);
      expect(result.dates[0].getDate()).toBe(15);
    });

    it("clamps to last day of month (31st in Feb)", () => {
      const start = new Date(2026, 0, 31); // Jan 31
      const result = getOccurrencesInMonth("monthly", start, 2026, 2);
      expect(result.count).toBe(1);
      expect(result.dates[0].getDate()).toBe(28); // Feb 2026 = 28 days
    });

    it("clamps to last day of month (31st in Apr)", () => {
      const start = new Date(2026, 0, 31); // Jan 31
      const result = getOccurrencesInMonth("monthly", start, 2026, 4);
      expect(result.count).toBe(1);
      expect(result.dates[0].getDate()).toBe(30); // April has 30 days
    });

    it("handles Feb 29 in leap year", () => {
      const start = new Date(2024, 1, 29); // Feb 29 2024 (leap year)
      // In 2026 (not a leap year), should clamp to Feb 28
      const result = getOccurrencesInMonth("monthly", start, 2026, 2);
      expect(result.count).toBe(1);
      expect(result.dates[0].getDate()).toBe(28);
    });

    it("handles Feb 29 in another leap year", () => {
      const start = new Date(2024, 1, 29); // Feb 29 2024
      // In 2028 (leap year), should be Feb 29
      const result = getOccurrencesInMonth("monthly", start, 2028, 2);
      expect(result.count).toBe(1);
      expect(result.dates[0].getDate()).toBe(29);
    });

    it("returns 0 if start date is in the future", () => {
      const start = new Date(2026, 5, 15); // Jun 15 2026
      const result = getOccurrencesInMonth("monthly", start, 2026, 3);
      expect(result.count).toBe(0);
    });
  });

  // ==================== QUARTERLY ====================
  describe("quarterly", () => {
    it("returns 1 in the correct quarter month", () => {
      const start = new Date(2026, 0, 15); // Jan 15
      // Quarterly from Jan: Jan, Apr, Jul, Oct
      const result = getOccurrencesInMonth("quarterly", start, 2026, 4);
      expect(result.count).toBe(1);
      expect(result.dates[0].getDate()).toBe(15);
    });

    it("returns 0 in non-quarter months", () => {
      const start = new Date(2026, 0, 15); // Jan
      const result = getOccurrencesInMonth("quarterly", start, 2026, 2);
      expect(result.count).toBe(0);
    });

    it("returns 0 if before start date", () => {
      const start = new Date(2026, 3, 15); // Apr 15
      const result = getOccurrencesInMonth("quarterly", start, 2026, 1);
      expect(result.count).toBe(0);
    });

    it("clamps day for short months", () => {
      const start = new Date(2025, 10, 30); // Nov 30 2025
      // Quarterly: Nov, Feb, May, Aug, Nov...
      // Feb 2026 should clamp to 28
      const result = getOccurrencesInMonth("quarterly", start, 2026, 2);
      expect(result.count).toBe(1);
      expect(result.dates[0].getDate()).toBe(28);
    });
  });

  // ==================== SEMI-ANNUAL ====================
  describe("semiannual", () => {
    it("returns 1 every 6 months", () => {
      const start = new Date(2026, 0, 10); // Jan 10
      // Semi-annual: Jan, Jul
      expect(getOccurrencesInMonth("semiannual", start, 2026, 1).count).toBe(1);
      expect(getOccurrencesInMonth("semiannual", start, 2026, 7).count).toBe(1);
    });

    it("returns 0 for off months", () => {
      const start = new Date(2026, 0, 10); // Jan
      expect(getOccurrencesInMonth("semiannual", start, 2026, 3).count).toBe(0);
      expect(getOccurrencesInMonth("semiannual", start, 2026, 6).count).toBe(0);
    });
  });

  // ==================== ANNUAL ====================
  describe("annual", () => {
    it("returns 1 only in the anniversary month", () => {
      const start = new Date(2025, 2, 15); // Mar 15 2025
      expect(getOccurrencesInMonth("annual", start, 2026, 3).count).toBe(1);
      expect(getOccurrencesInMonth("annual", start, 2027, 3).count).toBe(1);
    });

    it("returns 0 for other months", () => {
      const start = new Date(2025, 2, 15); // Mar
      expect(getOccurrencesInMonth("annual", start, 2026, 1).count).toBe(0);
      expect(getOccurrencesInMonth("annual", start, 2026, 12).count).toBe(0);
    });

    it("returns 0 before start year anniversary", () => {
      const start = new Date(2026, 5, 1); // Jun 2026
      expect(getOccurrencesInMonth("annual", start, 2026, 3).count).toBe(0);
    });
  });
});
