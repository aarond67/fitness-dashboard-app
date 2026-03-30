"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Dumbbell, TrendingDown } from "lucide-react";
import { castBestTimes, castOccupancy, fetchText, hourToLabel, latestRows, occupancyImageName, parseCSV } from "@/lib/csv";
import { BestTimeRow, OccupancyRow } from "@/lib/types";

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_GYM_DATA_BASE_URL || "https://aarond67.github.io/ucsd-gym-tracker";

const chartFacilities = [
  "Main Gym Fitness Gym",
  "RIMAC Fitness Gym",
  "Outback Climbing Center",
  "Triton Esports Center"
];

export function GymOverview() {
  const [bestTimeText, setBestTimeText] = useState("Loading...");
  const [occupancyRows, setOccupancyRows] = useState<OccupancyRow[]>([]);
  const [bestRows, setBestRows] = useState<BestTimeRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [bestTextRaw, occRaw, bestCsvRaw] = await Promise.all([
          fetchText(`${DEFAULT_BASE_URL}/best_time_today.txt`),
          fetchText(`${DEFAULT_BASE_URL}/ucsd_occupancy_history.csv`),
          fetchText(`${DEFAULT_BASE_URL}/best_times_summary.csv`)
        ]);

        setBestTimeText(bestTextRaw);
        setOccupancyRows(castOccupancy(parseCSV(occRaw)));
        setBestRows(castBestTimes(parseCSV(bestCsvRaw)));
      } catch (err) {
        console.error(err);
        setError("Could not load live gym data. Check the GitHub data URL in NEXT_PUBLIC_GYM_DATA_BASE_URL.");
      }
    }

    load();
  }, []);

  const latest = useMemo(() => latestRows(occupancyRows), [occupancyRows]);

  return (
    <div className="stack">
      {error ? <div className="card"><p className="error">{error}</p></div> : null}

      <div className="grid grid-2">
        <section className="card">
          <div className="section-title">
            <h2>Best Time Today</h2>
            <span className="badge"><Clock3 size={16} /> Live from GitHub data</span>
          </div>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit", lineHeight: 1.6 }}>
            {bestTimeText}
          </pre>
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Current Snapshot</h2>
            <span className="badge"><Activity size={16} /> Latest by facility</span>
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
          <div className="badge"><Dumbbell size={16} /> Focus</div>
          <div className="kpi">Night Lifting</div>
          <div className="small">Planner pages are built around late-evening training flow.</div>
        </section>
        <section className="card">
          <div className="badge"><TrendingDown size={16} /> Best Known Window</div>
          <div className="kpi">
            {bestRows.length ? `${hourToLabel(Number(bestRows[0].hour))}` : "--"}
          </div>
          <div className="small">
            {bestRows.length ? `${bestRows[0].facility_name} · ${bestRows[0].day}` : "Waiting for analysis data"}
          </div>
        </section>
        <section className="card">
          <div className="badge"><Activity size={16} /> Facilities Tracked</div>
          <div className="kpi">{latest.length || "--"}</div>
          <div className="small">Pulled from your GitHub scraper repo.</div>
        </section>
        <section className="card">
          <div className="badge"><Clock3 size={16} /> Sync Loop</div>
          <div className="kpi">15 min / 4 hr</div>
          <div className="small">Scraper every 15 minutes, analysis every 4 hours.</div>
        </section>
      </div>

      <section className="card">
        <div className="section-title">
          <h2>Least Busy Time Blocks</h2>
          <span className="badge">Top slots by facility</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Facility</th>
                <th>Day</th>
                <th>Hour</th>
                <th>Avg % Full</th>
              </tr>
            </thead>
            <tbody>
              {bestRows.map((row, index) => (
                <tr key={`${row.facility_name}-${row.day}-${row.hour}-${index}`}>
                  <td>{row.facility_name}</td>
                  <td>{row.day}</td>
                  <td>{hourToLabel(Number(row.hour))}</td>
                  <td>{Number(row.avg_percent).toFixed(1)}%</td>
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
                  <div className="small">Higher confidence comes after a few days of data.</div>
                </div>
                <div className="chart-grid">
                  <img className="chart-img" src={hourly} alt={`${facility} hourly chart`} />
                  <img className="chart-img" src={heatmap} alt={`${facility} heatmap`} />
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
