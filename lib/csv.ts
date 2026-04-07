import { BestTimeRow, OccupancyRow } from "@/lib/types";

export function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function splitCSVLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

export function latestRows(rows: OccupancyRow[]) {
  const latestByFacility = new Map<string, OccupancyRow>();
  rows.forEach((row) => {
    const existing = latestByFacility.get(row.facility_name);
    if (!existing || row.timestamp > existing.timestamp) {
      latestByFacility.set(row.facility_name, row);
    }
  });
  return Array.from(latestByFacility.values()).sort((a, b) =>
    a.facility_name.localeCompare(b.facility_name)
  );
}

export function hourToLabel(hour: number) {
  return `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
}

export function bucketToLabel(bucket: number) {
  const hour = Math.floor(bucket / 2);
  const minutes = bucket % 2 === 0 ? "00" : "30";
  const suffix = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

export function occupancyImageName(facility: string) {
  return facility.split(" ").join("_");
}

export async function fetchText(url: string) {
  const response = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.text();
}

export function castBestTimes(rows: Record<string, string>[]): BestTimeRow[] {
  return rows as unknown as BestTimeRow[];
}

export function castOccupancy(rows: Record<string, string>[]): OccupancyRow[] {
  return rows as unknown as OccupancyRow[];
}

export function asNumber(value: string | number | undefined | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function asBoolean(value: string | boolean | undefined | null) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}
