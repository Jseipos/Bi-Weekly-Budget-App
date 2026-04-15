import { getRecurringItems } from "@/actions/recurring";
import { RecurringItemForm } from "@/components/RecurringItemForm";
import { RecurringItemList } from "@/components/RecurringItemList";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { RecurringItem } from "@/types";

export default async function RecurringPage() {
  const items = (await getRecurringItems()) as RecurringItem[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recurring Items</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add your income and expenses. Each item is set up once and automatically
          calculated for every month.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Item</CardTitle>
        </CardHeader>
        <CardContent>
          <RecurringItemForm />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Your Items ({items.length})
        </h2>
        <RecurringItemList items={items} />
      </div>
    </div>
  );
}
