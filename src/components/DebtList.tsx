"use client";

import { useState } from "react";
import { deleteDebt, setPaydownStrategy } from "@/actions/debts";
import { DebtForm } from "./DebtForm";
import { DebtPaymentForm } from "./DebtPaymentForm";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { amortize, rankDebts } from "@/lib/debt-calc";
import type { Debt, PaydownStrategy } from "@/types";

interface DebtListProps {
  debts: Debt[];
  strategy: PaydownStrategy;
  onRefresh?: () => void;
}

export function DebtList({ debts, strategy, onRefresh }: DebtListProps) {
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [currentStrategy, setCurrentStrategy] = useState<PaydownStrategy>(strategy);
  const [switching, setSwitching] = useState(false);

  const rankings = rankDebts(debts, currentStrategy);

  async function handleDelete() {
    if (deleteId !== null) {
      await deleteDebt(deleteId);
      setDeleteId(null);
      onRefresh?.();
    }
  }

  async function handleStrategyChange(newStrategy: PaydownStrategy) {
    if (newStrategy === currentStrategy) return;
    setSwitching(true);
    setCurrentStrategy(newStrategy);
    await setPaydownStrategy(newStrategy);
    setSwitching(false);
    onRefresh?.();
  }

  if (debts.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-gray-500">No debts tracked yet.</p>
        <p className="text-sm text-gray-400 mt-1">
          Add your first debt above to start tracking payoff progress.
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* Strategy selector */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Paydown Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {currentStrategy === "avalanche"
                ? "Highest interest rate first (saves the most money)"
                : "Lowest balance first (fastest psychological wins)"}
            </p>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden shrink-0">
              <button
                onClick={() => handleStrategyChange("avalanche")}
                disabled={switching}
                className={cn(
                  "px-4 py-2 text-sm font-medium min-h-[44px] transition-colors",
                  currentStrategy === "avalanche"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                Avalanche
              </button>
              <button
                onClick={() => handleStrategyChange("snowball")}
                disabled={switching}
                className={cn(
                  "px-4 py-2 text-sm font-medium min-h-[44px] transition-colors border-l border-gray-300",
                  currentStrategy === "snowball"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                Snowball
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ranked debt list */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Your Debts ({debts.length})
      </h2>
      <div className="space-y-3">
        {rankings.map((ranking) => {
          const { debt, monthlyInterestCost, rank } = ranking;
          const result = amortize(debt.currentBalance, debt.interestRate, debt.minimumPayment);
          const isUnderpaying = result.totalMonths === -1;

          return (
            <Card
              key={debt.id}
              className={cn(
                rank === 1 && "ring-2 ring-blue-500 ring-offset-1"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                      {rank}
                    </span>
                    <span className="font-medium text-gray-900 truncate">
                      {debt.name}
                    </span>
                  </div>

                  {/* Debt details */}
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                    <div>
                      <span className="text-gray-500">Balance</span>
                      <p className="font-semibold text-red-600">
                        {formatCurrency(debt.currentBalance)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">APR</span>
                      <p className="font-semibold text-gray-900">
                        {formatPercent(debt.interestRate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Min Payment</span>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(debt.minimumPayment)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Due Day</span>
                      <p className="font-semibold text-gray-900">
                        {debt.dueDay}
                      </p>
                    </div>
                  </div>

                  {/* Amortization summary */}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-amber-700 font-medium">
                      Monthly interest: {formatCurrency(monthlyInterestCost)}
                    </span>
                    {isUnderpaying ? (
                      <span className="text-red-600 font-semibold">
                        Payment does not cover interest!
                      </span>
                    ) : (
                      <>
                        <span className="text-gray-500">
                          Payoff in {result.totalMonths} month{result.totalMonths !== 1 ? "s" : ""}
                        </span>
                        <span className="text-gray-500">
                          Total interest: {formatCurrency(result.totalInterest)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPaymentDebt(debt)}
                    className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Log payment"
                    title="Log payment"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditDebt(debt)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteId(debt.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit modal */}
      <Modal
        isOpen={editDebt !== null}
        onClose={() => setEditDebt(null)}
        title="Edit Debt"
      >
        {editDebt && (
          <DebtForm
            editDebt={editDebt}
            onCancel={() => setEditDebt(null)}
            onSuccess={() => {
              setEditDebt(null);
              onRefresh?.();
            }}
          />
        )}
      </Modal>

      {/* Log payment modal */}
      <Modal
        isOpen={paymentDebt !== null}
        onClose={() => setPaymentDebt(null)}
        title={paymentDebt ? `Log Payment — ${paymentDebt.name}` : "Log Payment"}
      >
        {paymentDebt && (
          <DebtPaymentForm
            debtId={paymentDebt.id}
            debtName={paymentDebt.name}
            onSuccess={() => {
              setPaymentDebt(null);
              onRefresh?.();
            }}
          />
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Debt"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to remove this debt? It will no longer appear in
          your paydown calculations.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
