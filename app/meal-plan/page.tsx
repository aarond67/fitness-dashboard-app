import { MealPlanner } from "@/components/MealPlanner";
import { PageHeader } from "@/components/PageHeader";

export default function MealPlanPage() {
  return (
    <main className="page-shell">
      <PageHeader
        title="Meal Plan"
        description="Built from your uploaded meal spreadsheet, but fully editable and saved locally in your browser."
      />
      <MealPlanner />
    </main>
  );
}
