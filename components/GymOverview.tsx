"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Dumbbell, TrendingDown } from "lucide-react";
import {
  asBoolean,
  asNumber,
  bucketToLabel,
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

const targetFacilities = ["Main Gym Fitness Gym", "RIMAC Fitness Gym"];
const windowLengths = [4, 3]; // prefer 2h, then 1.5h
const minSamplesPerBucket = 2;

type BestTimeRowExtended = BestTimeRow & {
  day?: string;
  day_of_week?: string;
  sample_count?: string | number;
  confidence?: string;
};

type PredictorWindow = {
  facility_name: string;
  startBucket: number;
  bucketRange: number[];
  avg_percent: number;
  peak_percent: number;
  sample_floor: number;
  sample_total: number;
  confidence: string;
  source_scope: "same_day" | "all_days" | "mixed" | "none";
  score: number;
};

type BucketSummary = {
  bucket: number;
  avg: number;
  p75: number;
  count: number;
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

function getConfidence(count: number) {
  if (count >= 12) return "High";
  if (count >= 6) return "Medium";
  return "Low";
}

function percentile75(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * 0.75));
  return sorted[index];
}

function buildBucketSummaries(rows: OccupancyRow[], weekday?: string) {
  const facilityBuckets = new Map<string, Map<number, number[]>>();

  rows.forEach((row) => {
    if (weekday && row.day_of_week !== weekday) return;

    const facility = row.facility_name;
    const bucket =
      asNumber(row.bucket_index) ?? (() => {
        const [hour, minute] = row.time.split(":").map(Number);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
        const normalizedMinute = minute >= 30 ? 1 : 0;
        return hour * 2 + normalizedMinute;
      })();

    const percent = asNumber(row.percent_full);
    if (bucket === null || percent === null) return;

    const byBucket = facilityBuckets.get(facility) ?? new Map<number, number[]>();
    const values = byBucket.get(bucket) ?? [];
    values.push(percent);
    byBucket.set(bucket, values);
    facilityBuckets.set(facility, byBucket);
  });

  const summaries = new Map<string, Map<number, BucketSummary>>();

  facilityBuckets.forEach((bucketMap, facility) => {
    const normalized = new Map<number, BucketSummary>();
    bucketMap.forEach((values, bucket) => {
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      normalized.set(bucket, {
        bucket,
        avg,
        p75: percentile75(values),
        count: values.length,
      });
    });
    summaries.set(facility, normalized);
  });

  return summaries;
}

function normalizeRowsForPredictor(rows: OccupancyRow[]) {
  return rows.filter((row) => {
    const validFlag = asBoolean(row.is_valid_predictor_row);
    if (validFlag !== null) return validFlag;

    const isOpen = asBoolean(row.is_open);
    const unavailable = asBoolean(row.is_data_unavailable);
    const percent = asNumber(row.percent_full);
    const raw = (row.raw_text ?? "").toLowerCase();
    const status = row.status.toLowerCase();

    if (isOpen === false) return false;
    if (unavailable === true) return false;
    if (status === "closed") return false;
    if (raw.includes("data unavailable")) return false;
    return percent !== null && percent >= 0 && percent <= 100;
  });
}

function buildPredictorWindow(
  facility: string,
  dayBuckets: Map<number, BucketSummary>,
  allBuckets: Map<number, BucketSummary>,
  currentBucket: number
): PredictorWindow | null {
  const candidates: PredictorWindow[] = [];

  for (let startBucket = currentBucket; startBucket < 48; startBucket += 1) {
    for (const windowLength of windowLengths) {
      const bucketRange = Array.from({ length: windowLength }, (_, index) => startBucket + index).filter(
        (bucket) => bucket < 48
      );

      if (bucketRange.length < 3) continue;

      const chosen: Array<{ summary: BucketSummary; source: "same_day" | "all_days" }> = [];
      let sameDayCount = 0;
      let fallbackCount = 0;
      let failed = false;

      for (const bucket of bucketRange) {
        const daySummary = dayBuckets.get(bucket);
        if (daySummary && daySummary.count >= minSamplesPerBucket) {
          chosen.push({ summary: daySummary, source: "same_day" });
          sameDayCount += 1;
          continue;
        }

        const fallbackSummary = allBuckets.get(bucket);
        if (fallbackSummary && fallbackSummary.count >= minSamplesPerBucket) {
          chosen.push({ summary: fallbackSummary, source: "all_days" });
          fallbackCount += 1;
          continue;
        }

        failed = true;
        break;
      }

      if (failed || !chosen.length) continue;

      const avg_percent =
        chosen.reduce((sum, item) => sum + item.summary.avg, 0) / chosen.length;
      const peak_percent = Math.max(...chosen.map((item) => item.summary.p75 || item.summary.avg));
      const sample_floor = Math.min(...chosen.map((item) => item.summary.count));
      const sample_total = chosen.reduce((sum, item) => sum + item.summary.count, 0);
      const source_scope =
        fallbackCount === 0
          ? "same_day"
          : sameDayCount === 0
          ? "all_days"
          : "mixed";

      const fallbackPenalty = fallbackCount * 4;
      const peakPenalty = peak_percent * 0.35;
      const shortPenalty = windowLength === 3 ? 1.5 : 0;
      const sampleBonus = Math.min(sample_total, 40) * 0.08;
      const proximityBonus = Math.max(0, 2 - (startBucket - currentBucket) * 0.2);
      const score = avg_percent + peakPenalty + fallbackPenalty + shortPenalty - sampleBonus - proximityBonus;

      candidates.push({
        facility_name: facility,
        startBucket,
        bucketRange,
        avg_percent,
        peak_percent,
        sample_floor,
        sample_total,
        confidence: getConfidence(sample_floor),
        source_scope,
        score,
      });
    }
  }

  if (!candidates.length) return null;

  return candidates.sort((a, b) => {
    const scoreDiff = a.score - b.score;
    if (scoreDiff !== 0) return scoreDiff;

    const avgDiff = a.avg_percent - b.avg_percent;
    if (avgDiff !== 0) return avgDiff;

    const peakDiff = a.peak_percent - b.peak_percent;
    if (peakDiff !== 0) return peakDiff;

    return a.startBucket - b.startBucket;
  })[0];
}

export function GymOverview() {
  const [occupancyRows, setOccupancyRows] = useState<OccupancyRow[]>([]);
  const [bestRows, setBestRows] = useState<BestTimeRowExtended[]>([]);
  const [error, setError] = useState("");
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const occupancyPath = `${DEFAULT_BASE_URL}/ucsd_occupancy_history_cleaned.csv`;
        const fallbackPath = `${DEFAULT_BASE_URL}/ucsd_occupancy_history.csv`;

        const occupancyPromise = fetchText(occupancyPath).catch(() => fetchText(fallbackPath));
        const bestPromise = fetchText(`${DEFAULT_BASE_URL}/best_times_summary.csv`).catch(() => "");

        const [occRaw, bestCsvRaw] = await Promise.all([occupancyPromise, bestPromise]);
        if (!isMounted) return;

        setOccupancyRows(castOccupancy(parseCSV(occRaw)));
        setBestRows(bestCsvRaw ? (castBestTimes(parseCSV(bestCsvRaw)) as BestTimeRowExtended[]) : []);
        setError("");
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setError(
          "Could not load live gym data. Check the GitHub data URL in NEXT_PUBLIC_GYM_DATA_BASE_URL."
        );
      }
    }

    load();
    const refreshId = window.setInterval(load, 5 * 60 * 1000);
    const clockId = window.setInterval(() => setClockTick((value) => value + 1), 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshId);
      window.clearInterval(clockId);
    };
  }, []);

  const latest = useMemo(() => latestRows(occupancyRows), [occupancyRows]);

  const pacificNow = useMemo(() => getPacificNow(), [clockTick]);
  const todayName = pacificNow.weekday;
  const currentBucket = pacificNow.hour * 2 + (pacificNow.minute >= 30 ? 1 : 0);

  const predictorRows = useMemo(() => normalizeRowsForPredictor(occupancyRows), [occupancyRows]);

  const nextBestTodayPerFacility = useMemo(() => {
    const dayBuckets = buildBucketSummaries(predictorRows, todayName);
    const allBuckets = buildBucketSummaries(predictorRows);

    return targetFacilities
      .map((facility) =>
        buildPredictorWindow(
          facility,
          dayBuckets.get(facility) ?? new Map<number, BucketSummary>(),
          allBuckets.get(facility) ?? new Map<number, BucketSummary>(),
          currentBucket
        )
      )
      .filter(Boolean)
      .sort((a, b) => a!.score - b!.score) as PredictorWindow[];
  }, [predictorRows, todayName, currentBucket]);

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
              <Clock3 size={16} /> Auto-updates from the current Pacific time
            </span>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {nextBestTodayPerFacility.length ? (
              nextBestTodayPerFacility.map((row) => (
                <div key={`${row.facility_name}-${row.startBucket}`}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{row.facility_name}</div>
                  <div>
                    Next best window: {bucketToLabel(row.startBucket)} today (~
                    {row.avg_percent.toFixed(1)}% full)
                  </div>
                  <div className="small" style={{ marginTop: 4 }}>
                    Workout window: {row.bucketRange.map((bucket) => bucketToLabel(bucket)).join(" → ")}
                  </div>
                  <div className="small">
                    Peak during workout: ~{row.peak_percent.toFixed(1)}% · Samples floor: {row.sample_floor} · {row.confidence} confidence
                  </div>
                  <div className="small">
                    Prediction source: {row.source_scope === "same_day" ? "today's weekday pattern" : row.source_scope === "all_days" ? "all-days time fallback" : "mixed same-day + fallback"}
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
          <div className="kpi">Main + RIMAC</div>
          <div className="small">Predictor is tuned specifically for the two lifting gyms.</div>
        </section>

        <section className="card">
          <div className="badge">
            <TrendingDown size={16} /> Best Known Window
          </div>
          <div className="kpi">{bestOverall ? hourToLabel(Number(bestOverall.hour ?? 0)) : "--"}</div>
          <div className="small">
            {bestOverall ? `${bestOverall.facility_name} · ${getRowDay(bestOverall)}` : "Waiting for analysis data"}
          </div>
          <div className="small" style={{ marginTop: 6 }}>
            {bestOverall
              ? `Avg ${Number(bestOverall.avg_percent).toFixed(1)}% · Samples ${getSampleCount(bestOverall)} · ${bestOverall.confidence ?? "N/A"} confidence`
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
          <div className="kpi">5 min / 1 min</div>
          <div className="small">Data refresh every 5 minutes, clock-aware predictor every minute.</div>
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
                <tr key={`${row.facility_name}-${getRowDay(row)}-${row.hour ?? row.bucket_index}-${index}`}>
                  <td>{row.facility_name}</td>
                  <td>{getRowDay(row)}</td>
                  <td>
                    {row.time_bucket_30
                      ? bucketToLabel(asNumber(row.bucket_index) ?? 0)
                      : hourToLabel(Number(row.hour ?? 0))}
                  </td>
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
