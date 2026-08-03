import { db } from "@/db";
import { unplannedExpenses, importedTransactions } from "@/db/schema";
import { sql, like } from "drizzle-orm";
import { subMonths, format } from "date-fns";

interface CategoryTotal {
  category: string;
  total: number;
}

/**
 * Merge two category-total lists into one, summing duplicates.
 * Used to combine manually-logged unplanned expenses with imported
 * statement transactions for the same month.
 */
function mergeTotals(...sources: CategoryTotal[][]): CategoryTotal[] {
  const merged = new Map<string, number>();
  for (const src of sources) {
    for (const row of src) {
      merged.set(row.category, (merged.get(row.category) ?? 0) + row.total);
    }
  }
  return Array.from(merged.entries()).map(([category, total]) => ({
    category,
    total,
  }));
}

/**
 * Get expense totals from imported_transactions for a year-month.
 *
 * Imported amounts are SIGNED — negative is an expense (outflow). We
 * flip the sign on expenses to align with unplanned_expenses where
 * amounts are stored as positive numbers. Income/refund rows
 * (positive amounts) and uncategorized rows are excluded from the
 * spending breakdown.
 */
function getImportedExpenseTotalsForMonth(yearMonth: string): CategoryTotal[] {
  const rows = db
    .select({
      category: importedTransactions.category,
      total: sql<number>`SUM(-${importedTransactions.amount})`.as("total"),
    })
    .from(importedTransactions)
    .where(
      sql`${importedTransactions.date} LIKE ${yearMonth + "%"}
          AND ${importedTransactions.category} IS NOT NULL
          AND ${importedTransactions.amount} < 0`,
    )
    .groupBy(importedTransactions.category)
    .all();
  return rows
    .filter((r): r is { category: string; total: number } => r.category !== null)
    .map((r) => ({ category: r.category, total: r.total }));
}

/**
 * Get the rolling 3-month average of unplanned spending per category.
 *
 * Looks at the 3 months prior to the given month and computes
 * the average spending per category. Categories with zero spending
 * in all 3 prior months return 0.
 *
 * Pulls from BOTH `unplanned_expenses` and categorized rows in
 * `imported_transactions` (negative amounts only).
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

    // Manually-logged expenses
    const unplannedResults = db
      .select({
        category: unplannedExpenses.category,
        total: sql<number>`SUM(${unplannedExpenses.amount})`.as("total"),
      })
      .from(unplannedExpenses)
      .where(like(unplannedExpenses.date, `${yearMonth}%`))
      .groupBy(unplannedExpenses.category)
      .all();

    // Imported statement transactions
    const importedResults = getImportedExpenseTotalsForMonth(yearMonth);

    const combined = mergeTotals(unplannedResults, importedResults);
    for (const row of combined) {
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
 *
 * Combines manually-logged unplanned expenses with categorized
 * imported statement transactions.
 */
export function getActualSpendingByCategory(
  year: number,
  month: number
): CategoryTotal[] {
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

  const unplannedRows = db
    .select({
      category: unplannedExpenses.category,
      total: sql<number>`SUM(${unplannedExpenses.amount})`.as("total"),
    })
    .from(unplannedExpenses)
    .where(like(unplannedExpenses.date, `${yearMonth}%`))
    .groupBy(unplannedExpenses.category)
    .all();

  const importedRows = getImportedExpenseTotalsForMonth(yearMonth);

  return mergeTotals(unplannedRows, importedRows);
}
