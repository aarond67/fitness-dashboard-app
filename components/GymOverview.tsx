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

  const todayName = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "America/Los_Angeles",
      }).format(new Date()),
    []
  );

  const getRowDay = (row: BestTimeRowExtended) => row.day ?? row.day_of_week ?? "";
  const getSampleCount = (row: BestTimeRowExtended) =>
    Number(row.sample_count ?? 0);

  const topThreePerFacility = useMemo(() => {
    const grouped: Record<string, BestTimeRowExtended[]> = {};

    bestRows.forEach((row) => {
      const key = row.facility_name;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    const result: BestTimeRowExtended[] = [];

    Object.values(grouped).forEach((rows) => {
      const topThree = [...rows]
        .sort((a, b) => {
          const percentDiff = Number(a.avg_percent) - Number(b.avg_percent);
          if (percentDiff !== 0) return percentDiff;
          return getSampleCount(b) - getSampleCount(a);
        })
        .slice(0, 3);

      result.push(...topThree);
    });

    return result.sort((a, b) => {
      if (a.facility_name !== b.facility_name) {
        return a.facility_name.localeCompare(b.facility_name);
      }
      const percentDiff = Number(a.avg_percent) - Number(b.avg_percent);
      if (percentDiff !== 0) return percentDiff;
      return getSampleCount(b) - getSampleCount(a);
    });
  }, [bestRows]);

  const bestOverall = useMemo(() => {
    if (!bestRows.length) return null;

    return [...bestRows].sort((a, b) => {
      const percentDiff = Number(a.avg_percent) - Number(b.avg_percent);
      if (percentDiff !== 0) return percentDiff;
      return getSampleCount(b) - getSampleCount(a);
    })[0];
  }, [bestRows]);

  const bestTodayPerFacility = useMemo(() => {
    const todaysRows = bestRows.filter((row) => getRowDay(row) === todayName);

    const grouped: Record<string, BestTimeRowExtended> = {};

    todaysRows.forEach((row) => {
      const key = row.facility_name;

      if (!grouped[key]) {
        grouped[key] = row;
        return;
      }

      const current = grouped[key];
      const percentDiff = Number(row.avg_percent) - Number(current.avg_percent);

      if (percentDiff < 0) {
        grouped[key] = row;
      } else if (percentDiff === 0 && getSampleCount(row) > getSampleCount(current)) {
        grouped[key] = row;
      }
    });

    return Object.values(grouped).sort((a, b) => {
      const percentDiff = Number(a.avg_percent) - Number(b.avg_percent);
      if (percentDiff !== 0) return percentDiff;
      return getSampleCount(b) - getSampleCount(a);
    });
  }, [bestRows, todayName]);

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
            <h2>Best Time Today</h2>
            <span className="badge">
              <Clock3 size={16} /> Best slot today by facility
            </span>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {bestTodayPerFacility.length ? (
              bestTodayPerFacility.map((row, index) => (
                <div key={`${row.facility_name}-${index}`}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {row.facility_name}
                  </div>
                  <div>
                    {getRowDay(row)} at {hourToLabel(Number(row.hour))}
                  </div>
                  <div>Avg occupancy: {Number(row.avg_percent).toFixed(1)}%</div>
                  <div className="small">
                    Samples: {getSampleCount(row)} · Confidence:{" "}
                    {row.confidence ?? "N/A"}
                  </div>
                </div>
              ))
            ) : (
              <div>No best-time data yet for {todayName}.</div>
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
          <span className="badge">Top 3 slots per facility</span>
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
              {topThreePerFacility.map((row, index) => (
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
