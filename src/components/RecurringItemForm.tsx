"use client";

import { useState } from "react";
import { createRecurringItem, updateRecurringItem } from "@/actions/recurring";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { todayISO } from "@/lib/utils";
import type { RecurringItem } from "@/types";

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Semi-annual" },
  { value: "annual", label: "Annual" },
];

const TYPE_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

const CATEGORY_OPTIONS = [
  { value: "Housing", label: "Housing" },
  { value: "Utilities", label: "Utilities" },
  { value: "Insurance", label: "Insurance" },
  { value: "Transportation", label: "Transportation" },
  { value: "Subscriptions", label: "Subscriptions" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Debt", label: "Debt Payment" },
  { value: "Savings", label: "Savings" },
  { value: "Paycheck", label: "Paycheck" },
  { value: "Side Income", label: "Side Income" },
  { value: "Other", label: "Other" },
];

interface RecurringItemFormProps {
  editItem?: RecurringItem | null;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function RecurringItemForm({
  editItem,
  onCancel,
  onSuccess,
}: RecurringItemFormProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = editItem
        ? await updateRecurringItem(editItem.id, formData)
        : await createRecurringItem(formData);

      if (result.success) {
        if (!editItem) {
          (e.target as HTMLFormElement).reset();
        }
        onSuccess?.();
      } else {
        setError(result.error || "Failed to save");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          name="name"
          label="Name"
          placeholder="e.g., Rent, Paycheck"
          defaultValue={editItem?.name}
          required
        />
        <Input
          name="amount"
          label="Amount ($)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          defaultValue={editItem?.amount}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          name="frequency"
          label="Frequency"
          options={FREQUENCY_OPTIONS}
          defaultValue={editItem?.frequency || "monthly"}
        />
        <Select
          name="type"
          label="Type"
          options={TYPE_OPTIONS}
          defaultValue={editItem?.type || "expense"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          name="startDate"
          label="Start Date"
          type="date"
          defaultValue={editItem?.startDate || todayISO()}
          required
        />
        <Select
          name="category"
          label="Category"
          options={CATEGORY_OPTIONS}
          defaultValue={editItem?.category || "Other"}
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-red-600">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : editItem
              ? "Update Item"
              : "Add Item"}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
