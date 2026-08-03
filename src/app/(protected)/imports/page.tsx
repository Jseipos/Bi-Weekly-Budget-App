"use client";

import { useState, useEffect } from "react";
import { listImports, deleteImport } from "@/actions/imports";
import { getCategories } from "@/actions/categories";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ISSUER_LABELS, type Issuer } from "@/lib/statement-parsers";
import { ImportWizard } from "./ImportWizard";
import type { Category } from "@/types";

interface ImportedStatementRow {
  id: number;
  issuer: string;
  accountLabel: string | null;
  filename: string;
  fileFormat: string;
  icloudPath: string | null;
  statementStart: string | null;
  statementEnd: string | null;
  transactionCount: number;
  importedAt: string;
}

export default function ImportsPage() {
  const [imports, setImports] = useState<ImportedStatementRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [imps, cats] = await Promise.all([listImports(), getCategories()]);
      setImports(imps as ImportedStatementRow[]);
      setCategories(cats as Category[]);
    } catch {
      setError("Failed to load imports. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDelete(id: number) {
    if (
      !confirm(
        "Delete this import? All transactions from this statement will be removed " +
          "(the archived file in iCloud will NOT be deleted).",
      )
    )
      return;
    const res = await deleteImport(id);
    if (res.success) loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statement Imports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload a CSV from Chase, Capital One, USAA, PNC, or Target. Parsing
            happens locally on this machine — your statements never leave your
            Mac.
          </p>
        </div>
        {!wizardOpen && (
          <Button onClick={() => setWizardOpen(true)}>Import statement</Button>
        )}
      </div>

      {wizardOpen && (
        <ImportWizard
          categories={categories}
          onClose={() => setWizardOpen(false)}
          onImported={() => {
            setWizardOpen(false);
            loadData();
          }}
        />
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900">Past imports</h2>
        <div className="mt-3">
          {loading ? (
            <Card className="text-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                <p className="text-sm text-gray-400">Loading imports...</p>
              </div>
            </Card>
          ) : error ? (
            <Card variant="danger" className="text-center py-8">
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="secondary" className="mt-3" onClick={loadData}>
                Retry
              </Button>
            </Card>
          ) : imports.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-sm text-gray-500">
                No imports yet. Click &quot;Import statement&quot; to upload your
                first one.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {imports.map((imp) => (
                <Card key={imp.id}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-base font-semibold text-gray-900">
                            {ISSUER_LABELS[imp.issuer as Issuer] ?? imp.issuer}
                          </h3>
                          {imp.accountLabel && (
                            <span className="text-sm text-gray-500">
                              {imp.accountLabel}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {imp.filename} · {imp.fileFormat.toUpperCase()}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {imp.statementStart && imp.statementEnd
                            ? `${formatDate(imp.statementStart)} – ${formatDate(imp.statementEnd)}`
                            : "Statement period not detected"}{" "}
                          · {imp.transactionCount} transactions · imported{" "}
                          {new Date(imp.importedAt).toLocaleString()}
                        </p>
                        {imp.icloudPath && (
                          <p className="mt-1 text-xs text-gray-400 break-all">
                            Archived: {imp.icloudPath}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(imp.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
