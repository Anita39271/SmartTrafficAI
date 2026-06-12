import bcrypt from "bcrypt";
import { prisma } from "../utils/prisma.js";
import { publicAccount } from "../utils/tokens.js";
import { featureToRecords, fetchQldTrafficGeoJson, isMockTrafficMode } from "../services/qldTrafficService.js";
import { historicalDataStats, historicalTemplateCsv, importHistoricalDataRequest } from "../services/historicalDataImportService.js";

async function logAdmin(adminId, action, details) {
  await prisma.adminLog.create({ data: { admin_id: adminId, action, details: typeof details === "string" ? details : JSON.stringify(details) } });
}

function parseDate(value) {
  if (!value) return new Date();
  return new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
}

function mapTraffic(record) {
  return {
    id: record.id,
    road: record.road_name,
    road_name: record.road_name,
    location: record.suburb || record.location,
    suburb: record.suburb || record.location,
    latitude: record.latitude,
    longitude: record.longitude,
    traffic_volume: record.traffic_volume,
    average_speed: record.average_speed,
    type: record.source,
    level: record.congestion_level,
    congestion_level: record.congestion_level,
    speed: record.average_speed ? `${record.average_speed} km/h` : "",
    updated: record.updated_at.toLocaleString(),
    date: record.date,
    day_of_week: record.day_of_week,
    time: record.time,
    incident_count: record.incident_count,
    roadwork_active: record.roadwork_active,
    weather: record.weather,
    source: record.source,
  };
}

function mapIncident(incident) {
  return {
    id: incident.id,
    external_id: incident.external_id,
    incident_type: incident.incident_type,
    road_name: incident.road_name,
    description: incident.description,
    latitude: incident.latitude,
    longitude: incident.longitude,
    severity: incident.severity,
    start_date: incident.start_date,
    end_date: incident.end_date,
    status: incident.status,
    source: incident.source,
    raw_data: incident.raw_data,
  };
}

export async function dashboard(req, res, next) {
  try {
    const [totalTraffic, activeRoadworks, activeIncidents, predictions, highRiskRoutes, lastTraffic, lastTrainingRun, lastTrainingLog, lastFetch] = await Promise.all([
      prisma.historicalTrafficData.count(),
      prisma.incident.count({ where: { incident_type: "roadwork", status: { in: ["active", "planned"] } } }),
      prisma.incident.count({ where: { status: { in: ["active", "planned"] } } }),
      prisma.routePrediction.count(),
      prisma.routePrediction.count({ where: { route_colour: { in: ["red", "dark red"] } } }),
      prisma.historicalTrafficData.findFirst({ orderBy: { updated_at: "desc" } }),
      prisma.modelTrainingRun.findFirst({ orderBy: { started_at: "desc" } }),
      prisma.adminLog.findFirst({ where: { action: "train_ai_model" }, orderBy: { created_at: "desc" } }),
      prisma.adminLog.findFirst({ where: { action: "fetch_live_data" }, orderBy: { created_at: "desc" } }),
    ]);
    const lastFetchDetails = parseLogDetails(lastFetch?.details);
    res.json({
      total_traffic_records: totalTraffic,
      active_roadworks: activeRoadworks,
      active_incidents: activeIncidents,
      ai_predictions_generated: predictions,
      high_risk_routes: highRiskRoutes,
      last_data_upload_date: lastTraffic?.updated_at?.toLocaleDateString() || "No uploads yet",
      model_status: lastTrainingRun?.status || "development/sample-data model",
      model_records_used: lastTrainingRun?.records_used ?? 0,
      model_accuracy_score: lastTrainingRun?.accuracy_score ?? null,
      last_ai_model_training_date: lastTrainingRun?.completed_at?.toLocaleDateString() || lastTrainingLog?.created_at?.toLocaleDateString() || "Not trained yet",
      last_live_data_fetch_time: lastFetch?.created_at?.toISOString() || null,
      total_fetched_traffic_records: lastFetchDetails?.total_saved ?? 0,
      live_source_status: isMockTrafficMode() ? "Development Traffic Source" : "QLDTraffic Live API",
    });
  } catch (error) {
    next(error);
  }
}

function parseLogDetails(details) {
  try {
    return JSON.parse(details || "{}");
  } catch {
    return {};
  }
}

export async function listUsers(req, res, next) {
  try {
    const accounts = await prisma.user.findMany({ orderBy: { created_at: "desc" } });
    res.json({
      users: accounts.filter((item) => item.role === "user").map(publicAccount),
      admins: accounts.filter((item) => item.role !== "user").map(publicAccount),
    });
  } catch (error) {
    next(error);
  }
}

export async function createAdmin(req, res, next) {
  try {
    const { full_name, email, password, role = "admin" } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ message: "Name, email, and password are required" });
    if (!["admin", "super_admin"].includes(role)) return res.status(400).json({ message: "Invalid admin role" });
    const admin = await prisma.user.create({
      data: { full_name, email: email.toLowerCase(), password_hash: await bcrypt.hash(password, 10), role },
    });
    await logAdmin(req.account.id, "create_admin", { admin_id: admin.id, email: admin.email, role });
    res.status(201).json({ admin: publicAccount(admin) });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "Email already exists" });
    next(error);
  }
}

export async function changeRole(req, res, next) {
  try {
    if (!["user", "admin", "super_admin"].includes(req.body.role)) return res.status(400).json({ message: "Invalid role" });
    const account = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role } });
    await logAdmin(req.account.id, "change_user_role", { user_id: account.id, role: req.body.role });
    res.json({ admin: publicAccount(account), message: "Role changed" });
  } catch (error) {
    next(error);
  }
}

export async function removeAdmin(req, res, next) {
  try {
    const admin = await prisma.user.findFirst({ where: { id: req.params.id, role: { in: ["admin", "super_admin"] } } });
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    await prisma.user.delete({ where: { id: req.params.id } });
    await logAdmin(req.account.id, "remove_admin", { admin_id: req.params.id });
    res.json({ message: "Admin removed" });
  } catch (error) {
    next(error);
  }
}

export async function uploadTraffic(req, res, next) {
  try {
    const body = req.body || {};
    const date = parseDate(body.date);
    const record = await prisma.historicalTrafficData.create({
      data: {
        road_name: body.road_name || body.road || "Uploaded Road",
        suburb: body.suburb || body.location || "Queensland",
        latitude: body.latitude === undefined ? null : Number(body.latitude),
        longitude: body.longitude === undefined ? null : Number(body.longitude),
        traffic_volume: body.traffic_volume === undefined ? 4200 : Number(body.traffic_volume),
        average_speed: body.average_speed === undefined ? 52 : Number(body.average_speed),
        congestion_level: String(body.congestion_level || body.level || "medium").toLowerCase(),
        date,
        day_of_week: body.day_of_week || date.toLocaleDateString("en-US", { weekday: "long" }),
        time: body.time || "08:30",
        incident_count: body.incident_count === undefined ? 0 : Number(body.incident_count),
        roadwork_active: Boolean(body.roadwork_active),
        weather: body.weather || null,
        source: body.source || "admin_upload",
      },
    });
    await logAdmin(req.account.id, "upload_historical_traffic_data", { traffic_id: record.id });
    res.status(201).json({ message: "Traffic data saved", traffic_record: mapTraffic(record) });
  } catch (error) {
    next(error);
  }
}

export async function listTraffic(req, res, next) {
  try {
    const records = await prisma.historicalTrafficData.findMany({ orderBy: { updated_at: "desc" } });
    res.json({ traffic: records.map(mapTraffic) });
  } catch (error) {
    next(error);
  }
}

export async function importHistoricalData(req, res, next) {
  try {
    const summary = await importHistoricalDataRequest(req);
    await logAdmin(req.account.id, "import_historical_traffic_data", {
      filename: summary.filename,
      total_rows: summary.total_rows,
      inserted_rows: summary.inserted_rows,
      updated_rows: summary.updated_rows,
      skipped_duplicate_rows: summary.skipped_duplicate_rows,
      invalid_rows: summary.invalid_rows,
    });
    res.status(201).json({ message: "Historical traffic data import completed", summary });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
}

export function historicalDataImportTemplate(req, res) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"smarttraffic-historical-data-template.csv\"");
  res.send(historicalTemplateCsv());
}

export async function historicalDataCoverageStats(req, res, next) {
  try {
    res.json(await historicalDataStats());
  } catch (error) {
    next(error);
  }
}

function mapIncidentRecord(incident) {
  return {
    id: incident.id,
    record_kind: "incident",
    road: incident.road_name,
    road_name: incident.road_name,
    location: incident.road_name,
    type: incident.incident_type,
    incident_type: incident.incident_type,
    level: incident.severity,
    severity: incident.severity,
    speed: "",
    updated: incident.updated_at.toLocaleString(),
    source: incident.source,
    start_date: incident.start_date,
    end_date: incident.end_date,
    status: incident.status,
    description: incident.description,
  };
}

export async function updateTraffic(req, res, next) {
  try {
    const body = req.body || {};
    const record = await prisma.historicalTrafficData.update({
      where: { id: req.params.id },
      data: {
        road_name: body.road_name || body.road,
        suburb: body.suburb || body.location,
        latitude: body.latitude === undefined ? undefined : Number(body.latitude),
        longitude: body.longitude === undefined ? undefined : Number(body.longitude),
        traffic_volume: body.traffic_volume === undefined ? undefined : Number(body.traffic_volume),
        average_speed: body.average_speed === undefined ? undefined : Number(body.average_speed),
        congestion_level: body.congestion_level || body.level,
        date: body.date ? parseDate(body.date) : undefined,
        day_of_week: body.day_of_week,
        time: body.time,
        incident_count: body.incident_count === undefined ? undefined : Number(body.incident_count),
        roadwork_active: body.roadwork_active === undefined ? undefined : Boolean(body.roadwork_active),
        weather: body.weather,
        source: body.source,
      },
    });
    await logAdmin(req.account.id, "edit_traffic_data", { traffic_id: record.id });
    res.json({ traffic_record: mapTraffic(record) });
  } catch (error) {
    next(error);
  }
}

export async function deleteTraffic(req, res, next) {
  try {
    const incident = await prisma.incident.findUnique({ where: { id: req.params.id } });
    if (incident) {
      await prisma.incident.delete({ where: { id: req.params.id } });
      await logAdmin(req.account.id, "delete_traffic_data", { incident_id: req.params.id });
      return res.json({ message: "Incident record deleted" });
    }
    await prisma.historicalTrafficData.delete({ where: { id: req.params.id } });
    await logAdmin(req.account.id, "delete_traffic_data", { traffic_id: req.params.id });
    res.json({ message: "Traffic record deleted" });
  } catch (error) {
    next(error);
  }
}

export async function exportTraffic(req, res, next) {
  try {
    const records = await prisma.historicalTrafficData.findMany({ orderBy: { updated_at: "desc" } });
    res.json({ format: "json", traffic: records.map(mapTraffic) });
  } catch (error) {
    next(error);
  }
}

export async function createIncident(req, res, next) {
  try {
    const body = req.body || {};
    const incident = await prisma.incident.create({
      data: {
        incident_type: body.incident_type || body.type || "roadwork",
        external_id: body.external_id || null,
        road_name: body.road_name || body.road || "Queensland Road",
        description: body.description || body.details || "",
        latitude: body.latitude === undefined ? null : Number(body.latitude),
        longitude: body.longitude === undefined ? null : Number(body.longitude),
        severity: body.severity || "medium",
        start_date: parseDate(body.start_date),
        end_date: body.end_date ? parseDate(body.end_date) : null,
        status: body.status || "active",
        source: body.source || "admin_upload",
        raw_data: body.raw_data || undefined,
        uploaded_by_admin_id: req.account.id,
      },
    });
    res.status(201).json({ incident: mapIncident(incident) });
  } catch (error) {
    next(error);
  }
}

export async function listIncidents(req, res, next) {
  try {
    const incidents = await prisma.incident.findMany({ orderBy: { updated_at: "desc" } });
    res.json({ incidents: incidents.map(mapIncident) });
  } catch (error) {
    next(error);
  }
}

export async function updateIncident(req, res, next) {
  try {
    const body = req.body || {};
    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: {
        incident_type: body.incident_type || body.type,
        external_id: body.external_id,
        road_name: body.road_name || body.road,
        description: body.description || body.details,
        latitude: body.latitude === undefined ? undefined : Number(body.latitude),
        longitude: body.longitude === undefined ? undefined : Number(body.longitude),
        severity: body.severity,
        start_date: body.start_date ? parseDate(body.start_date) : undefined,
        end_date: body.end_date ? parseDate(body.end_date) : undefined,
        status: body.status,
        source: body.source,
        raw_data: body.raw_data,
      },
    });
    res.json({ incident: mapIncident(incident) });
  } catch (error) {
    next(error);
  }
}

export async function deleteIncident(req, res, next) {
  try {
    await prisma.incident.delete({ where: { id: req.params.id } });
    res.json({ message: "Incident deleted" });
  } catch (error) {
    next(error);
  }
}

export async function fetchLiveData(req, res, next) {
  try {
    const now = new Date();
    const sourceChoice = req.body?.source === "live" ? "live" : "mock";
    const result = await fetchQldTrafficGeoJson(sourceChoice);
    const features = Array.isArray(result.geojson.features) ? result.geojson.features : [];
    const created = [];

    for (const feature of features) {
      const { incident, traffic } = featureToRecords(feature, result.source);
      const externalId = incident.external_id || `${incident.incident_type}-${incident.road_name}-${incident.start_date.toISOString()}`;
      const existingIncident = await prisma.incident.findFirst({ where: { external_id: externalId } });
      const savedIncident = existingIncident
        ? await prisma.incident.update({ where: { id: existingIncident.id }, data: { ...incident, external_id: externalId, uploaded_by_admin_id: req.account.id } })
        : await prisma.incident.create({ data: { ...incident, external_id: externalId, uploaded_by_admin_id: req.account.id } });
      created.push(mapIncidentRecord(savedIncident));
    }

    const summary = {
      total_fetched: features.length,
      total_saved: created.length,
      source: result.source,
      mock_mode: result.mock_mode,
      fetched_at: now.toISOString(),
    };
    await logAdmin(req.account.id, "fetch_live_data", summary);
    res.json({ message: `${result.source} records fetched and saved`, ...summary, records: created.slice(0, 10) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
}

export async function liveDataStatus(req, res, next) {
  try {
    const lastFetch = await prisma.adminLog.findFirst({ where: { action: "fetch_live_data" }, orderBy: { created_at: "desc" } });
    const details = parseLogDetails(lastFetch?.details);
    res.json({
      configured_source: (process.env.QLDTRAFFIC_API_URL || process.env.QLD_TRAFFIC_API_URL) ? "QLDTraffic Live API" : "Development Traffic Source",
      last_fetch_time: lastFetch?.created_at?.toISOString() || null,
      last_records_fetched: details.total_fetched || 0,
      last_records_saved: details.total_saved || 0,
      mock_mode_active: isMockTrafficMode(),
      source: details.source || (isMockTrafficMode() ? "Development Traffic Source" : "QLDTraffic Live API"),
    });
  } catch (error) {
    next(error);
  }
}
