"use client";

import { useState } from "react";
import { deleteRecurringItem } from "@/actions/recurring";
import { RecurringItemForm } from "./RecurringItemForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import type { RecurringItem } from "@/types";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Semi-annual",
  annual: "Annual",
};

interface RecurringItemListProps {
  items: RecurringItem[];
}

export function RecurringItemList({ items }: RecurringItemListProps) {
  const [editItem, setEditItem] = useState<RecurringItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const incomeItems = items.filter((i) => i.type === "income");
  const expenseItems = items.filter((i) => i.type === "expense");

  async function handleDelete() {
    if (deleteId !== null) {
      await deleteRecurringItem(deleteId);
      setDeleteId(null);
    }
  }

  if (items.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-gray-500">No recurring items yet.</p>
        <p className="text-sm text-gray-400 mt-1">
          Add your first income or expense above.
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* Income section */}
      {incomeItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3">
            Income
          </h3>
          <div className="space-y-2">
            {incomeItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={() => setEditItem(item)}
                onDelete={() => setDeleteId(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Expenses section */}
      {expenseItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-3">
            Expenses
          </h3>
          <div className="space-y-2">
            {expenseItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={() => setEditItem(item)}
                onDelete={() => setDeleteId(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      <Modal
        isOpen={editItem !== null}
        onClose={() => setEditItem(null)}
        title="Edit Recurring Item"
      >
        {editItem && (
          <RecurringItemForm
            editItem={editItem}
            onCancel={() => setEditItem(null)}
            onSuccess={() => setEditItem(null)}
          />
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Item"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to remove this recurring item? It will no longer
          appear in your budget calculations.
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

function ItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: RecurringItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
            {item.name}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {FREQUENCY_LABELS[item.frequency]}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{item.category}</span>
          <span className="text-xs text-gray-400">
            from {item.startDate}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-semibold ${
            item.type === "income" ? "text-green-600" : "text-red-600"
          }`}
        >
          {item.type === "income" ? "+" : "-"}
          {formatCurrency(item.amount)}
        </span>
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Edit"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Delete"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </Card>
  );
}
