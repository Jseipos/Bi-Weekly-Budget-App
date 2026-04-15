"use client";

import { useState } from "react";
import { createCategory, deleteCategory } from "@/actions/categories";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import type { Category } from "@/types";

interface CategoryManagerProps {
  categories: Category[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const deleteTarget = deleteId
    ? categories.find((c) => c.id === deleteId)
    : null;

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const trimmed = newName.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const result = await createCategory(trimmed);
      if (result.success) {
        setNewName("");
      } else {
        setError(result.error || "Failed to create category.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (deleteId === null) return;
    setDeleteLoading(true);
    try {
      await deleteCategory(deleteId);
      setDeleteId(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Add category form */}
      <form onSubmit={handleAdd} className="flex gap-3 items-end">
        <div className="flex-1">
          <Input
            label="Add Category"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            required
          />
        </div>
        <Button type="submit" size="md" disabled={loading || !newName.trim()}>
          {loading ? "Adding..." : "Add"}
        </Button>
      </form>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {/* Category list */}
      <div className="space-y-2">
        {categories.map((cat) => (
          <Card key={cat.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate">
                {cat.name}
              </span>
              {cat.isDefault && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Default
                </span>
              )}
            </div>
            {!cat.isDefault && (
              <button
                onClick={() => setDeleteId(cat.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={`Delete ${cat.name}`}
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </Card>
        ))}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Category"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{deleteTarget?.name}</span>? This
          action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
