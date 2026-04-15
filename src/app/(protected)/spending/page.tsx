"use client";

import { useState, useEffect } from "react";
import { getUnplannedExpenses } from "@/actions/spending";
import { getCategories } from "@/actions/categories";
import { SpendingForm } from "@/components/SpendingForm";
import { SpendingList } from "@/components/SpendingList";
import { MonthPicker } from "@/components/MonthPicker";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { UnplannedExpense, Category } from "@/types";

export default function SpendingPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expenses, setExpenses] = useState<UnplannedExpense[]>([]);
  const [categories, setCategoriesList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
      const [exp, cats] = await Promise.all([
        getUnplannedExpenses(yearMonth),
        getCategories(),
      ]);
      setExpenses(exp as UnplannedExpense[]);
      setCategoriesList(cats as Category[]);
    } catch {
      setError("Failed to load expenses. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [year, month]);

  function handleMonthChange(newYear: number, newMonth: number) {
    setYear(newYear);
    setMonth(newMonth);
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Unplanned Spending</h1>
        <p className="mt-1 text-sm text-gray-500">
          Log one-off purchases and track spending trends.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Expense</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length > 0 && (
            <SpendingForm categories={categories} />
          )}
        </CardContent>
      </Card>

      <div>
        <MonthPicker year={year} month={month} onChange={handleMonthChange} />
        <div className="mt-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Expenses ({expenses.length})
          </h2>
          <span className="text-sm font-medium text-red-600">
            Total: {formatCurrency(total)}
          </span>
        </div>
        <div className="mt-3">
          {loading ? (
            <Card className="text-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                <p className="text-sm text-gray-400">Loading expenses...</p>
              </div>
            </Card>
          ) : error ? (
            <Card variant="danger" className="text-center py-8">
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="secondary" className="mt-3" onClick={loadData}>
                Retry
              </Button>
            </Card>
          ) : (
            <SpendingList expenses={expenses} />
          )}
        </div>
      </div>
    </div>
  );
}
