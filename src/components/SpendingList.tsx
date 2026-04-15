"use client";

import { useState } from "react";
import { deleteUnplannedExpense } from "@/actions/spending";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import type { UnplannedExpense } from "@/types";

interface SpendingListProps {
  expenses: UnplannedExpense[];
}

export function SpendingList({ expenses }: SpendingListProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function handleDelete() {
    if (deleteId !== null) {
      await deleteUnplannedExpense(deleteId);
      setDeleteId(null);
    }
  }

  if (expenses.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-gray-500">No expenses logged for this month.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {expenses.map((expense) => (
          <Card key={expense.id} className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {expense.category}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDateShort(expense.date)}
                </span>
                {expense.receiptFilename && (
                  <span className="inline-flex items-center text-xs text-blue-500" title="Has receipt">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </span>
                )}
              </div>
              {expense.description && (
                <p className="text-sm text-gray-600 mt-0.5 truncate">
                  {expense.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-red-600">
                -{formatCurrency(expense.amount)}
              </span>
              <button
                onClick={() => setDeleteId(expense.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Delete"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Expense"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete this expense?
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
