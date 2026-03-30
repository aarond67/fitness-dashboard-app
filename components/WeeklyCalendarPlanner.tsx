"use client";

import { useMemo, useState } from "react";
import { CalendarDays, RotateCcw } from "lucide-react";
import { calendarSeed } from "@/data/calendarSeed";
import { DAYS } from "@/lib/constants";
import { CalendarEntry } from "@/lib/types";
import { useLocalStorageState } from "@/lib/storage";

function defaultCalendar(): CalendarEntry[] {
  return calendarSeed.map((entry) => ({ ...entry })) as CalendarEntry[];
}

export function WeeklyCalendarPlanner() {
  const { state: entries, setState: setEntries, hydrated } = useLocalStorageState<CalendarEntry[]>(
    "fitness-dashboard-calendar",
    defaultCalendar()
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    return DAYS.map((day) => ({
      day,
      entries: entries.filter((entry) => entry.day === day)
    }));
  }, [entries]);

  function moveEntry(entryId: string, day: string) {
    setEntries((current) =>
      current.map((entry) => (entry.id === entryId ? { ...entry, day } : entry))
    );
  }

  function updateEntry(entryId: string, patch: Partial<CalendarEntry>) {
    setEntries((current) =>
      current.map((entry) => (entry.id === entryId ? ({ ...entry, ...patch } as CalendarEntry) : entry))
    );
  }

  function resetCalendar() {
    setEntries(defaultCalendar());
  }

  if (!hydrated) {
    return <div className="card">Loading weekly calendar…</div>;
  }

  return (
    <div className="stack">
      <div className="section-title">
        <div>
          <h2 style={{ marginBottom: 6 }}>Weekly Planner</h2>
          <div className="small">Drag meals and workouts between days. Check them off and keep notes under each card.</div>
        </div>
        <button className="secondary" onClick={resetCalendar}><RotateCcw size={16} /> Reset week</button>
      </div>

      <div className="grid grid-4">
        <section className="card">
          <div className="badge"><CalendarDays size={16} /> Total planned items</div>
          <div className="kpi">{entries.length}</div>
          <div className="small">Meals and workouts currently on the week board.</div>
        </section>
        <section className="card">
          <div className="badge">Completed</div>
          <div className="kpi">{entries.filter((entry) => entry.checked).length}</div>
          <div className="small">Checked off in your local browser state.</div>
        </section>
        <section className="card">
          <div className="badge">Workout days</div>
          <div className="kpi">{entries.filter((entry) => entry.type === "workout").length}</div>
          <div className="small">Starter split is 5 lifting nights.</div>
        </section>
        <section className="card">
          <div className="badge">Meal blocks</div>
          <div className="kpi">{entries.filter((entry) => entry.type === "meal").length}</div>
          <div className="small">You can drag these anywhere in the week.</div>
        </section>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(7, minmax(260px, 1fr))", overflowX: "auto" }}>
        {byDay.map(({ day, entries: dayEntries }) => (
          <section
            key={day}
            className={`day-column ${dragOverDay === day ? "drag-over" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOverDay(day);
            }}
            onDragLeave={() => setDragOverDay(null)}
            onDrop={(event) => {
              event.preventDefault();
              const entryId = event.dataTransfer.getData("text/plain");
              if (entryId) moveEntry(entryId, day);
              setDragId(null);
              setDragOverDay(null);
            }}
          >
            <div className="section-title" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>{day}</h3>
              <span className="small">{dayEntries.length} items</span>
            </div>

            {dayEntries.map((entry) => (
              <article
                key={entry.id}
                className={`draggable-card ${dragId === entry.id ? "dragging" : ""}`}
                draggable
                onDragStart={(event) => {
                  setDragId(entry.id);
                  event.dataTransfer.setData("text/plain", entry.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDragOverDay(null);
                }}
              >
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="tag">{entry.type}</div>
                    <h4 style={{ margin: "8px 0 6px" }}>{entry.title}</h4>
                  </div>
                  <label className="checkbox-row" style={{ alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(entry.checked)}
                      onChange={(e) => updateEntry(entry.id, { checked: e.target.checked })}
                    />
                    <span className="small">Done</span>
                  </label>
                </div>
                <label className="small">Notes</label>
                <textarea
                  value={entry.notes ?? ""}
                  onChange={(e) => updateEntry(entry.id, { notes: e.target.value })}
                  style={{ minHeight: 72 }}
                />
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
