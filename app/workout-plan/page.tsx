import { PageHeader } from "@/components/PageHeader";
import { WorkoutPlanner } from "@/components/WorkoutPlanner";

export default function WorkoutPlanPage() {
  return (
    <main className="page-shell">
      <PageHeader
        title="Workout Plan"
        description="Night-focused lifting split with editable exercises, sets, reps, checkboxes, and notes."
      />
      <WorkoutPlanner />
    </main>
  );
}
