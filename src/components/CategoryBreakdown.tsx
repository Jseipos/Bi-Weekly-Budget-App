import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatCurrency, cn } from "@/lib/utils";
import type { CategorySpending } from "@/types";

interface CategoryBreakdownProps {
  categories: CategorySpending[];
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unplanned Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 text-center py-4">
            No unplanned spending this month.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Find the max value across all categories for bar scaling
  const maxValue = Math.max(
    ...categories.map((c) => Math.max(c.actual, c.predicted)),
    1 // avoid division by zero
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unplanned Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((cat) => {
            const isOverBudget = cat.predicted > 0 && cat.actual > cat.predicted;
            const actualWidth = (cat.actual / maxValue) * 100;
            const predictedWidth = (cat.predicted / maxValue) * 100;

            return (
              <div key={cat.category}>
                {/* Category name and amounts */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {cat.category}
                    </span>
                    {isOverBudget && (
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        over budget
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isOverBudget ? "text-red-600" : "text-amber-600"
                      )}
                    >
                      {formatCurrency(cat.actual)}
                    </span>
                    {cat.predicted > 0 && (
                      <span className="ml-2 text-xs text-gray-400">
                        / {formatCurrency(cat.predicted)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bar visualization */}
                <div className="relative h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                  {/* Predicted bar (background layer) */}
                  {cat.predicted > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gray-300"
                      style={{ width: `${predictedWidth}%` }}
                    />
                  )}
                  {/* Actual bar (foreground layer) */}
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-all",
                      isOverBudget ? "bg-red-500" : "bg-amber-500"
                    )}
                    style={{ width: `${actualWidth}%` }}
                  />
                </div>

                {/* Legend for first item only */}
                {categories.indexOf(cat) === 0 && (
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-xs text-gray-400">Actual</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-gray-300" />
                      <span className="text-xs text-gray-400">Predicted</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
