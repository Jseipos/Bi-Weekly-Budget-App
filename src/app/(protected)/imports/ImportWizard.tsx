"use client";

import { useState } from "react";
import { parseStatement, confirmImport } from "@/actions/imports";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ISSUER_LABELS,
  type Issuer,
  type ParsedStatement,
  type ParsedTransaction,
} from "@/lib/statement-parsers";
import type { Category } from "@/types";

interface ImportWizardProps {
  categories: Category[];
  onClose: () => void;
  onImported: () => void;
}

type WizardStep = "upload" | "review";

// Editable version of ParsedTransaction with an assigned category
interface ReviewTransaction extends ParsedTransaction {
  category: string | null;
  include: boolean; // user can uncheck rows they don't want imported
}

export function ImportWizard({
  categories,
  onClose,
  onImported,
}: ImportWizardProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [issuer, setIssuer] = useState<Issuer>("chase");
  const [accountLabel, setAccountLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // After parse:
  const [statement, setStatement] = useState<ParsedStatement | null>(null);
  const [reviewTxs, setReviewTxs] = useState<ReviewTransaction[]>([]);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [fileFormat, setFileFormat] = useState<string>("");

  const categoryOptions = [
    { value: "", label: "— Uncategorized —" },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  async function handleParse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("issuer", issuer);

    try {
      const res = await parseStatement(formData);
      if (!res.success || !res.statement) {
        setError(res.error ?? "Could not parse the file.");
        return;
      }
      setStatement(res.statement);
      setFileBase64(res.fileBase64 ?? "");
      setFilename(res.filename ?? "");
      setFileFormat(res.fileFormat ?? "");
      setReviewTxs(
        res.statement.transactions.map((tx) => ({
          ...tx,
          // Pre-fill category from issuer's category if it matches one we have
          category:
            tx.issuerCategory &&
            categories.some(
              (c) => c.name.toLowerCase() === tx.issuerCategory!.toLowerCase(),
            )
              ? categories.find(
                  (c) =>
                    c.name.toLowerCase() === tx.issuerCategory!.toLowerCase(),
                )!.name
              : null,
          include: true,
        })),
      );
      setStep("review");
    } catch (e) {
      setError(`Unexpected error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function updateRow(i: number, patch: Partial<ReviewTransaction>) {
    setReviewTxs((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function bulkCategorize(category: string | null) {
    setReviewTxs((prev) =>
      prev.map((tx) => (tx.include && !tx.category ? { ...tx, category } : tx)),
    );
  }

  async function handleConfirm() {
    setError(null);
    setLoading(true);

    const selected = reviewTxs.filter((tx) => tx.include);
    if (selected.length === 0) {
      setError("Select at least one transaction to import.");
      setLoading(false);
      return;
    }

    try {
      const res = await confirmImport({
        issuer,
        accountLabel: accountLabel.trim() || null,
        filename,
        fileFormat,
        statementStart: statement!.statementStart,
        statementEnd: statement!.statementEnd,
        fileBase64,
        transactions: selected.map((tx) => ({
          date: tx.date,
          amount: tx.amount,
          description: tx.description,
          rawDescription: tx.rawDescription,
          issuerCategory: tx.issuerCategory,
          category: tx.category,
        })),
      });
      if (!res.success) {
        setError(res.error ?? "Could not save import.");
        return;
      }
      const dupNote =
        res.duplicateCount && res.duplicateCount > 0
          ? ` (${res.duplicateCount} duplicates skipped)`
          : "";
      alert(
        `Imported ${res.insertedCount} transactions${dupNote}. Statement archived.`,
      );
      onImported();
    } catch (e) {
      setError(`Unexpected error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  // ============= UPLOAD STEP =============

  if (step === "upload") {
    const issuerOptions = (Object.keys(ISSUER_LABELS) as Issuer[]).map((k) => ({
      value: k,
      label: ISSUER_LABELS[k],
    }));

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Import a statement</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleParse} className="space-y-4">
            <Select
              name="issuerSelect"
              label="Bank / card issuer"
              options={issuerOptions}
              value={issuer}
              onChange={(e) => setIssuer(e.target.value as Issuer)}
            />
            <Input
              name="accountLabel"
              label="Account label (optional)"
              placeholder="e.g. Chase Sapphire, USAA Checking"
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statement file (CSV)
              </label>
              <input
                name="file"
                type="file"
                accept=".csv"
                required
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 min-h-[44px]"
              />
              <p className="mt-2 text-xs text-gray-500">
                Download from your bank&apos;s online portal. Look for an
                &quot;Export&quot; or &quot;Download activity&quot; option,
                pick CSV format, and choose the date range you want.
              </p>
            </div>
            {error && (
              <Card variant="danger">
                <CardContent>
                  <p className="text-sm text-red-700">{error}</p>
                </CardContent>
              </Card>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Parsing..." : "Parse file"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ============= REVIEW STEP =============

  const includedCount = reviewTxs.filter((tx) => tx.include).length;
  const totalAmount = reviewTxs
    .filter((tx) => tx.include)
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Review {ISSUER_LABELS[issuer]} statement (
            {reviewTxs.length} rows)
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
            Back
          </Button>
        </div>
        {statement && statement.statementStart && statement.statementEnd && (
          <p className="text-sm text-gray-500">
            {formatDate(statement.statementStart)} –{" "}
            {formatDate(statement.statementEnd)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {statement && statement.warnings.length > 0 && (
          <Card variant="warning" className="mb-4">
            <CardContent>
              <p className="text-sm font-medium text-amber-800 mb-1">
                {statement.warnings.length} row
                {statement.warnings.length === 1 ? "" : "s"} skipped during
                parse:
              </p>
              <ul className="text-xs text-amber-700 list-disc pl-5 space-y-0.5">
                {statement.warnings.slice(0, 5).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {statement.warnings.length > 5 && (
                  <li>...and {statement.warnings.length - 5} more</li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            Bulk-assign uncategorized to:
          </span>
          <select
            onChange={(e) => bulkCategorize(e.target.value || null)}
            defaultValue=""
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">— pick category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={reviewTxs.every((tx) => tx.include)}
                    onChange={(e) =>
                      setReviewTxs((prev) =>
                        prev.map((tx) => ({ ...tx, include: e.target.checked })),
                      )
                    }
                  />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {reviewTxs.map((tx, i) => (
                <tr
                  key={i}
                  className={tx.include ? "" : "opacity-50 bg-gray-50"}
                >
                  <td className="px-2 py-1">
                    <input
                      type="checkbox"
                      checked={tx.include}
                      onChange={(e) =>
                        updateRow(i, { include: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-700">
                    {tx.date}
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={tx.description}
                      onChange={(e) =>
                        updateRow(i, { description: e.target.value })
                      }
                      className="w-full rounded border border-transparent hover:border-gray-300 focus:border-blue-500 px-1 py-0.5 text-sm"
                    />
                  </td>
                  <td
                    className={`px-2 py-1 text-right whitespace-nowrap text-sm font-medium ${
                      tx.amount < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={tx.category ?? ""}
                      onChange={(e) =>
                        updateRow(i, { category: e.target.value || null })
                      }
                      className="w-full rounded border border-gray-300 px-1 py-0.5 text-sm"
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Importing <span className="font-medium">{includedCount}</span>{" "}
            of {reviewTxs.length} · net{" "}
            <span
              className={
                totalAmount < 0
                  ? "text-red-600 font-medium"
                  : "text-green-600 font-medium"
              }
            >
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setStep("upload")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? "Saving..." : "Confirm import"}
            </Button>
          </div>
        </div>

        {error && (
          <Card variant="danger" className="mt-3">
            <CardContent>
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
