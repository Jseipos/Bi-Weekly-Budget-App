import { describe, it, expect } from "vitest";
import { amortize, compareExtra, rankDebts, simulateMultiDebt } from "../debt-calc";
import type { Debt } from "@/types";

// ---- Helper to create mock debts ----
function makeMockDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: 1,
    name: "Credit Card",
    currentBalance: 5000,
    interestRate: 24.99,
    minimumPayment: 100,
    recurringItemId: null,
    dueDay: 15,
    isActive: true,
    createdAt: "2026-01-01",
    ...overrides,
  };
}

// ============================================================
// amortize
// ============================================================
describe("amortize", () => {
  it("returns empty schedule with 0 months/interest/paid for zero balance", () => {
    const result = amortize(0, 24, 100);
    expect(result.schedule).toEqual([]);
    expect(result.totalMonths).toBe(0);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(0);
  });

  it("returns empty schedule for negative balance", () => {
    const result = amortize(-500, 24, 100);
    expect(result.schedule).toEqual([]);
    expect(result.totalMonths).toBe(0);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(0);
  });

  it("computes a reasonable schedule for normal debt ($1000, 24% APR, $100/month)", () => {
    const result = amortize(1000, 24, 100);

    // At 24% APR the debt should be paid off in about 11-12 months
    expect(result.totalMonths).toBeGreaterThanOrEqual(10);
    expect(result.totalMonths).toBeLessThanOrEqual(13);

    // Total interest should be positive and less than the original balance
    expect(result.totalInterest).toBeGreaterThan(0);
    expect(result.totalInterest).toBeLessThan(1000);

    // Total paid = principal + interest
    expect(result.totalPaid).toBeCloseTo(1000 + result.totalInterest, 1);

    // Schedule length matches totalMonths
    expect(result.schedule).toHaveLength(result.totalMonths);
  });

  it("returns sentinel -1 values when payment does not cover interest", () => {
    // $10,000 at 24% APR => first month interest = 10000 * 0.24/12 = $200
    // Payment of $150 does not cover $200 interest
    const result = amortize(10000, 24, 150);
    expect(result.totalMonths).toBe(-1);
    expect(result.totalInterest).toBe(-1);
    expect(result.totalPaid).toBe(-1);
    expect(result.schedule).toEqual([]);
  });

  it("returns sentinel -1 when payment exactly equals interest", () => {
    // balance 1200 at 12% APR => monthly interest = 1200 * 0.01 = $12
    const result = amortize(1200, 12, 12);
    expect(result.totalMonths).toBe(-1);
    expect(result.totalInterest).toBe(-1);
    expect(result.totalPaid).toBe(-1);
  });

  it("pays off small balance in 1 month", () => {
    // $50 at 12% APR, $100/month
    // Interest = 50 * 0.01 = $0.50
    // Payment = min(100, 50.50) = $50.50
    const result = amortize(50, 12, 100);
    expect(result.totalMonths).toBe(1);
    expect(result.schedule).toHaveLength(1);
    expect(result.schedule[0].remainingBalance).toBe(0);
    expect(result.totalPaid).toBeCloseTo(50.5, 1);
  });

  it("final payment is less than regular payment and remaining balance is 0", () => {
    const result = amortize(1000, 24, 100);
    const lastEntry = result.schedule[result.schedule.length - 1];

    // Last payment should be <= regular payment
    expect(lastEntry.payment).toBeLessThanOrEqual(100);
    // Remaining balance should be 0
    expect(lastEntry.remainingBalance).toBe(0);
  });

  it("handles 0% APR correctly", () => {
    // $500 at 0% APR, $100/month => 5 months, no interest
    const result = amortize(500, 0, 100);
    expect(result.totalMonths).toBe(5);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(500);
  });

  it("every schedule entry has positive month number", () => {
    const result = amortize(2000, 18, 100);
    for (let i = 0; i < result.schedule.length; i++) {
      expect(result.schedule[i].month).toBe(i + 1);
    }
  });
});

// ============================================================
// compareExtra
// ============================================================
describe("compareExtra", () => {
  it("extra payment reduces months and interest saved", () => {
    const result = compareExtra(5000, 24.99, 100, 50);

    // With extra, should pay off faster
    expect(result.monthsSaved).toBeGreaterThan(0);
    expect(result.interestSaved).toBeGreaterThan(0);

    // With extra should have fewer months
    expect(result.withExtra.totalMonths).toBeLessThan(result.withoutExtra.totalMonths);

    // With extra should have less total interest
    expect(result.withExtra.totalInterest).toBeLessThan(result.withoutExtra.totalInterest);
  });

  it("zero extra should have 0 months saved and 0 interest saved", () => {
    const result = compareExtra(5000, 24.99, 100, 0);

    expect(result.monthsSaved).toBe(0);
    expect(result.interestSaved).toBe(0);

    // Both schedules should be identical
    expect(result.withoutExtra.totalMonths).toBe(result.withExtra.totalMonths);
    expect(result.withoutExtra.totalInterest).toBe(result.withExtra.totalInterest);
  });

  it("large extra payment drastically reduces payoff time", () => {
    const result = compareExtra(5000, 24.99, 100, 400);

    // $500/month vs $100/month should be roughly 5x faster
    expect(result.monthsSaved).toBeGreaterThan(20);
    expect(result.interestSaved).toBeGreaterThan(0);
  });

  it("handles case where base payment is insufficient", () => {
    // $10,000 at 24%, $150/month doesn't cover interest
    // Extra of $100 brings it to $250 which does cover interest
    const result = compareExtra(10000, 24, 150, 100);

    // Without extra has sentinel values, so monthsSaved/interestSaved = 0
    expect(result.withoutExtra.totalMonths).toBe(-1);
    expect(result.monthsSaved).toBe(0);
    expect(result.interestSaved).toBe(0);
  });
});

// ============================================================
// rankDebts
// ============================================================
describe("rankDebts", () => {
  it("avalanche: ranks highest APR first", () => {
    const debts: Debt[] = [
      makeMockDebt({ id: 1, name: "Low APR", interestRate: 5, currentBalance: 10000 }),
      makeMockDebt({ id: 2, name: "High APR", interestRate: 24.99, currentBalance: 2000 }),
      makeMockDebt({ id: 3, name: "Mid APR", interestRate: 15, currentBalance: 5000 }),
    ];

    const ranked = rankDebts(debts, "avalanche");
    expect(ranked).toHaveLength(3);
    expect(ranked[0].debt.name).toBe("High APR");
    expect(ranked[1].debt.name).toBe("Mid APR");
    expect(ranked[2].debt.name).toBe("Low APR");

    // Rank numbers are 1-indexed
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);
  });

  it("snowball: ranks lowest balance first", () => {
    const debts: Debt[] = [
      makeMockDebt({ id: 1, name: "Big Balance", interestRate: 5, currentBalance: 10000 }),
      makeMockDebt({ id: 2, name: "Small Balance", interestRate: 24.99, currentBalance: 500 }),
      makeMockDebt({ id: 3, name: "Med Balance", interestRate: 15, currentBalance: 3000 }),
    ];

    const ranked = rankDebts(debts, "snowball");
    expect(ranked).toHaveLength(3);
    expect(ranked[0].debt.name).toBe("Small Balance");
    expect(ranked[1].debt.name).toBe("Med Balance");
    expect(ranked[2].debt.name).toBe("Big Balance");
  });

  it("returns empty array for empty input", () => {
    const ranked = rankDebts([], "avalanche");
    expect(ranked).toEqual([]);
  });

  it("filters out inactive debts", () => {
    const debts: Debt[] = [
      makeMockDebt({ id: 1, name: "Active", isActive: true, currentBalance: 1000 }),
      makeMockDebt({ id: 2, name: "Inactive", isActive: false, currentBalance: 2000 }),
    ];

    const ranked = rankDebts(debts, "avalanche");
    expect(ranked).toHaveLength(1);
    expect(ranked[0].debt.name).toBe("Active");
  });

  it("filters out debts with zero balance", () => {
    const debts: Debt[] = [
      makeMockDebt({ id: 1, name: "Has Balance", currentBalance: 1000 }),
      makeMockDebt({ id: 2, name: "Paid Off", currentBalance: 0 }),
    ];

    const ranked = rankDebts(debts, "snowball");
    expect(ranked).toHaveLength(1);
    expect(ranked[0].debt.name).toBe("Has Balance");
  });

  it("calculates monthly interest cost correctly", () => {
    const debts: Debt[] = [
      makeMockDebt({ id: 1, currentBalance: 12000, interestRate: 12 }),
    ];

    const ranked = rankDebts(debts, "avalanche");
    // monthlyInterestCost = 12000 * (12 / 100 / 12) = 12000 * 0.01 = 120
    expect(ranked[0].monthlyInterestCost).toBe(120);
  });

  it("calculates monthly interest cost with rounding", () => {
    const debts: Debt[] = [
      makeMockDebt({ id: 1, currentBalance: 5000, interestRate: 24.99 }),
    ];

    const ranked = rankDebts(debts, "avalanche");
    // monthlyInterestCost = 5000 * (24.99 / 100 / 12) = 5000 * 0.020825 = 104.125
    // Rounded to 104.13
    expect(ranked[0].monthlyInterestCost).toBe(104.13);
  });
});

// ============================================================
// simulateMultiDebt
// ============================================================
describe("simulateMultiDebt", () => {
  it("returns 0 months for empty debts", () => {
    const result = simulateMultiDebt([], 100, "avalanche");
    expect(result.totalMonths).toBe(0);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(0);
    expect(result.debtPayoffOrder).toEqual([]);
    expect(result.strategy).toBe("avalanche");
  });

  it("simulates single debt payoff", () => {
    const debts: Debt[] = [
      makeMockDebt({ id: 1, currentBalance: 1000, interestRate: 12, minimumPayment: 100 }),
    ];

    const result = simulateMultiDebt(debts, 0, "avalanche");
    expect(result.totalMonths).toBeGreaterThan(0);
    expect(result.totalMonths).toBeLessThanOrEqual(12);
    expect(result.totalInterest).toBeGreaterThan(0);
    expect(result.debtPayoffOrder).toHaveLength(1);
    expect(result.debtPayoffOrder[0].debtId).toBe(1);
  });

  it("avalanche: pays off highest APR debt first with two debts", () => {
    const debts: Debt[] = [
      makeMockDebt({
        id: 1,
        name: "Low APR",
        currentBalance: 3000,
        interestRate: 6,
        minimumPayment: 50,
      }),
      makeMockDebt({
        id: 2,
        name: "High APR",
        currentBalance: 3000,
        interestRate: 24,
        minimumPayment: 50,
      }),
    ];

    const result = simulateMultiDebt(debts, 100, "avalanche");

    // High APR (id=2) should be paid off before Low APR (id=1)
    expect(result.debtPayoffOrder.length).toBe(2);
    expect(result.debtPayoffOrder[0].debtId).toBe(2);
    expect(result.debtPayoffOrder[1].debtId).toBe(1);

    // First debt should be paid off in fewer months than the second
    expect(result.debtPayoffOrder[0].payoffMonth).toBeLessThan(
      result.debtPayoffOrder[1].payoffMonth
    );
  });

  it("snowball: pays off lowest balance debt first with two debts", () => {
    const debts: Debt[] = [
      makeMockDebt({
        id: 1,
        name: "Big Balance",
        currentBalance: 8000,
        interestRate: 24,
        minimumPayment: 100,
      }),
      makeMockDebt({
        id: 2,
        name: "Small Balance",
        currentBalance: 1000,
        interestRate: 6,
        minimumPayment: 50,
      }),
    ];

    const result = simulateMultiDebt(debts, 100, "snowball");

    // Small Balance (id=2) should be paid off before Big Balance (id=1)
    expect(result.debtPayoffOrder.length).toBe(2);
    expect(result.debtPayoffOrder[0].debtId).toBe(2);
    expect(result.debtPayoffOrder[1].debtId).toBe(1);
  });

  it("extra budget accelerates payoff", () => {
    const debts: Debt[] = [
      makeMockDebt({
        id: 1,
        currentBalance: 5000,
        interestRate: 18,
        minimumPayment: 100,
      }),
    ];

    const noExtra = simulateMultiDebt(debts, 0, "avalanche");
    const withExtra = simulateMultiDebt(debts, 200, "avalanche");

    expect(withExtra.totalMonths).toBeLessThan(noExtra.totalMonths);
    expect(withExtra.totalInterest).toBeLessThan(noExtra.totalInterest);
  });

  it("filters out inactive debts from simulation", () => {
    const debts: Debt[] = [
      makeMockDebt({ id: 1, name: "Active", isActive: true, currentBalance: 1000 }),
      makeMockDebt({ id: 2, name: "Inactive", isActive: false, currentBalance: 5000 }),
    ];

    const result = simulateMultiDebt(debts, 0, "avalanche");
    expect(result.debtPayoffOrder).toHaveLength(1);
    expect(result.debtPayoffOrder[0].debtName).toBe("Active");
  });

  it("reports correct strategy in result", () => {
    const debts: Debt[] = [makeMockDebt()];

    expect(simulateMultiDebt(debts, 0, "avalanche").strategy).toBe("avalanche");
    expect(simulateMultiDebt(debts, 0, "snowball").strategy).toBe("snowball");
  });

  it("totalPaid accounts for interest", () => {
    const debts: Debt[] = [
      makeMockDebt({
        id: 1,
        currentBalance: 2000,
        interestRate: 24,
        minimumPayment: 100,
      }),
    ];

    const result = simulateMultiDebt(debts, 0, "avalanche");
    // totalPaid should be greater than the original balance due to interest
    expect(result.totalPaid).toBeGreaterThan(2000);
    expect(result.totalInterest).toBeGreaterThan(0);
  });
});
