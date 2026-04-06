"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Dumbbell, TrendingDown } from "lucide-react";
import {
  castBestTimes,
  castOccupancy,
  fetchText,
  hourToLabel,
  latestRows,
  occupancyImageName,
  parseCSV,
} from "@/lib/csv";
import { BestTimeRow, OccupancyRow } from "@/lib/types";

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_GYM_DATA_BASE_URL ||
  "https://aarond67.github.io/ucsd-gym-tracker";

const chartFacilities = [
  "Main Gym Fitness Gym",
  "RIMAC Fitness Gym",
  "Outback Climbing Center",
  "Triton Esports Center",
];

type BestTimeRowExtended = BestTimeRow & {
  day?: string;
  day_of_week?: string;
  sample_count?: string | number;
  confidence?: string;
};

type FacilityWindow = {
  facility_name: string;
  startHour: number;
  avg_percent: number;
  peak_percent: number;
  sample_count: number;
  confidence: string;
  windowHours: number[];
  score: number;
};

function getPacificNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  const lookup = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    weekday: lookup("weekday"),
    hour: Number(lookup("hour") || 0),
    minute: Number(lookup("minute") || 0),
  };
}

function getRowDay(row: BestTimeRowExtended) {
  return row.day ?? row.day_of_week ?? "";
}

function getSampleCount(row: BestTimeRowExtended) {
  return Number(row.sample_count ?? 0);
}

function buildBestWindowForFacility(
  rows: BestTimeRowExtended[],
  currentHour: number,
  currentMinute: number
): FacilityWindow | null {
  if (!rows.length) return null;

  const rowsByHour = new Map<number, BestTimeRowExtended>();
  rows.forEach((row) => {
    rowsByHour.set(Number(row.hour), row);
  });

  const earliestAllowedHour = currentMinute > 30 ? currentHour + 1 : currentHour;
  const candidates: FacilityWindow[] = [];

  rowsByHour.forEach((row, hour) => {
    if (hour < earliestAllowedHour) return;

    const secondHour = rowsByHour.get(hour + 1);
    const thirdHour = rowsByHour.get(hour + 2);

    // prefer 2-hour windows, but allow fallback to shorter if needed
    const baseWindowRows = [row, secondHour].filter(Boolean) as BestTimeRowExtended[];
    const extendedWindowRows = [row, secondHour, thirdHour].filter(Boolean) as BestTimeRowExtended[];
    const chosenRows = extendedWindowRows.length >= 2 ? extendedWindowRows : baseWindowRows;

    if (chosenRows.length < 2) return;

    const percents = chosenRows.map((item) => Number(item.avg_percent));
    const sampleCounts = chosenRows.map((item) => getSampleCount(item));
    const confidences = chosenRows.map((item) => item.confidence ?? "N/A");

    const avg_percent =
      percents.reduce((sum, value) => sum + value, 0) / percents.length;
    const peak_percent = Math.max(...percents);
    const sample_count = Math.min(...sampleCounts);
    const confidence = confidences.includes("High")
      ? "High"
      : confidences.includes("Medium")
      ? "Medium"
      : confidences[0] ?? "N/A";

    // score the window instead of filtering it out
    // lower average is better
    // lower peak is better
    // slightly prefer more complete windows and stronger samples
    const completenessPenalty = chosenRows.length === 2 ? 2 : 0;
    const peakPenalty = peak_percent * 0.35;
    const sampleBonus = Math.min(sample_count, 12) * 0.15;
    const closenessBonus = hour === earliestAllowedHour ? 1 : 0;

    const score =
      avg_percent + peakPenalty + completenessPenalty - sampleBonus - closenessBonus;

    candidates.push({
      facility_name: row.facility_name,
      startHour: hour,
      avg_percent,
      peak_percent,
      sample_count,
      confidence,
      windowHours: chosenRows.map((item) => Number(item.hour)),
      score,
    });
  });

  if (!candidates.length) {
    // final fallback: pick the best single remaining slot
    const singleSlotCandidates = [...rowsByHour.entries()]
      .filter(([hour]) => hour >= earliestAllowedHour)
      .map(([hour, row]) => ({
        facility_name: row.facility_name,
        startHour: hour,
        avg_percent: Number(row.avg_percent),
        peak_percent: Number(row.avg_percent),
        sample_count: getSampleCount(row),
        confidence: row.confidence ?? "N/A",
        windowHours: [hour],
        score: Number(row.avg_percent) + Number(row.avg_percent) * 0.35,
      }));

    if (!singleSlotCandidates.length) return null;

    return singleSlotCandidates.sort((a, b) => {
      const scoreDiff = a.score - b.score;
      if (scoreDiff !== 0) return scoreDiff;

      const avgDiff = a.avg_percent - b.avg_percent;
      if (avgDiff !== 0) return avgDiff;

      return a.startHour - b.startHour;
    })[0];
  }

  return candidates.sort((a, b) => {
    const scoreDiff = a.score - b.score;
    if (scoreDiff !== 0) return scoreDiff;

    const avgDiff = a.avg_percent - b.avg_percent;
    if (avgDiff !== 0) return avgDiff;

    const peakDiff = a.peak_percent - b.peak_percent;
    if (peakDiff !== 0) return peakDiff;

    const sampleDiff = b.sample_count - a.sample_count;
    if (sampleDiff !== 0) return sampleDiff;

    return a.startHour - b.startHour;
  })[0];
}

export function GymOverview() {
  const [occupancyRows, setOccupancyRows] = useState<OccupancyRow[]>([]);
  const [bestRows, setBestRows] = useState<BestTimeRowExtended[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [occRaw, bestCsvRaw] = await Promise.all([
          fetchText(`${DEFAULT_BASE_URL}/ucsd_occupancy_history.csv`),
          fetchText(`${DEFAULT_BASE_URL}/best_times_summary.csv`),
        ]);

        setOccupancyRows(castOccupancy(parseCSV(occRaw)));
        setBestRows(castBestTimes(parseCSV(bestCsvRaw)) as BestTimeRowExtended[]);
      } catch (err) {
        console.error(err);
        setError(
          "Could not load live gym data. Check the GitHub data URL in NEXT_PUBLIC_GYM_DATA_BASE_URL."
        );
      }
    }

    load();
  }, []);

  const latest = useMemo(() => latestRows(occupancyRows), [occupancyRows]);

  const pacificNow = useMemo(() => getPacificNow(), [bestRows, occupancyRows]);
  const todayName = pacificNow.weekday;

  const todayRows = useMemo(() => {
    return bestRows.filter((row) => getRowDay(row) === todayName);
  }, [bestRows, todayName]);

  const todaysLeastBusy = useMemo(() => {
    return [...todayRows].sort((a, b) => {
      const facilityCompare = a.facility_name.localeCompare(b.facility_name);
      if (facilityCompare !== 0) return facilityCompare;

      const percentDiff = Number(a.avg_percent) - Number(b.avg_percent);
      if (percentDiff !== 0) return percentDiff;

      return getSampleCount(b) - getSampleCount(a);
    });
  }, [todayRows]);

  const bestOverall = useMemo(() => {
    if (!bestRows.length) return null;

    return [...bestRows].sort((a, b) => {
      const percentDiff = Number(a.avg_percent) - Number(b.avg_percent);
      if (percentDiff !== 0) return percentDiff;
      return getSampleCount(b) - getSampleCount(a);
    })[0];
  }, [bestRows]);

  const nextBestTodayPerFacility = useMemo(() => {
    const grouped: Record<string, BestTimeRowExtended[]> = {};

    todayRows.forEach((row) => {
      const key = row.facility_name;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    return Object.values(grouped)
      .map((rows) =>
        buildBestWindowForFacility(rows, pacificNow.hour, pacificNow.minute)
      )
      .filter(Boolean)
      .sort((a, b) => {
        const scoreDiff = a!.score - b!.score;
        if (scoreDiff !== 0) return scoreDiff;

        const avgDiff = a!.avg_percent - b!.avg_percent;
        if (avgDiff !== 0) return avgDiff;

        const peakDiff = a!.peak_percent - b!.peak_percent;
        if (peakDiff !== 0) return peakDiff;

        return a!.facility_name.localeCompare(b!.facility_name);
      }) as FacilityWindow[];
  }, [todayRows, pacificNow.hour, pacificNow.minute]);

  return (
    <div className="stack">
      {error ? (
        <div className="card">
          <p className="error">{error}</p>
        </div>
      ) : null}

      <div className="grid grid-2">
        <section className="card">
          <div className="section-title">
            <h2>Next Good Time Today</h2>
            <span className="badge">
              <Clock3 size={16} /> Best next 1.5–2 hr window later today
            </span>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {nextBestTodayPerFacility.length ? (
              nextBestTodayPerFacility.map((row) => (
                <div key={`${row.facility_name}-${row.startHour}`}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {row.facility_name}
                  </div>
                  <div>
                    Next good time: {hourToLabel(row.startHour)} today (~
                    {row.avg_percent.toFixed(1)}% full)
                  </div>
                  <div className="small" style={{ marginTop: 4 }}>
                    Best workout window:{" "}
                    {row.windowHours.map((hour) => hourToLabel(hour)).join(" → ")}
                  </div>
                  <div className="small">
                    Peak during workout: ~{row.peak_percent.toFixed(1)}% · Samples:{" "}
                    {row.sample_count} · {row.confidence} confidence
                  </div>
                </div>
              ))
            ) : (
              <div>No data-backed time blocks are left for {todayName}.</div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Current Snapshot</h2>
            <span className="badge">
              <Activity size={16} /> Latest by facility
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Status</th>
                  <th>% Full</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((row) => (
                  <tr key={row.facility_name}>
                    <td>{row.facility_name}</td>
                    <td>{row.status}</td>
                    <td>{row.percent_full}%</td>
                    <td>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid grid-4">
        <section className="card">
          <div className="badge">
            <Dumbbell size={16} /> Focus
          </div>
          <div className="kpi">Night Lifting</div>
          <div className="small">
            Planner pages are built around late-evening training flow.
          </div>
        </section>

        <section className="card">
          <div className="badge">
            <TrendingDown size={16} /> Best Known Window
          </div>
          <div className="kpi">
            {bestOverall ? hourToLabel(Number(bestOverall.hour)) : "--"}
          </div>
          <div className="small">
            {bestOverall
              ? `${bestOverall.facility_name} · ${getRowDay(bestOverall)}`
              : "Waiting for analysis data"}
          </div>
          <div className="small" style={{ marginTop: 6 }}>
            {bestOverall
              ? `Avg ${Number(bestOverall.avg_percent).toFixed(1)}% · Samples ${getSampleCount(
                  bestOverall
                )} · ${bestOverall.confidence ?? "N/A"} confidence`
              : ""}
          </div>
        </section>

        <section className="card">
          <div className="badge">
            <Activity size={16} /> Facilities Tracked
          </div>
          <div className="kpi">{latest.length || "--"}</div>
          <div className="small">Pulled from your GitHub scraper repo.</div>
        </section>

        <section className="card">
          <div className="badge">
            <Clock3 size={16} /> Sync Loop
          </div>
          <div className="kpi">15 min / 2 hr</div>
          <div className="small">
            Scraper every 15 minutes, analysis every 2 hours.
          </div>
        </section>
      </div>

      <section className="card">
        <div className="section-title">
          <h2>Least Busy Time Blocks</h2>
          <span className="badge">Today only: lowest expected occupancy by facility</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Facility</th>
                <th>Day</th>
                <th>Hour</th>
                <th>Avg % Full</th>
                <th>Samples</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {todaysLeastBusy.map((row, index) => (
                <tr
                  key={`${row.facility_name}-${getRowDay(row)}-${row.hour}-${index}`}
                >
                  <td>{row.facility_name}</td>
                  <td>{getRowDay(row)}</td>
                  <td>{hourToLabel(Number(row.hour))}</td>
                  <td>{Number(row.avg_percent).toFixed(1)}%</td>
                  <td>{getSampleCount(row)}</td>
                  <td>{row.confidence ?? "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Heatmaps & Hourly Charts</h2>
          <span className="badge">Pulled from generated PNGs</span>
        </div>
        <div className="stack">
          {chartFacilities.map((facility) => {
            const file = occupancyImageName(facility);
            const hourly = `${DEFAULT_BASE_URL}/${file}_hourly.png`;
            const heatmap = `${DEFAULT_BASE_URL}/${file}_heatmap.png`;

            return (
              <div key={facility} className="stack">
                <div>
                  <h3 style={{ marginBottom: 6 }}>{facility}</h3>
                  <div className="small">
                    Higher confidence comes after a few days of data.
                  </div>
                </div>
                <div className="chart-grid">
                  <img
                    className="chart-img"
                    src={hourly}
                    alt={`${facility} hourly chart`}
                  />
                  <img
                    className="chart-img"
                    src={heatmap}
                    alt={`${facility} heatmap`}
                  />
                </div>
                <hr className="soft" />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
