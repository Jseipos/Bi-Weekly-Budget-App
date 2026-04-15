"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { simulateMultiDebt, compareExtra, rankDebts } from "@/lib/debt-calc";
import type { Debt, PaydownStrategy } from "@/types";

interface DebtSimulationProps {
  debts: Debt[];
  strategy: PaydownStrategy;
}

export function DebtSimulation({ debts, strategy }: DebtSimulationProps) {
  const [extraBudget, setExtraBudget] = useState(0);

  const activeDebts = debts.filter((d) => d.isActive && d.currentBalance > 0);

  const simulation = useMemo(
    () => simulateMultiDebt(activeDebts, extraBudget, strategy),
    [activeDebts, extraBudget, strategy]
  );

  const rankings = useMemo(
    () => rankDebts(activeDebts, strategy),
    [activeDebts, strategy]
  );

  const priorityDebt = rankings.length > 0 ? rankings[0].debt : null;

  const extraComparison = useMemo(() => {
    if (!priorityDebt || extraBudget <= 0) return null;
    return compareExtra(
      priorityDebt.currentBalance,
      priorityDebt.interestRate,
      priorityDebt.minimumPayment,
      extraBudget
    );
  }, [priorityDebt, extraBudget]);

  if (activeDebts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payoff Simulation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Extra budget input */}
        <div className="max-w-xs">
          <Input
            label="Extra monthly budget ($)"
            type="number"
            step="1"
            min="0"
            placeholder="0"
            value={extraBudget || ""}
            onChange={(e) => setExtraBudget(parseFloat(e.target.value) || 0)}
          />
          <p className="mt-1 text-xs text-gray-400">
            Amount beyond all minimums to throw at debt each month
          </p>
        </div>

        {/* Simulation results */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Months</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {simulation.totalMonths}
            </p>
            <p className="text-xs text-gray-400">
              {Math.floor(simulation.totalMonths / 12)}y {simulation.totalMonths % 12}m
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center">
            <p className="text-xs text-red-500 uppercase tracking-wide">Total Interest</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {formatCurrency(simulation.totalInterest)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Paid</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(simulation.totalPaid)}
            </p>
          </div>
        </div>

        {/* Extra payment comparison for priority debt */}
        {extraComparison && priorityDebt && extraBudget > 0 && (
          <Card variant="success" className="mt-3">
            <p className="text-sm font-semibold text-green-800">
              Extra payment impact on #{1} priority: {priorityDebt.name}
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-green-600 font-medium">
                  {extraComparison.monthsSaved} month{extraComparison.monthsSaved !== 1 ? "s" : ""} saved
                </span>
              </div>
              <div>
                <span className="text-green-600 font-medium">
                  {formatCurrency(extraComparison.interestSaved)} interest saved
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Payoff order */}
        {simulation.debtPayoffOrder.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Payoff Order</h4>
            <div className="space-y-1">
              {simulation.debtPayoffOrder.map((item, index) => (
                <div
                  key={item.debtId}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {index + 1}
                    </span>
                    <span className="text-gray-900">{item.debtName}</span>
                  </div>
                  <span className="text-gray-500">
                    Month {item.payoffMonth}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
