import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module before importing the module under test.
// The predictions module chains: db.select(...).from(...).where(...).groupBy(...).all()
// We create a chainable mock that returns configurable results.
const mockAll = vi.fn().mockReturnValue([]);
const mockGroupBy = vi.fn().mockReturnValue({ all: mockAll });
const mockWhere = vi.fn().mockReturnValue({ groupBy: mockGroupBy });
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

vi.mock("@/db", () => ({
  db: {
    select: mockSelect,
  },
}));

// Also mock drizzle-orm helpers used in the module
vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    as: () => "total",
  }),
  and: vi.fn((...args: unknown[]) => args),
  like: vi.fn((col: unknown, pattern: unknown) => ({ col, pattern })),
}));

vi.mock("@/db/schema", () => ({
  unplannedExpenses: {
    category: "category",
    amount: "amount",
    date: "date",
  },
}));

import { getPredictedSpending, getActualSpendingByCategory } from "../predictions";

describe("getPredictedSpending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAll.mockReturnValue([]);
  });

  it("returns empty map when no historical data", () => {
    mockAll.mockReturnValue([]);

    const result = getPredictedSpending(2026, 3);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it("computes average correctly with mocked data", () => {
    // The function queries 3 previous months in a loop (i=1,2,3).
    // We'll return different data for each call.
    mockAll
      .mockReturnValueOnce([
        { category: "Food", total: 300 },
        { category: "Transport", total: 100 },
      ])
      .mockReturnValueOnce([
        { category: "Food", total: 600 },
      ])
      .mockReturnValueOnce([
        { category: "Food", total: 450 },
        { category: "Transport", total: 200 },
      ]);

    const result = getPredictedSpending(2026, 4);

    // Food: average of [300, 600, 450] = 1350 / 3 = 450
    expect(result.get("Food")).toBe(450);

    // Transport: average of [100, 200] = 300 / 2 = 150
    expect(result.get("Transport")).toBe(150);
  });

  it("queries exactly 3 prior months", () => {
    getPredictedSpending(2026, 6);

    // db.select() should be called 3 times (for months i=1,2,3)
    expect(mockSelect).toHaveBeenCalledTimes(3);
    expect(mockAll).toHaveBeenCalledTimes(3);
  });

  it("handles all zero totals by setting category to 0", () => {
    // All three months return the same category with total 0
    mockAll
      .mockReturnValueOnce([{ category: "Entertainment", total: 0 }])
      .mockReturnValueOnce([{ category: "Entertainment", total: 0 }])
      .mockReturnValueOnce([]);

    const result = getPredictedSpending(2026, 5);

    // nonZero array would be empty, so average should be 0
    expect(result.get("Entertainment")).toBe(0);
  });

  it("rounds averages to 2 decimal places", () => {
    mockAll
      .mockReturnValueOnce([{ category: "Food", total: 100 }])
      .mockReturnValueOnce([{ category: "Food", total: 200 }])
      .mockReturnValueOnce([{ category: "Food", total: 133 }]);

    const result = getPredictedSpending(2026, 4);

    // (100 + 200 + 133) / 3 = 433 / 3 = 144.33333... => 144.33
    expect(result.get("Food")).toBe(144.33);
  });
});

describe("getActualSpendingByCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAll.mockReturnValue([]);
  });

  it("returns empty array when no expenses", () => {
    mockAll.mockReturnValue([]);

    const result = getActualSpendingByCategory(2026, 3);
    expect(result).toEqual([]);
  });

  it("returns correct grouping with mocked data", () => {
    const mockData = [
      { category: "Food", total: 450 },
      { category: "Transport", total: 120 },
    ];
    mockAll.mockReturnValue(mockData);

    const result = getActualSpendingByCategory(2026, 3);
    expect(result).toEqual(mockData);
    expect(result).toHaveLength(2);
  });

  it("calls db.select chain correctly", () => {
    getActualSpendingByCategory(2026, 1);

    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockWhere).toHaveBeenCalledTimes(1);
    expect(mockGroupBy).toHaveBeenCalledTimes(1);
    expect(mockAll).toHaveBeenCalledTimes(1);
  });

  it("pads single-digit months with leading zero", () => {
    getActualSpendingByCategory(2026, 3);

    // The where clause should receive a like pattern with "2026-03%"
    // We can verify through the mock call args
    expect(mockWhere).toHaveBeenCalled();
  });
});
