import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatMonthYear,
  todayISO,
  sanitizeFilename,
  formatPercent,
} from "../utils";

// ============================================================
// formatCurrency
// ============================================================
describe("formatCurrency", () => {
  it("formats a positive number as US dollars", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats zero as $0.00", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats a large number with commas", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000.00");
  });

  it("formats a negative number", () => {
    const result = formatCurrency(-42.5);
    // Intl may use minus sign or accounting brackets; just check the digits
    expect(result).toContain("42.50");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(9.999)).toBe("$10.00");
  });

  it("adds trailing zero for whole cents", () => {
    expect(formatCurrency(5.1)).toBe("$5.10");
  });
});

// ============================================================
// formatDate
// ============================================================
describe("formatDate", () => {
  it("formats a normal date string (YYYY-MM-DD)", () => {
    const result = formatDate("2026-03-15");
    // en-US short month: "Mar 15, 2026"
    expect(result).toBe("Mar 15, 2026");
  });

  it("formats a January date", () => {
    const result = formatDate("2026-01-01");
    expect(result).toBe("Jan 1, 2026");
  });

  it("formats a December date", () => {
    const result = formatDate("2025-12-31");
    expect(result).toBe("Dec 31, 2025");
  });
});

// ============================================================
// formatDateShort
// ============================================================
describe("formatDateShort", () => {
  it("formats a normal date string without year", () => {
    const result = formatDateShort("2026-03-15");
    // en-US short: "Mar 15"
    expect(result).toBe("Mar 15");
  });

  it("formats single-digit day", () => {
    const result = formatDateShort("2026-07-03");
    expect(result).toBe("Jul 3");
  });
});

// ============================================================
// formatMonthYear
// ============================================================
describe("formatMonthYear", () => {
  it("formats January 2026", () => {
    const result = formatMonthYear(2026, 1);
    expect(result).toBe("January 2026");
  });

  it("formats December 2025", () => {
    const result = formatMonthYear(2025, 12);
    expect(result).toBe("December 2025");
  });

  it("formats June 2030", () => {
    const result = formatMonthYear(2030, 6);
    expect(result).toBe("June 2030");
  });
});

// ============================================================
// todayISO
// ============================================================
describe("todayISO", () => {
  it("returns a string matching YYYY-MM-DD format", () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's actual date", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(todayISO()).toBe(expected);
  });
});

// ============================================================
// sanitizeFilename
// ============================================================
describe("sanitizeFilename", () => {
  it("removes special characters", () => {
    expect(sanitizeFilename("hello@world!")).toBe("helloworld");
  });

  it("keeps alphanumeric characters, hyphens, and underscores", () => {
    expect(sanitizeFilename("my-file_name123")).toBe("my-file_name123");
  });

  it("removes spaces", () => {
    expect(sanitizeFilename("hello world")).toBe("helloworld");
  });

  it("truncates to 50 characters", () => {
    const longString = "a".repeat(100);
    expect(sanitizeFilename(longString)).toHaveLength(50);
  });

  it("handles empty string", () => {
    expect(sanitizeFilename("")).toBe("");
  });

  it("removes all non-allowed characters", () => {
    expect(sanitizeFilename("café résumé & more!")).toBe("cafrsummore");
  });

  it("handles string that is exactly 50 characters", () => {
    const exact50 = "a".repeat(50);
    expect(sanitizeFilename(exact50)).toBe(exact50);
    expect(sanitizeFilename(exact50)).toHaveLength(50);
  });
});

// ============================================================
// formatPercent
// ============================================================
describe("formatPercent", () => {
  it("formats 0 as 0.00%", () => {
    expect(formatPercent(0)).toBe("0.00%");
  });

  it("formats 24.99 as 24.99%", () => {
    expect(formatPercent(24.99)).toBe("24.99%");
  });

  it("formats 100 as 100.00%", () => {
    expect(formatPercent(100)).toBe("100.00%");
  });

  it("formats a decimal with more than 2 places", () => {
    expect(formatPercent(33.333)).toBe("33.33%");
  });

  it("formats a whole number with trailing zeros", () => {
    expect(formatPercent(5)).toBe("5.00%");
  });
});
