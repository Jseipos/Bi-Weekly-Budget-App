"use server";

import { getRecurringItems } from "@/actions/recurring";
import { getOccurrencesInMonth } from "@/lib/date-calc";
import {
  getActualSpendingByCategory,
  getPredictedSpending,
} from "@/lib/predictions";
import type {
  MonthlyBreakdown,
  RecurringItem,
  RecurringItemWithOccurrences,
  CategorySpending,
} from "@/types";

/**
 * Orchestrates all data needed for the dashboard monthly view.
 *
 * 1. Fetches active recurring items and calculates occurrences for the month
 * 2. Sums income and recurring expenses
 * 3. Gets actual + predicted unplanned spending by category
 * 4. Computes net balance and predicted net balance
 */
export async function getMonthlyBreakdown(
  year: number,
  month: number
): Promise<MonthlyBreakdown> {
  // 1. Fetch all active recurring items
  const items = (await getRecurringItems()) as RecurringItem[];

  // 2. Calculate occurrences for each item in the target month
  const recurringItems: RecurringItemWithOccurrences[] = items.map((item) => {
    const startDate = new Date(item.startDate + "T00:00:00");
    const result = getOccurrencesInMonth(
      item.frequency,
      startDate,
      year,
      month
    );

    return {
      item,
      occurrences: result.count,
      dates: result.dates.map((d) => d.toISOString().split("T")[0]),
      totalForMonth: item.amount * result.count,
    };
  });

  // 3. Sum income and recurring expenses
  const totalIncome = recurringItems
    .filter((ri) => ri.item.type === "income")
    .reduce((sum, ri) => sum + ri.totalForMonth, 0);

  const totalRecurringExpenses = recurringItems
    .filter((ri) => ri.item.type === "expense")
    .reduce((sum, ri) => sum + ri.totalForMonth, 0);

  // 4. Get actual unplanned spending by category
  const actualByCategory = getActualSpendingByCategory(year, month);

  // 5. Get predicted spending (rolling 3-month average)
  const predictedMap = getPredictedSpending(year, month);

  // 6. Merge actual + predicted into CategorySpending array
  // Collect all categories from both sources
  const allCategories = new Set<string>();
  for (const row of actualByCategory) {
    allCategories.add(row.category);
  }
  for (const cat of predictedMap.keys()) {
    allCategories.add(cat);
  }

  const actualMap = new Map(actualByCategory.map((r) => [r.category, r.total]));

  const unplannedByCategory: CategorySpending[] = Array.from(allCategories)
    .map((category) => ({
      category,
      actual: actualMap.get(category) ?? 0,
      predicted: predictedMap.get(category) ?? 0,
    }))
    .sort((a, b) => b.actual - a.actual);

  // 7. Compute totals
  const totalUnplanned = unplannedByCategory.reduce(
    (sum, c) => sum + c.actual,
    0
  );
  const totalPredictedUnplanned = unplannedByCategory.reduce(
    (sum, c) => sum + c.predicted,
    0
  );

  // 8. Net balance calculations
  const netBalance = totalIncome - totalRecurringExpenses - totalUnplanned;
  const predictedNetBalance =
    totalIncome - totalRecurringExpenses - totalPredictedUnplanned;

  return {
    year,
    month,
    recurringItems,
    totalIncome,
    totalRecurringExpenses,
    unplannedByCategory,
    totalUnplanned,
    totalPredictedUnplanned,
    netBalance,
    predictedNetBalance,
    debtRecommendation: null, // Phase 2 feature
  };
}
