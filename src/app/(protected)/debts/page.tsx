"use client";

import { useState, useEffect, useCallback } from "react";
import { getDebts, getPaydownStrategy } from "@/actions/debts";
import { DebtForm } from "@/components/DebtForm";
import { DebtList } from "@/components/DebtList";
import { DebtSimulation } from "@/components/DebtSimulation";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { Debt, PaydownStrategy } from "@/types";

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [strategy, setStrategy] = useState<PaydownStrategy>("avalanche");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const refreshData = useCallback(() => {
    Promise.all([getDebts(), getPaydownStrategy()])
      .then(([d, s]) => {
        setDebts(d);
        setStrategy(s);
        setError(null);
      })
      .catch(() => setError("Failed to refresh debts. Please try again."));
  }, []);

  useEffect(() => {
    Promise.all([getDebts(), getPaydownStrategy()])
      .then(([d, s]) => {
        setDebts(d);
        setStrategy(s);
        setError(null);
      })
      .catch(() => setError("Failed to load debts. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Debt Paydown</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track debts and optimize your paydown strategy.
        </p>
      </div>

      {/* Add new debt (collapsible) */}
      <div>
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            + Add Debt
          </Button>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Add New Debt</CardTitle>
            </CardHeader>
            <CardContent>
              <DebtForm
                onCancel={() => setShowForm(false)}
                onSuccess={() => {
                  setShowForm(false);
                  refreshData();
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <Card className="text-center py-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="text-sm text-gray-400">Loading debts...</p>
          </div>
        </Card>
      )}

      {/* Error state */}
      {!loading && error && (
        <Card variant="danger" className="text-center py-8">
          <p className="text-sm text-red-600">{error}</p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => {
              setError(null);
              setLoading(true);
              Promise.all([getDebts(), getPaydownStrategy()])
                .then(([d, s]) => {
                  setDebts(d);
                  setStrategy(s);
                })
                .catch(() => setError("Failed to load debts. Please try again."))
                .finally(() => setLoading(false));
            }}
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && debts.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-400">No debts tracked yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Add your first debt above to start tracking your payoff progress.
          </p>
        </Card>
      )}

      {/* Debt list + simulation */}
      {!loading && !error && debts.length > 0 && (
        <div className="space-y-6">
          <DebtList
            debts={debts}
            strategy={strategy}
            onRefresh={refreshData}
          />
          <DebtSimulation debts={debts} strategy={strategy} />
        </div>
      )}
    </div>
  );
}
