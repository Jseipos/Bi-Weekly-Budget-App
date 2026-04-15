"use client";

import { useState, useEffect } from "react";
import { getMonthlyBreakdown } from "@/actions/dashboard";
import { MonthPicker } from "@/components/MonthPicker";
import { MonthlySummaryCard } from "@/components/MonthlySummaryCard";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatCurrency, formatDateShort, cn } from "@/lib/utils";
import type { MonthlyBreakdown } from "@/types";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Semi-annual",
  annual: "Annual",
};

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<MonthlyBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getMonthlyBreakdown(year, month)
      .then((result) => {
        setData(result);
      })
      .catch(() => setError("Failed to load budget data. Please try again."))
      .finally(() => setLoading(false));
  }, [year, month]);

  function handleMonthChange(newYear: number, newMonth: number) {
    setYear(newYear);
    setMonth(newMonth);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your monthly budget overview at a glance.
        </p>
      </div>

      {/* Month navigation */}
      <MonthPicker year={year} month={month} onChange={handleMonthChange} />

      {/* Loading state */}
      {loading && (
        <Card className="text-center py-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="text-sm text-gray-400">Loading budget data...</p>
          </div>
        </Card>
      )}

      {/* Error state */}
      {!loading && error && (
        <Card variant="danger" className="text-center py-8">
          <p className="text-sm text-red-600">{error}</p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => {
              setError(null);
              setLoading(true);
              getMonthlyBreakdown(year, month)
                .then((result) => setData(result))
                .catch(() => setError("Failed to load budget data. Please try again."))
                .finally(() => setLoading(false));
            }}
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.recurringItems.length === 0 && data.unplannedByCategory.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-400">No budget data for this month.</p>
          <p className="mt-1 text-sm text-gray-400">
            Add recurring items or log spending to see your breakdown.
          </p>
        </Card>
      )}

      {/* Dashboard content */}
      {!loading && !error && data && (data.recurringItems.length > 0 || data.unplannedByCategory.length > 0) && (
        <div className="space-y-6">
          {/* Monthly Summary */}
          <MonthlySummaryCard
            totalIncome={data.totalIncome}
            totalRecurringExpenses={data.totalRecurringExpenses}
            totalUnplanned={data.totalUnplanned}
            totalPredictedUnplanned={data.totalPredictedUnplanned}
            netBalance={data.netBalance}
            predictedNetBalance={data.predictedNetBalance}
          />

          {/* Recurring Items */}
          <Card>
            <CardHeader>
              <CardTitle>
                Recurring Items ({data.recurringItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recurringItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No recurring items set up yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Income items */}
                  {data.recurringItems
                    .filter((ri) => ri.item.type === "income")
                    .length > 0 && (
                    <div className="pb-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-2">
                        Income
                      </h4>
                      <div className="space-y-2">
                        {data.recurringItems
                          .filter((ri) => ri.item.type === "income")
                          .map((ri) => (
                            <RecurringItemRow key={ri.item.id} ri={ri} />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Expense items */}
                  {data.recurringItems
                    .filter((ri) => ri.item.type === "expense")
                    .length > 0 && (
                    <div className="pt-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-2">
                        Expenses
                      </h4>
                      <div className="space-y-2">
                        {data.recurringItems
                          .filter((ri) => ri.item.type === "expense")
                          .map((ri) => (
                            <RecurringItemRow key={ri.item.id} ri={ri} />
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <CategoryBreakdown categories={data.unplannedByCategory} />
        </div>
      )}
    </div>
  );
}

// ---- Recurring item row sub-component ----

import type { RecurringItemWithOccurrences } from "@/types";

function RecurringItemRow({ ri }: { ri: RecurringItemWithOccurrences }) {
  const isIncome = ri.item.type === "income";

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg p-2 hover:bg-gray-50 min-h-[44px]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 truncate">
            {ri.item.name}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {FREQUENCY_LABELS[ri.item.frequency] ?? ri.item.frequency}
          </span>
          {ri.occurrences > 0 && (
            <span className="text-xs text-gray-400">
              {ri.occurrences}x this month
            </span>
          )}
        </div>
        {/* Occurrence dates */}
        {ri.dates.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {ri.dates.map((date) => (
              <span
                key={date}
                className="text-xs text-gray-400"
              >
                {formatDateShort(date)}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <span
          className={cn(
            "text-sm font-semibold",
            isIncome ? "text-green-600" : "text-red-600"
          )}
        >
          {isIncome ? "" : "-"}
          {formatCurrency(ri.totalForMonth)}
        </span>
        {ri.occurrences > 1 && (
          <div className="text-xs text-gray-400">
            {formatCurrency(ri.item.amount)} each
          </div>
        )}
      </div>
    </div>
  );
}
