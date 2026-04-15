"use client";

import { updateCategoryIcloudPath } from "@/actions/categories";
import { FolderPicker } from "@/components/FolderPicker";
import { Card } from "@/components/ui/Card";
import type { Category } from "@/types";

interface IcloudFolderMappingProps {
  categories: Category[];
}

export function IcloudFolderMapping({ categories }: IcloudFolderMappingProps) {
  async function handleSave(id: number, path: string | null) {
    await updateCategoryIcloudPath(id, path);
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No categories found. Add a category first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-3">
        Map each category to an iCloud Drive subfolder where receipts are stored.
      </p>
      {categories.map((cat) => (
        <Card key={cat.id}>
          <FolderPicker
            categoryId={cat.id}
            categoryName={cat.name}
            currentPath={cat.icloudFolderPath}
            onSave={handleSave}
          />
        </Card>
      ))}
    </div>
  );
}
