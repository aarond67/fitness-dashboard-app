"use client";

import { Plus, RotateCcw } from "lucide-react";
import { workoutPlanSeed } from "@/data/workoutPlan";
import { WorkoutDay } from "@/lib/types";
import { useLocalStorageState } from "@/lib/storage";

function defaultWorkouts(): WorkoutDay[] {
  return workoutPlanSeed.map((day) => ({
    ...day,
    exercises: day.exercises.map((exercise) => ({ ...exercise }))
  })) as WorkoutDay[];
}

export function WorkoutPlanner() {
  const { state: workouts, setState: setWorkouts, hydrated } = useLocalStorageState<WorkoutDay[]>(
    "fitness-dashboard-workouts",
    defaultWorkouts()
  );

  function updateDay(dayId: string, field: keyof WorkoutDay, value: string) {
    setWorkouts((current) =>
      current.map((day) => (day.id === dayId ? { ...day, [field]: value } : day))
    );
  }

  function updateExercise(dayId: string, exerciseId: string, field: string, value: string | boolean) {
    setWorkouts((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseId ? { ...exercise, [field]: value } : exercise
              )
            }
          : day
      )
    );
  }

  function addExercise(dayId: string) {
    setWorkouts((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                {
                  id: `custom-${Date.now()}`,
                  name: "New Exercise",
                  sets: "3",
                  reps: "8–10",
                  notes: "",
                  done: false
                }
              ]
            }
          : day
      )
    );
  }

  function resetWorkouts() {
    setWorkouts(defaultWorkouts());
  }

  if (!hydrated) {
    return <div className="card">Loading workout planner…</div>;
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Night Weightlifting Split</h2>
          <div className="small">Editable, saved in your browser, and designed around late-evening sessions.</div>
        </div>
        <button className="secondary" onClick={resetWorkouts}><RotateCcw size={16} /> Reset</button>
      </div>

      {workouts.map((day) => (
        <section key={day.id} className="card">
          <div className="section-title">
            <div>
              <div className="tag">{day.timeWindow}</div>
              <h3 style={{ margin: "8px 0 4px" }}>{day.title}</h3>
              <div className="small">{day.focus}</div>
            </div>
            <button onClick={() => addExercise(day.id)}><Plus size={16} /> Add exercise</button>
          </div>

          <div className="grid grid-3">
            <div>
              <label className="small">Title</label>
              <input value={day.title} onChange={(e) => updateDay(day.id, "title", e.target.value)} />
            </div>
            <div>
              <label className="small">Focus</label>
              <input value={day.focus} onChange={(e) => updateDay(day.id, "focus", e.target.value)} />
            </div>
            <div>
              <label className="small">Time window</label>
              <input value={day.timeWindow} onChange={(e) => updateDay(day.id, "timeWindow", e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="small">Session notes</label>
            <textarea value={day.notes ?? ""} onChange={(e) => updateDay(day.id, "notes", e.target.value)} />
          </div>

          <div className="stack" style={{ marginTop: 12 }}>
            {day.exercises.map((exercise) => (
              <article key={exercise.id} className="card" style={{ padding: 16, background: "rgba(15,23,42,0.55)" }}>
                <div className="checkbox-row" style={{ justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <label className="small">Exercise</label>
                    <input
                      value={exercise.name}
                      onChange={(e) => updateExercise(day.id, exercise.id, "name", e.target.value)}
                    />
                  </div>
                  <label className="checkbox-row" style={{ marginLeft: 12 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(exercise.done)}
                      onChange={(e) => updateExercise(day.id, exercise.id, "done", e.target.checked)}
                    />
                    <span className="small">Done</span>
                  </label>
                </div>

                <div className="grid grid-3" style={{ marginTop: 12 }}>
                  <div>
                    <label className="small">Sets</label>
                    <input
                      value={exercise.sets}
                      onChange={(e) => updateExercise(day.id, exercise.id, "sets", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="small">Reps</label>
                    <input
                      value={exercise.reps}
                      onChange={(e) => updateExercise(day.id, exercise.id, "reps", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="small">Notes</label>
                    <input
                      value={exercise.notes ?? ""}
                      onChange={(e) => updateExercise(day.id, exercise.id, "notes", e.target.value)}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
