import { NextResponse } from "next/server";

const WAITZ_URL = "https://waitz.io/live/ucsd-rec";
const KNOWN_FACILITIES = new Set([
  "Main Gym Fitness Gym",
  "RIMAC Fitness Gym",
  "Outback Climbing Center",
  "Triton Esports Center",
]);

function pacificNowParts() {
  const now = new Date();
  const timestamp = now.toLocaleString("sv-SE", {
    timeZone: "America/Los_Angeles",
    hour12: false,
  }).replace(" ", "T");

  const day_of_week = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
  }).format(now);

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return { timestamp, day_of_week, date, time };
}

function normalizeStatus(item: Record<string, unknown>) {
  const locHtml = (item.locHtml as Record<string, unknown> | undefined) ?? {};
  const summary = String(locHtml.summary ?? "").trim();

  if (summary.startsWith("Not Busy")) return "Not Busy";
  if (summary.startsWith("Active")) return "Active";
  if (summary.startsWith("Busy")) return "Busy";
  if (summary.startsWith("Very Busy")) return "Very Active";
  if (summary.startsWith("Data Unavailable")) return "Data Unavailable";
  if (summary.startsWith("Closed")) return "Closed";

  const isOpen = Boolean(item.isOpen);
  const isAvailable = Boolean(item.isAvailable);
  const percent = Number(item.busyness ?? 0);

  if (!isOpen) return "Closed";
  if (!isAvailable) return "Data Unavailable";
  if (percent >= 75) return "Very Active";
  if (percent >= 50) return "Busy";
  if (percent >= 25) return "Active";
  return "Not Busy";
}

export async function GET() {
  try {
    const response = await fetch(WAITZ_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json,text/plain,*/*",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Waitz request failed: ${response.status}` }, { status: 502 });
    }

    const payload = await response.json();
    const data = Array.isArray(payload?.data) ? payload.data : [];
    const now = pacificNowParts();

    const rows = data
      .filter((item: Record<string, unknown>) => KNOWN_FACILITIES.has(String(item.name ?? "").trim()))
      .map((item: Record<string, unknown>) => {
        const locHtml = (item.locHtml as Record<string, unknown> | undefined) ?? {};
        const rawText = String(locHtml.summary ?? "").trim();
        const isOpen = Boolean(item.isOpen);
        const isAvailable = Boolean(item.isAvailable);

        return {
          ...now,
          facility_name: String(item.name ?? "").trim(),
          status: normalizeStatus(item),
          percent_full: Number(item.busyness ?? 0),
          raw_text: rawText,
          people: Number(item.people ?? 0),
          capacity: Number(item.capacity ?? 0),
          is_open: isOpen,
          hour_summary: String(item.hourSummary ?? "").trim() || "unknown",
          is_data_unavailable: !isAvailable && isOpen,
          is_valid_predictor_row: isOpen && isAvailable,
        };
      })
      .sort((a: { facility_name: string }, b: { facility_name: string }) =>
        a.facility_name.localeCompare(b.facility_name)
      );

    return NextResponse.json(rows, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch live Waitz data" }, { status: 500 });
  }
}
