"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface FolderPickerProps {
  categoryId: number;
  categoryName: string;
  currentPath: string | null;
  onSave: (id: number, path: string | null) => Promise<void>;
}

export function FolderPicker({
  categoryId,
  categoryName,
  currentPath,
  onSave,
}: FolderPickerProps) {
  const [editing, setEditing] = useState(false);
  const [path, setPath] = useState(currentPath ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const trimmed = path.trim();
      await onSave(categoryId, trimmed.length > 0 ? trimmed : null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setPath(currentPath ?? "");
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900">
            {categoryName}
          </span>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {currentPath ? (
              <span className="font-mono text-gray-700">{currentPath}</span>
            ) : (
              "Not configured"
            )}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={`Edit folder path for ${categoryName}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-gray-900">{categoryName}</span>
      <Input
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="Receipts/Medical"
        aria-label={`iCloud folder path for ${categoryName}`}
      />
      <p className="text-xs text-gray-400">
        Path relative to iCloud Drive root. Leave blank to clear.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
