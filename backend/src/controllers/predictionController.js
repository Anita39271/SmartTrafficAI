import { prisma } from "../utils/prisma.js";
import { callAiPrediction, fallbackAiPrediction } from "../services/predictionService.js";

function parseTravelDate(value) {
  return new Date(`${value || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function mapHistory(item) {
  return {
    id: item.id,
    user_id: item.user_id,
    starting_address: item.source_location,
    destination_address: item.destination_location,
    start_lat: item.source_latitude,
    start_lng: item.source_longitude,
    destination_lat: item.destination_latitude,
    destination_lng: item.destination_longitude,
    travel_date: item.travel_date.toISOString().slice(0, 10),
    travel_time: item.travel_time,
    transport_mode: item.transport_mode,
    recommended_route: item.recommended_route,
    predicted_congestion: item.predicted_congestion,
    estimated_travel_time: item.estimated_travel_time,
    estimated_delay: item.estimated_delay,
    confidence_score: item.confidence_score,
    risk_reason: item.risk_reason,
    route_geometry: item.route_geometry,
    traffic_colour: item.route_colour || (item.recommended_route === "route-1" ? "green" : "yellow"),
    created_at: item.created_at.toISOString().slice(0, 10),
  };
}

export async function createPrediction(req, res, next) {
  try {
    const required = ["starting_address", "destination_address", "travel_date", "travel_time"];
    const missing = required.filter((field) => !req.body[field]);
    if (missing.length) return res.status(400).json({ message: `Missing required field: ${missing.join(", ")}` });

    const [allTrafficData, allIncidents] = await Promise.all([
      prisma.historicalTrafficData.findMany({ orderBy: { date: "desc" }, take: 250 }),
      prisma.incident.findMany({ where: { status: { in: ["active", "planned"] } }, orderBy: { updated_at: "desc" }, take: 25 }),
    ]);
    const trafficData = relevantRecords(allTrafficData, req.body).slice(0, 12);
    const incidents = relevantRecords(allIncidents, req.body).slice(0, 12);

    let prediction;
    try {
      prediction = await callAiPrediction(req.body, { trafficData, incidents });
    } catch {
      prediction = fallbackAiPrediction(req.body);
    }

    await prisma.routePrediction.create({
      data: {
        user_id: req.account.id,
        source_location: prediction.starting_address,
        destination_location: prediction.destination_address,
        source_latitude: req.body.start_lat === undefined ? null : Number(req.body.start_lat),
        source_longitude: req.body.start_lng === undefined ? null : Number(req.body.start_lng),
        destination_latitude: req.body.destination_lat === undefined ? null : Number(req.body.destination_lat),
        destination_longitude: req.body.destination_lng === undefined ? null : Number(req.body.destination_lng),
        travel_date: parseTravelDate(prediction.travel_date),
        travel_time: prediction.travel_time,
        transport_mode: prediction.transport_mode || req.body.transport_mode || "car",
        selected_route: req.body.selected_route || null,
        predicted_congestion: prediction.predicted_congestion,
        recommended_route: prediction.recommended_route,
        estimated_travel_time: req.body.estimated_time || prediction.routes?.[0]?.estimated_time || null,
        estimated_delay: prediction.estimated_delay,
        confidence_score: prediction.confidence_score,
        risk_reason: prediction.risk_reason,
        route_colour: prediction.route_colour || prediction.routes?.[0]?.colour || "green",
        route_geometry: req.body.route_geometry || undefined,
      },
    });
    res.status(201).json(prediction);
  } catch (error) {
    next(error);
  }
}

function relevantRecords(records, body) {
  const terms = `${body.starting_address || ""} ${body.destination_address || ""}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 4);
  const scored = records.map((record) => {
    const haystack = `${record.road_name || ""} ${record.location || ""} ${record.suburb || ""} ${record.description || ""}`.toLowerCase();
    const keywordScore = terms.filter((term) => haystack.includes(term)).length;
    const severityScore = record.severity === "severe" || record.congestion_level === "severe" ? 4 : record.severity === "high" || record.congestion_level === "high" ? 3 : record.severity === "medium" || record.congestion_level === "medium" ? 2 : 1;
    return { record, score: keywordScore * 10 + severityScore };
  });
  return scored.sort((a, b) => b.score - a.score).map((item) => item.record);
}

export async function getHistory(req, res, next) {
  try {
    const history = await prisma.routePrediction.findMany({
      where: { user_id: req.account.id },
      orderBy: { created_at: "desc" },
    });
    res.json({ history: history.map(mapHistory) });
  } catch (error) {
    next(error);
  }
}

export async function deleteHistory(req, res, next) {
  try {
    const item = await prisma.routePrediction.findFirst({ where: { id: req.params.id, user_id: req.account.id } });
    if (!item) return res.status(404).json({ message: "Prediction history item not found" });
    await prisma.routePrediction.delete({ where: { id: req.params.id } });
    res.json({ message: "Prediction history item deleted" });
  } catch (error) {
    next(error);
  }
}

export async function trafficContext(req, res, next) {
  try {
    const [incidents, lastFetch] = await Promise.all([
      prisma.incident.findMany({ where: { status: { in: ["active", "planned"] } }, orderBy: { updated_at: "desc" }, take: 8 }),
      prisma.adminLog.findFirst({ where: { action: "fetch_live_data" }, orderBy: { created_at: "desc" } }),
    ]);
    const details = (() => {
      try {
        return JSON.parse(lastFetch?.details || "{}");
      } catch {
        return {};
      }
    })();
    res.json({
      source: details.source || "Traffic Data Source",
      last_updated: lastFetch?.created_at?.toISOString() || incidents[0]?.updated_at?.toISOString() || null,
      active_incidents: incidents.map((incident) => ({
        id: incident.id,
        incident_type: incident.incident_type,
        road_name: incident.road_name,
        description: incident.description,
        severity: incident.severity,
        status: incident.status,
        source: incident.source,
      })),
    });
  } catch (error) {
    next(error);
  }
}
