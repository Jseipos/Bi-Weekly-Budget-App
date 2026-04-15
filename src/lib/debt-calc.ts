import type {
  AmortizationEntry,
  AmortizationResult,
  ExtraPaymentComparison,
  Debt,
  DebtRanking,
  PaydownStrategy,
  MultiDebtSimulationResult,
} from "@/types";

const MAX_MONTHS = 600; // 50 year cap to prevent infinite loops

/**
 * Calculate a full amortization schedule for a single debt.
 *
 * Uses standard monthly compounding:
 *   monthlyRate = APR / 100 / 12
 *   interestCharge = remainingBalance * monthlyRate
 *   principalPaid = payment - interestCharge
 *   newBalance = remainingBalance - principalPaid
 */
export function amortize(
  balance: number,
  apr: number,
  monthlyPayment: number
): AmortizationResult {
  if (balance <= 0) {
    return { schedule: [], totalMonths: 0, totalInterest: 0, totalPaid: 0 };
  }

  const monthlyRate = apr / 100 / 12;
  const schedule: AmortizationEntry[] = [];
  let remaining = balance;
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;

  // Check if payment covers at least the monthly interest
  const firstMonthInterest = remaining * monthlyRate;
  if (monthlyPayment <= firstMonthInterest && apr > 0) {
    // Payment doesn't cover interest — debt will never be paid off
    return {
      schedule: [],
      totalMonths: -1, // Sentinel: underpayment
      totalInterest: -1,
      totalPaid: -1,
    };
  }

  while (remaining > 0.005 && month < MAX_MONTHS) {
    month++;
    const interest = remaining * monthlyRate;
    // Last payment may be less than the regular payment
    const payment = Math.min(monthlyPayment, remaining + interest);
    const principal = payment - interest;
    remaining = Math.max(0, remaining - principal);

    totalInterest += interest;
    totalPaid += payment;

    schedule.push({
      month,
      payment: Math.round(payment * 100) / 100,
      principal: Math.round(principal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      remainingBalance: Math.round(remaining * 100) / 100,
    });
  }

  return {
    schedule,
    totalMonths: month,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
  };
}

/**
 * Compare payoff with and without an extra payment amount.
 */
export function compareExtra(
  balance: number,
  apr: number,
  minPayment: number,
  extraAmount: number
): ExtraPaymentComparison {
  const withoutExtra = amortize(balance, apr, minPayment);
  const withExtra = amortize(balance, apr, minPayment + extraAmount);

  const monthsSaved =
    withoutExtra.totalMonths >= 0 && withExtra.totalMonths >= 0
      ? withoutExtra.totalMonths - withExtra.totalMonths
      : 0;

  const interestSaved =
    withoutExtra.totalInterest >= 0 && withExtra.totalInterest >= 0
      ? withoutExtra.totalInterest - withExtra.totalInterest
      : 0;

  return {
    withoutExtra,
    withExtra,
    monthsSaved,
    interestSaved: Math.round(interestSaved * 100) / 100,
  };
}

/**
 * Rank debts by priority based on strategy.
 *
 * Avalanche: highest APR first (saves the most money)
 * Snowball: lowest balance first (psychological wins)
 */
export function rankDebts(
  debtsInput: Debt[],
  strategy: PaydownStrategy
): DebtRanking[] {
  const activeDebts = debtsInput.filter(
    (d) => d.isActive && d.currentBalance > 0
  );

  const sorted = [...activeDebts].sort((a, b) => {
    if (strategy === "avalanche") {
      // Highest APR first
      return b.interestRate - a.interestRate;
    } else {
      // Lowest balance first
      return a.currentBalance - b.currentBalance;
    }
  });

  return sorted.map((debt, index) => ({
    debt,
    monthlyInterestCost:
      Math.round((debt.currentBalance * (debt.interestRate / 100 / 12)) * 100) /
      100,
    rank: index + 1,
  }));
}

/**
 * Simulate paying off multiple debts with a given extra monthly budget.
 *
 * Strategy:
 * 1. Make minimum payments on all debts
 * 2. Apply all extra money to the #1 priority debt
 * 3. When a debt is paid off, roll its minimum payment into the next debt
 * 4. Continue until all debts are paid off
 */
export function simulateMultiDebt(
  debtsInput: Debt[],
  extraBudget: number,
  strategy: PaydownStrategy
): MultiDebtSimulationResult {
  const activeDebts = debtsInput.filter(
    (d) => d.isActive && d.currentBalance > 0
  );

  if (activeDebts.length === 0) {
    return {
      strategy,
      totalMonths: 0,
      totalInterest: 0,
      totalPaid: 0,
      debtPayoffOrder: [],
    };
  }

  // Create working copies sorted by strategy
  const debtStates = activeDebts
    .map((d) => ({
      id: d.id,
      name: d.name,
      balance: d.currentBalance,
      apr: d.interestRate,
      minPayment: d.minimumPayment,
      monthlyRate: d.interestRate / 100 / 12,
      paidOff: false,
      payoffMonth: 0,
    }))
    .sort((a, b) => {
      if (strategy === "avalanche") return b.apr - a.apr;
      return a.balance - b.balance;
    });

  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;
  let availableExtra = extraBudget;
  const payoffOrder: Array<{ debtId: number; debtName: string; payoffMonth: number }> = [];

  while (debtStates.some((d) => !d.paidOff) && month < MAX_MONTHS) {
    month++;

    // Track freed-up minimum payments from debts paid off this month
    let freedMinPayments = 0;

    // Phase 1: Apply interest and minimum payments to all active debts
    for (const debt of debtStates) {
      if (debt.paidOff) continue;

      const interest = debt.balance * debt.monthlyRate;
      debt.balance += interest;
      totalInterest += interest;

      const payment = Math.min(debt.minPayment, debt.balance);
      debt.balance -= payment;
      totalPaid += payment;

      if (debt.balance <= 0.005) {
        debt.balance = 0;
        debt.paidOff = true;
        debt.payoffMonth = month;
        payoffOrder.push({
          debtId: debt.id,
          debtName: debt.name,
          payoffMonth: month,
        });
        // Roll this debt's minimum payment into available extra
        freedMinPayments += debt.minPayment;
      }
    }

    // Phase 2: Apply extra + freed minimums to the highest priority unpaid debt
    let extraThisMonth = availableExtra + freedMinPayments;

    // Find the first unpaid debt (by priority order)
    for (const debt of debtStates) {
      if (debt.paidOff || extraThisMonth <= 0) continue;

      const payment = Math.min(extraThisMonth, debt.balance);
      debt.balance -= payment;
      totalPaid += payment;
      extraThisMonth -= payment;

      if (debt.balance <= 0.005) {
        debt.balance = 0;
        debt.paidOff = true;
        debt.payoffMonth = month;
        payoffOrder.push({
          debtId: debt.id,
          debtName: debt.name,
          payoffMonth: month,
        });
        // Roll this debt's minimum into the available pool for the next debt
        extraThisMonth += debt.minPayment;
      }

      // Apply remaining extra to the next priority debt
    }

    // After a debt is paid off, permanently increase the available extra
    availableExtra = extraBudget;
    for (const debt of debtStates) {
      if (debt.paidOff) {
        availableExtra += debt.minPayment;
      }
    }
  }

  return {
    strategy,
    totalMonths: month,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    debtPayoffOrder: payoffOrder,
  };
}
