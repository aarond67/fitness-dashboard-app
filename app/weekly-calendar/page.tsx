import { PageHeader } from "@/components/PageHeader";
import { WeeklyCalendarPlanner } from "@/components/WeeklyCalendarPlanner";

export default function WeeklyCalendarPage() {
  return (
    <main className="page-shell">
      <PageHeader
        title="Weekly Calendar"
        description="Drag meals and workout blocks across the week, check them off, and keep your own notes per day."
      />
      <WeeklyCalendarPlanner />
    </main>
  );
}
