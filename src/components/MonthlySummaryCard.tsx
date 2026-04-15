import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatCurrency, cn } from "@/lib/utils";

interface MonthlySummaryCardProps {
  totalIncome: number;
  totalRecurringExpenses: number;
  totalUnplanned: number;
  totalPredictedUnplanned: number;
  netBalance: number;
  predictedNetBalance: number;
}

export function MonthlySummaryCard({
  totalIncome,
  totalRecurringExpenses,
  totalUnplanned,
  totalPredictedUnplanned,
  netBalance,
  predictedNetBalance,
}: MonthlySummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Total Income */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Income</span>
            <span className="text-sm font-semibold text-green-600">
              {formatCurrency(totalIncome)}
            </span>
          </div>

          {/* Recurring Expenses */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Recurring Expenses</span>
            <span className="text-sm font-semibold text-red-600">
              -{formatCurrency(totalRecurringExpenses)}
            </span>
          </div>

          {/* Unplanned Spending */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Unplanned Spending</span>
            <div className="text-right">
              <span className="text-sm font-semibold text-amber-600">
                -{formatCurrency(totalUnplanned)}
              </span>
              {totalPredictedUnplanned > 0 && (
                <span className="ml-2 text-xs text-gray-400">
                  est. {formatCurrency(totalPredictedUnplanned)}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 pt-3">
            {/* Net Balance */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                Net Balance
              </span>
              <div className="text-right">
                <span
                  className={cn(
                    "text-base font-bold",
                    netBalance >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatCurrency(netBalance)}
                </span>
                <div
                  className={cn(
                    "text-xs",
                    predictedNetBalance >= 0 ? "text-green-500" : "text-red-500"
                  )}
                >
                  est. {formatCurrency(predictedNetBalance)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
