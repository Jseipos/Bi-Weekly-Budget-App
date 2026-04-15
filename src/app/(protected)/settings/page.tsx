import { getCategories } from "@/actions/categories";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ChangePinForm } from "./ChangePinForm";
import { CategoryManager } from "./CategoryManager";
import { IcloudFolderMapping } from "./IcloudFolderMapping";
import type { Category } from "@/types";

export default async function SettingsPage() {
  const categories = (await getCategories()) as Category[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your PIN, categories, and iCloud folder mappings.
        </p>
      </div>

      {/* Section A: Change PIN */}
      <Card>
        <CardHeader>
          <CardTitle>Change PIN</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePinForm />
        </CardContent>
      </Card>

      {/* Section B: Manage Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryManager categories={categories} />
        </CardContent>
      </Card>

      {/* Section C: iCloud Folder Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>iCloud Folder Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <IcloudFolderMapping categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
