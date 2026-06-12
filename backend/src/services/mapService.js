const GEOAPIFY_AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete";
const GEOAPIFY_ROUTING_URL = "https://api.geoapify.com/v1/routing";
const REQUEST_TIMEOUT_MS = 8000;

function geoapifyKey() {
  return process.env.GEOAPIFY_API_KEY;
}

function requireGeoapifyKey() {
  const key = geoapifyKey();
  if (!key) {
    const error = new Error("Map address search is not configured. Please add the Geoapify API key.");
    error.status = 503;
    throw error;
  }
  return key;
}

export async function autocompleteAddress(text) {
  const trimmed = String(text || "").trim();
  if (trimmed.length < 3) return [];
  const apiKey = requireGeoapifyKey();
  const url = new URL(GEOAPIFY_AUTOCOMPLETE_URL);
  url.searchParams.set("text", trimmed);
  url.searchParams.set("limit", "8");
  url.searchParams.set("filter", "countrycode:au");
  url.searchParams.set("bias", "proximity:153.026,-27.4705");
  url.searchParams.set("format", "geojson");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    console.warn(`[maps] Geoapify autocomplete failed with ${response.status}`);
    const error = new Error("No matching address found. Try adding suburb and postcode.");
    error.status = 503;
    throw error;
  }

  const data = await response.json();
  return (data.features || []).map(mapGeoapifyFeature).filter(Boolean);
}

export async function buildGeoapifyRoute({ from, to, transport_mode = "drive" }) {
  const apiKey = requireGeoapifyKey();
  const fromLat = Number(from?.lat);
  const fromLng = Number(from?.lng);
  const toLat = Number(to?.lat);
  const toLng = Number(to?.lng);
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    const error = new Error("From and To coordinates are required.");
    error.status = 400;
    throw error;
  }

  const url = new URL(GEOAPIFY_ROUTING_URL);
  url.searchParams.set("waypoints", `${fromLat},${fromLng}|${toLat},${toLng}`);
  url.searchParams.set("mode", mapTransportMode(transport_mode));
  url.searchParams.set("details", "instruction_details");
  url.searchParams.set("format", "geojson");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    console.warn(`[maps] Geoapify routing failed with ${response.status}`);
    const error = new Error("We could not create a route for these locations. Please try another address.");
    error.status = 503;
    throw error;
  }

  const data = await response.json();
  const routes = (data.features || []).map(mapGeoapifyRoute).filter(Boolean);
  if (!routes.length) {
    const error = new Error("We could not create a route for these locations. Please try another address.");
    error.status = 404;
    throw error;
  }

  const primary = routes[0];
  return [
    primary,
    createVariation(primary, 1, 1.12, "Predicted route 2"),
    createVariation(primary, 2, 1.27, "Predicted route 3"),
  ];
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function mapGeoapifyFeature(feature) {
  const props = feature.properties || {};
  const [lng, lat] = feature.geometry?.coordinates || [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    formatted: props.formatted || props.address_line1 || props.name,
    address: props.formatted || props.address_line1 || props.name,
    display_name: props.formatted || props.address_line1 || props.name,
    place_id: props.place_id,
    lat,
    lng,
    suburb: props.suburb || props.city || props.town,
    city: props.city || props.town || props.suburb,
    state: props.state,
    postcode: props.postcode,
    source: "geoapify",
  };
}

function mapGeoapifyRoute(feature, index = 0) {
  const props = feature.properties || {};
  const geometry = flattenCoordinates(feature.geometry?.coordinates || []);
  if (geometry.length < 2) return null;
  const distance = Number(props.distance || 0);
  const duration = Number(props.time || 0);
  return {
    id: `route-${index + 1}`,
    name: props.name || `Predicted route ${index + 1}`,
    summary: props.name || "Geoapify route",
    geometry,
    distance_meters: Math.round(distance),
    distance_km: Number((distance / 1000).toFixed(1)),
    duration_seconds: Math.round(duration),
    estimated_time: formatDuration(duration),
    source: "geoapify",
  };
}

function flattenCoordinates(coordinates) {
  const line = Array.isArray(coordinates[0]?.[0]) ? coordinates.flat() : coordinates;
  return line.map(([lng, lat]) => [lat, lng]).filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
}

function createVariation(route, index, multiplier, name) {
  const duration = Math.round(route.duration_seconds * multiplier);
  const distance = Math.round(route.distance_meters * (1 + (multiplier - 1) / 3));
  return {
    ...route,
    id: `route-${index + 1}`,
    name,
    distance_meters: distance,
    distance_km: Number((distance / 1000).toFixed(1)),
    duration_seconds: duration,
    estimated_time: formatDuration(duration),
  };
}

function mapTransportMode(mode) {
  if (String(mode).toLowerCase().includes("walk")) return "walk";
  if (String(mode).toLowerCase().includes("bus")) return "drive";
  return "drive";
}

function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(Number(seconds || 0) / 60));
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}
