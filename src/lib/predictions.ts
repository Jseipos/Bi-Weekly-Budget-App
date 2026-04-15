import { db } from "@/db";
import { unplannedExpenses } from "@/db/schema";
import { sql, and, like } from "drizzle-orm";
import { subMonths, format } from "date-fns";

interface CategoryTotal {
  category: string;
  total: number;
}

/**
 * Get the rolling 3-month average of unplanned spending per category.
 *
 * Looks at the 3 months prior to the given month and computes
 * the average spending per category. Categories with zero spending
 * in all 3 prior months return 0.
 */
export function getPredictedSpending(
  year: number,
  month: number
): Map<string, number> {
  const predictions = new Map<string, number>();

  // Get the 3 previous months
  const monthTotals: Map<string, number[]> = new Map();

  for (let i = 1; i <= 3; i++) {
    const d = subMonths(new Date(year, month - 1), i);
    const yearMonth = format(d, "yyyy-MM");

    // Query spending by category for this month
    const results = db
      .select({
        category: unplannedExpenses.category,
        total: sql<number>`SUM(${unplannedExpenses.amount})`.as("total"),
      })
      .from(unplannedExpenses)
      .where(like(unplannedExpenses.date, `${yearMonth}%`))
      .groupBy(unplannedExpenses.category)
      .all();

    for (const row of results) {
      if (!monthTotals.has(row.category)) {
        monthTotals.set(row.category, []);
      }
      monthTotals.get(row.category)!.push(row.total);
    }
  }

  // Compute averages (only non-zero months)
  for (const [category, totals] of monthTotals) {
    const nonZero = totals.filter((t) => t > 0);
    if (nonZero.length === 0) {
      predictions.set(category, 0);
    } else {
      const avg = nonZero.reduce((sum, t) => sum + t, 0) / nonZero.length;
      predictions.set(category, Math.round(avg * 100) / 100);
    }
  }

  return predictions;
}

/**
 * Get actual unplanned spending by category for a given month.
 */
export function getActualSpendingByCategory(
  year: number,
  month: number
): CategoryTotal[] {
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

  return db
    .select({
      category: unplannedExpenses.category,
      total: sql<number>`SUM(${unplannedExpenses.amount})`.as("total"),
    })
    .from(unplannedExpenses)
    .where(like(unplannedExpenses.date, `${yearMonth}%`))
    .groupBy(unplannedExpenses.category)
    .all();
}
