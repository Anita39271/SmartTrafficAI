const MOCK_SOURCE = "Development Traffic Source";
const LIVE_SOURCE = "QLDTraffic Live API";

const mockFeatures = [
  eventFeature("roadwork", "Brisbane CBD", "Brisbane CBD roadwork affecting inner-city lanes", 153.026, -27.4705, "medium", "planned"),
  eventFeature("congestion", "M1 Pacific Motorway", "Southbound congestion near Springwood", 153.13, -27.61, "high", "active"),
  eventFeature("crash", "Ipswich Road", "Crash reported near Annerley with lane delays", 153.032, -27.512, "severe", "active"),
  eventFeature("roadwork", "Gympie Road", "Roadworks near Chermside causing slower traffic", 153.032, -27.386, "medium", "active"),
  eventFeature("hazard", "Logan Road", "Debris hazard near Mount Gravatt", 153.079, -27.537, "low", "active"),
  eventFeature("event", "Brisbane Airport", "Special event traffic near Airport Drive", 153.121, -27.394, "medium", "planned"),
  eventFeature("congestion", "Gold Coast Highway", "Congestion building near Southport", 153.414, -27.967, "high", "active"),
];

function eventFeature(type, roadName, description, longitude, latitude, severity, status) {
  const now = new Date();
  const end = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {
      incident_type: type,
      event_type: type,
      road_name: roadName,
      description,
      severity,
      status,
      start_date: now.toISOString(),
      end_date: end.toISOString(),
      source: MOCK_SOURCE,
      average_speed: type === "congestion" ? 32 : type === "crash" ? 24 : 48,
      traffic_volume: type === "congestion" || type === "crash" ? 8200 : 5200,
      congestion_level: type === "crash" ? "Severe" : type === "congestion" ? "Heavy" : type === "roadwork" ? "Moderate" : "Low",
    },
  };
}

export function isMockTrafficMode() {
  return String(process.env.USE_MOCK_TRAFFIC_API ?? "true").toLowerCase() !== "false";
}

export async function fetchQldTrafficGeoJson(sourceChoice = "mock") {
  const useMock = sourceChoice === "mock" || isMockTrafficMode();
  if (useMock) {
    return {
      source: MOCK_SOURCE,
      mock_mode: true,
      geojson: { type: "FeatureCollection", features: mockFeatures },
    };
  }

  const url = process.env.QLDTRAFFIC_API_URL || process.env.QLD_TRAFFIC_API_URL;
  if (!url) {
    const error = new Error("Live traffic source is unavailable. Please try again later or use the development traffic source.");
    error.status = 503;
    throw error;
  }

  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error("Live traffic source is unavailable. Please try again later or use the development traffic source.");
    error.status = 503;
    throw error;
  }

  return { source: LIVE_SOURCE, mock_mode: false, geojson: await response.json() };
}

export function featureToRecords(feature, source) {
  const props = feature.properties || {};
  const [longitude, latitude] = feature.geometry?.coordinates || [null, null];
  const type = normalizeIncidentType(props.incident_type || props.event_type || props.type);
  const roadName = props.road_name || props.roadName || props.road || "Queensland Road";
  const severity = normalizeSeverity(props.severity);
  const now = new Date();

  const incident = {
    external_id: props.id || props.event_id || props.incident_id || `${type}-${roadName}-${props.start_date || now.toISOString()}`,
    incident_type: type,
    road_name: roadName,
    description: props.description || props.title || `${type} on ${roadName}`,
    latitude: latitude === null ? null : Number(latitude),
    longitude: longitude === null ? null : Number(longitude),
    severity,
    start_date: props.start_date ? new Date(props.start_date) : now,
    end_date: props.end_date ? new Date(props.end_date) : null,
    status: props.status || "active",
    source,
    raw_data: feature,
  };

  const traffic = {
    road_name: roadName,
    location: props.location || roadName,
    latitude: latitude === null ? null : Number(latitude),
    longitude: longitude === null ? null : Number(longitude),
    traffic_volume: props.traffic_volume === undefined ? trafficVolumeFor(type) : Number(props.traffic_volume),
    average_speed: props.average_speed === undefined ? averageSpeedFor(type) : Number(props.average_speed),
    congestion_level: props.congestion_level || congestionFor(type, severity),
    date: now,
    time: now.toTimeString().slice(0, 5),
    source,
  };

  return { incident, traffic };
}

function normalizeIncidentType(value = "hazard") {
  const type = String(value).toLowerCase().replace("roadworks", "roadwork").replace("special_event", "event").replace("closure", "hazard");
  return ["crash", "roadwork", "congestion", "flooding", "event", "hazard"].includes(type) ? type : "hazard";
}

function normalizeSeverity(value = "medium") {
  const severity = String(value).toLowerCase();
  return ["low", "medium", "high", "severe"].includes(severity) ? severity : "medium";
}

function averageSpeedFor(type) {
  return type === "crash" ? 24 : type === "congestion" ? 32 : type === "roadwork" ? 44 : 55;
}

function trafficVolumeFor(type) {
  return type === "crash" || type === "congestion" ? 8200 : type === "event" ? 6500 : 4800;
}

function congestionFor(type, severity) {
  if (severity === "severe" || type === "crash") return "Severe";
  if (severity === "high" || type === "congestion") return "Heavy";
  if (type === "roadwork" || type === "event") return "Moderate";
  return "Low";
}
