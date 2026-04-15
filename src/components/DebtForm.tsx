"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDebt, updateDebt } from "@/actions/debts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Debt } from "@/types";

interface DebtFormProps {
  editDebt?: Debt | null;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function DebtForm({ editDebt, onCancel, onSuccess }: DebtFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = editDebt
        ? await updateDebt(editDebt.id, formData)
        : await createDebt(formData);

      if (result.success) {
        if (!editDebt) {
          (e.target as HTMLFormElement).reset();
        }
        router.refresh();
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
      <Input
        name="name"
        label="Name"
        placeholder="e.g., Chase Visa, Student Loan"
        defaultValue={editDebt?.name}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          name="currentBalance"
          label="Current Balance ($)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          defaultValue={editDebt?.currentBalance}
          required
        />
        <Input
          name="interestRate"
          label="Interest Rate / APR (%)"
          type="number"
          step="0.01"
          min="0"
          placeholder="24.99"
          defaultValue={editDebt?.interestRate}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          name="minimumPayment"
          label="Minimum Payment ($)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          defaultValue={editDebt?.minimumPayment}
          required
        />
        <Input
          name="dueDay"
          label="Due Day (1-31)"
          type="number"
          min="1"
          max="31"
          step="1"
          placeholder="15"
          defaultValue={editDebt?.dueDay}
          required
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-red-600">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : editDebt
              ? "Update Debt"
              : "Add Debt"}
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
