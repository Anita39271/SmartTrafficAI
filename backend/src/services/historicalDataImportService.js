import { prisma } from "../utils/prisma.js";

const REQUIRED_COLUMNS = [
  "road_name",
  "suburb",
  "latitude",
  "longitude",
  "date",
  "day_of_week",
  "time",
  "traffic_volume",
  "average_speed",
  "congestion_level",
  "incident_count",
  "roadwork_active",
  "weather",
  "source",
];

const VALID_CONGESTION = new Set(["low", "medium", "high", "severe"]);

export function historicalTemplateCsv() {
  return [
    REQUIRED_COLUMNS.join(","),
    "M1 Pacific Motorway,Springwood,-27.635,153.13,2025-02-03,Monday,08:30,9800,62,medium,1,true,clear,imported_historical_data",
    "Ipswich Road,Annerley,-27.512,153.032,2025-02-03,Monday,17:15,8700,29,high,2,false,rain,imported_historical_data",
  ].join("\n");
}

export async function importHistoricalDataRequest(req) {
  const parsed = await parseIncomingRows(req);
  const rows = parsed.rows;
  const summary = {
    filename: parsed.filename || "uploaded historical traffic data",
    total_rows: rows.length,
    inserted_rows: 0,
    updated_rows: 0,
    skipped_duplicate_rows: 0,
    invalid_rows: 0,
    errors: [],
    preview: rows.slice(0, 10),
  };

  const seenKeys = new Set();
  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const normalized = normalizeHistoricalRow(rows[index]);
    if (!normalized.ok) {
      summary.invalid_rows += 1;
      summary.errors.push({ row: rowNumber, errors: normalized.errors, raw: rows[index] });
      continue;
    }

    const data = normalized.data;
    const duplicateKey = recordKey(data);
    if (seenKeys.has(duplicateKey)) {
      summary.skipped_duplicate_rows += 1;
      continue;
    }
    seenKeys.add(duplicateKey);

    const existing = await prisma.historicalTrafficData.findFirst({
      where: {
        road_name: { equals: data.road_name, mode: "insensitive" },
        suburb: { equals: data.suburb, mode: "insensitive" },
        date: data.date,
        time: data.time,
      },
    });

    if (!existing) {
      await prisma.historicalTrafficData.create({ data });
      summary.inserted_rows += 1;
      continue;
    }

    if (newRecordIsBetter(existing, data)) {
      await prisma.historicalTrafficData.update({ where: { id: existing.id }, data });
      summary.updated_rows += 1;
    } else {
      summary.skipped_duplicate_rows += 1;
    }
  }

  return summary;
}

export async function historicalDataStats() {
  const [total, first, latest, byCongestion, bySource, topRoads] = await Promise.all([
    prisma.historicalTrafficData.count(),
    prisma.historicalTrafficData.findFirst({ orderBy: { date: "asc" } }),
    prisma.historicalTrafficData.findFirst({ orderBy: { date: "desc" } }),
    prisma.historicalTrafficData.groupBy({ by: ["congestion_level"], _count: { _all: true }, orderBy: { congestion_level: "asc" } }),
    prisma.historicalTrafficData.groupBy({ by: ["source"], _count: { _all: true }, orderBy: { source: "asc" } }),
    prisma.historicalTrafficData.groupBy({ by: ["road_name"], _count: { _all: true }, orderBy: { _count: { road_name: "desc" } }, take: 10 }),
  ]);

  const coverage = calculateCoverage(first?.date, latest?.date);
  return {
    total_historical_records: total,
    earliest_date: first?.date?.toISOString().slice(0, 10) || null,
    latest_date: latest?.date?.toISOString().slice(0, 10) || null,
    coverage_months: coverage.months,
    coverage_years: coverage.years,
    coverage_label: coverage.label,
    top_roads_by_record_count: topRoads.map((item) => ({ road_name: item.road_name, records: item._count._all })),
    records_by_congestion_level: Object.fromEntries(byCongestion.map((item) => [item.congestion_level, item._count._all])),
    records_by_source: Object.fromEntries(bySource.map((item) => [item.source, item._count._all])),
    enough_data_for_training: total >= 1000,
    model_data_readiness:
      total >= 10000 ? "good MVP model data volume" :
      total >= 1000 ? "small real-data model data volume" :
      "not enough real imported data for a real-data model",
    recommended_mvp_target: "1-2 years of clean imported historical traffic data",
    five_year_support: "supported by schema and import pipeline; only show five-year coverage when dates prove it",
  };
}

async function parseIncomingRows(req) {
  if (Array.isArray(req.body?.rows)) return { rows: req.body.rows, filename: req.body.filename };
  if (Array.isArray(req.body?.data)) return { rows: req.body.data, filename: req.body.filename };
  if (typeof req.body?.content === "string") return parseContent(req.body.content, req.body.filename || "upload.csv");

  const bodyText = await readRequestBody(req);
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    const file = extractMultipartFile(bodyText, contentType);
    if (!file.content) {
      const error = new Error("Upload file was not found in the request.");
      error.status = 400;
      throw error;
    }
    return parseContent(file.content, file.filename);
  }
  return parseContent(bodyText, req.headers["x-filename"] || "upload.csv");
}

function parseContent(content, filename = "upload.csv") {
  const trimmed = String(content || "").trim();
  if (!trimmed) {
    const error = new Error("Uploaded file is empty.");
    error.status = 400;
    throw error;
  }
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    const rows = Array.isArray(parsed) ? parsed : parsed.rows || parsed.data || parsed.features?.map((feature) => feature.properties || feature);
    if (!Array.isArray(rows)) {
      const error = new Error("JSON upload must be an array or contain rows/data/features.");
      error.status = 400;
      throw error;
    }
    return { rows, filename };
  }
  return { rows: parseCsv(trimmed), filename };
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => normalizeKey(header));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function extractMultipartFile(bodyText, contentType) {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[1] || contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[2];
  if (!boundary) return {};
  const parts = bodyText.split(`--${boundary}`);
  for (const part of parts) {
    if (!part.includes("filename=")) continue;
    const [rawHeaders, ...bodyParts] = part.split(/\r?\n\r?\n/);
    const filename = rawHeaders.match(/filename="([^"]+)"/)?.[1] || "upload.csv";
    const content = bodyParts.join("\n\n").replace(/\r?\n--$/, "").trimEnd();
    return { filename, content };
  }
  return {};
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20 * 1024 * 1024) {
        reject(Object.assign(new Error("Upload is too large. Please split the file into smaller imports."), { status: 413 }));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function normalizeHistoricalRow(row) {
  const source = normalizeKeys(row);
  const errors = [];
  const roadName = text(source.road_name || source.road);
  const suburb = text(source.suburb || source.location || source.area || "Unknown");
  const date = parseDate(source.date);
  const time = parseTime(source.time);
  const latitude = optionalNumber(source.latitude);
  const longitude = optionalNumber(source.longitude);
  const averageSpeed = optionalNumber(source.average_speed);
  const trafficVolume = optionalInteger(source.traffic_volume);
  const incidentCount = optionalInteger(source.incident_count) ?? 0;
  const roadworkActive = parseBoolean(source.roadwork_active);
  const congestion = normalizeCongestion(source.congestion_level || source.level, averageSpeed, trafficVolume);

  if (!roadName) errors.push("road_name is required");
  if (!date) errors.push("date is invalid or missing");
  if (!time) errors.push("time is invalid or missing");
  if (averageSpeed === null && trafficVolume === null) errors.push("average_speed or traffic_volume is required");
  if (latitude !== null && (latitude < -90 || latitude > 90)) errors.push("latitude must be between -90 and 90");
  if (longitude !== null && (longitude < -180 || longitude > 180)) errors.push("longitude must be between -180 and 180");
  if (!congestion) errors.push("congestion_level must be low, medium, high, severe, or derivable from average_speed");
  if (source.traffic_volume !== undefined && trafficVolume === null && String(source.traffic_volume).trim() !== "") errors.push("traffic_volume must be numeric");
  if (source.average_speed !== undefined && averageSpeed === null && String(source.average_speed).trim() !== "") errors.push("average_speed must be numeric");

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      road_name: roadName,
      suburb,
      latitude,
      longitude,
      date,
      day_of_week: text(source.day_of_week) || date.toLocaleDateString("en-US", { weekday: "long" }),
      time,
      traffic_volume: trafficVolume ?? 0,
      average_speed: averageSpeed ?? 0,
      congestion_level: congestion,
      incident_count: incidentCount,
      roadwork_active: roadworkActive,
      weather: text(source.weather || "unknown"),
      source: text(source.source || "uploaded_file"),
    },
  };
}

function normalizeKeys(row) {
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [normalizeKey(key), value]));
}

function normalizeKey(key) {
  return String(key || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function text(value) {
  return String(value ?? "").trim();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTime(value) {
  const match = String(value || "").trim().match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function optionalNumber(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function optionalInteger(value) {
  const number = optionalNumber(value);
  return number === null ? null : Math.round(number);
}

function parseBoolean(value) {
  return ["true", "1", "yes", "y"].includes(String(value ?? "").trim().toLowerCase());
}

function normalizeCongestion(value, averageSpeed, trafficVolume) {
  const normalized = String(value || "").trim().toLowerCase();
  const mapped = normalized.replace("moderate", "medium").replace("heavy", "high");
  if (VALID_CONGESTION.has(mapped)) return mapped;
  if (averageSpeed !== null) {
    if (averageSpeed <= 25) return "severe";
    if (averageSpeed <= 40) return "high";
    if (averageSpeed <= 55) return "medium";
    return "low";
  }
  if (trafficVolume !== null) {
    if (trafficVolume >= 11000) return "severe";
    if (trafficVolume >= 8500) return "high";
    if (trafficVolume >= 5000) return "medium";
    return "low";
  }
  return null;
}

function recordKey(data) {
  return `${data.road_name.toLowerCase()}|${data.suburb.toLowerCase()}|${data.date.toISOString().slice(0, 10)}|${data.time}`;
}

function completenessScore(record) {
  return [
    record.latitude,
    record.longitude,
    record.traffic_volume,
    record.average_speed,
    record.incident_count,
    record.roadwork_active,
    record.weather,
    record.source,
  ].filter((value) => value !== null && value !== undefined && value !== "" && value !== false).length;
}

function newRecordIsBetter(existing, incoming) {
  return completenessScore(incoming) > completenessScore(existing);
}

function calculateCoverage(firstDate, latestDate) {
  if (!firstDate || !latestDate) return { months: 0, years: 0, label: "No historical data imported" };
  const days = Math.max(1, Math.round((latestDate.getTime() - firstDate.getTime()) / 86400000) + 1);
  const months = Math.max(1, Math.round(days / 30.44));
  const years = Number((days / 365.25).toFixed(2));
  if (months < 12) return { months, years, label: `${months} month${months === 1 ? "" : "s"}` };
  return { months, years, label: `${years} years` };
}
