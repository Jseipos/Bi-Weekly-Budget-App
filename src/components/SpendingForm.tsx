"use client";

import { useState } from "react";
import { createUnplannedExpense } from "@/actions/spending";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { todayISO } from "@/lib/utils";
import type { Category } from "@/types";

interface SpendingFormProps {
  categories: Category[];
}

export function SpendingForm({ categories }: SpendingFormProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const categoryOptions = categories.map((c) => ({
    value: c.name,
    label: c.name,
  }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createUnplannedExpense(formData);
      if (result.success) {
        (e.target as HTMLFormElement).reset();
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          name="category"
          label="Category"
          options={categoryOptions}
          defaultValue={categories[0]?.name}
        />
        <Input
          name="description"
          label="Description"
          placeholder="Optional note"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Receipt (optional)
        </label>
        <input
          name="receipt"
          type="file"
          accept=".jpg,.jpeg,.png,.heic,.pdf"
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 min-h-[44px]"
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-red-600">{error}</p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Log Expense"}
      </Button>
    </form>
  );
}
