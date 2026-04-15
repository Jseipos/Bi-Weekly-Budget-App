"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDebtPayment } from "@/actions/debts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { todayISO } from "@/lib/utils";

interface DebtPaymentFormProps {
  debtId: number;
  debtName: string;
  onSuccess?: () => void;
}

export function DebtPaymentForm({
  debtId,
  debtName,
  onSuccess,
}: DebtPaymentFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExtra, setIsExtra] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Manually set debtId and isExtra since they need special handling
    formData.set("debtId", String(debtId));
    formData.set("isExtra", String(isExtra));

    try {
      const result = await createDebtPayment(formData);

      if (result.success) {
        form.reset();
        router.refresh();
        onSuccess?.();
      } else {
        setError(result.error || "Failed to log payment");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500">
        Recording a payment for <span className="font-medium text-gray-900">{debtName}</span>.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          name="amount"
          label="Amount ($)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          required
        />
        <Input
          name="date"
          label="Date"
          type="date"
          defaultValue={todayISO()}
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isExtra"
          type="checkbox"
          checked={isExtra}
          onChange={(e) => setIsExtra(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isExtra" className="text-sm text-gray-700">
          Extra payment (beyond minimum)
        </label>
      </div>

      <Input
        name="note"
        label="Note (optional)"
        placeholder="e.g., Tax refund applied"
      />

      {error && (
        <p className="text-sm font-medium text-red-600">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Log Payment"}
        </Button>
      </div>
    </form>
  );
}
