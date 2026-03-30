import { PageHeader } from "@/components/PageHeader";
import { GymOverview } from "@/components/GymOverview";

export default function HomePage() {
  return (
    <main className="page-shell">
      <PageHeader
        title="Fitness Command Center"
        description="Modern dashboard for gym occupancy, best times to go, meal planning, workouts, and your weekly drag-and-drop calendar."
      />
      <GymOverview />
    </main>
  );
}
