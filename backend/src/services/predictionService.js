export function buildMockPrediction(request) {
  return {
    id: `prediction-${Date.now()}`,
    starting_address: request.starting_address,
    destination_address: request.destination_address,
    travel_date: request.travel_date,
    travel_time: request.travel_time,
    transport_mode: request.transport_mode || "car",
    use_current_location: Boolean(request.use_current_location),
    recommended_route: "route-1",
    predicted_congestion: "Low traffic",
    estimated_delay: "5 minutes",
    confidence_score: 82,
    route_colour: "green",
    risk_reason: "No major incidents found and lower expected congestion.",
    routes: [
      {
        id: "route-1",
        name: "Route 1",
        traffic_level: "Low",
        colour: "green",
        estimated_time: "28 minutes",
        delay: "5 minutes",
        risk_reason: "Clear traffic and lowest expected delay",
        confidence_score: 82,
      },
      {
        id: "route-2",
        name: "Route 2",
        traffic_level: "Moderate",
        colour: "yellow",
        estimated_time: "35 minutes",
        delay: "12 minutes",
        risk_reason: "Moderate congestion near Brisbane CBD",
        confidence_score: 74,
      },
      {
        id: "route-3",
        name: "Route 3",
        traffic_level: "Heavy",
        colour: "red",
        estimated_time: "48 minutes",
        delay: "25 minutes",
        risk_reason: "Heavy traffic and possible roadwork delay",
        confidence_score: 68,
      },
    ],
  };
}

const AI_DOWN_MESSAGE = "AI service is not connected. Showing rule-based prediction.";

function aiServiceUrl() {
  return process.env.AI_SERVICE_URL || "http://localhost:8000";
}

export function routeOptions() {
  return [
    { id: "route-1", name: "Route 1" },
    { id: "route-2", name: "Route 2" },
    { id: "route-3", name: "Route 3" },
  ];
}

export function normalizeAiPrediction(request, aiResult) {
  const routes = (aiResult.route_predictions || aiResult.routes || []).map((route, index) => ({
    id: route.id || `route-${index + 1}`,
    name: route.route_name || route.name || `Route ${index + 1}`,
    traffic_level: route.traffic_level || route.trafficLevel || "Moderate traffic",
    colour: route.colour || route.color || "yellow",
    estimated_time: route.estimated_time || route.estimatedTime || "35 minutes",
    delay: route.estimated_delay || route.delay || "12 minutes",
    risk_reason: route.risk_reason || route.reason || "Moderate congestion expected.",
    confidence_score: route.confidence_score || route.confidence || 74,
  }));

  return {
    id: `prediction-${Date.now()}`,
    starting_address: request.starting_address,
    destination_address: request.destination_address,
    travel_date: request.travel_date,
    travel_time: request.travel_time,
    transport_mode: request.transport_mode || "car",
    use_current_location: Boolean(request.use_current_location),
    recommended_route: aiResult.recommended_route || routes[0]?.id || "route-1",
    predicted_congestion: aiResult.predicted_congestion || routes[0]?.traffic_level || "Moderate traffic",
    estimated_delay: aiResult.estimated_delay || routes[0]?.delay || "12 minutes",
    confidence_score: aiResult.confidence_score || routes[0]?.confidence_score || 74,
    risk_reason: aiResult.risk_reason || routes[0]?.risk_reason || "AI service returned a prediction.",
    route_colour: aiResult.route_colour || routes[0]?.colour || "yellow",
    routes: routes.length ? routes : buildMockPrediction(request).routes,
    message: aiResult.message || null,
  };
}

export async function callAiPrediction(request, context) {
  const response = await fetch(`${aiServiceUrl()}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      starting_address: request.starting_address,
      destination_address: request.destination_address,
      travel_date: request.travel_date,
      travel_time: request.travel_time,
      transport_mode: request.transport_mode || "car",
      route_options: routeOptions(),
      route_geometry: request.route_geometry,
      distance: request.distance,
      estimated_time: request.estimated_time,
      start_lat: request.start_lat,
      start_lng: request.start_lng,
      destination_lat: request.destination_lat,
      destination_lng: request.destination_lng,
      incidents: context.incidents,
      historical_traffic_data: context.trafficData,
      traffic_data: context.trafficData,
    }),
  });
  if (!response.ok) throw new Error(`AI service returned ${response.status}`);
  return normalizeAiPrediction(request, await response.json());
}

export function fallbackAiPrediction(request) {
  return { ...buildMockPrediction(request), message: AI_DOWN_MESSAGE };
}

export async function callAiTrain(trainingPayload = {}) {
  const response = await fetch(`${aiServiceUrl()}/model/train`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(trainingPayload),
  });
  if (!response.ok) throw new Error(`AI train returned ${response.status}`);
  return response.json();
}

export async function callAiStatus() {
  const response = await fetch(`${aiServiceUrl()}/model/status`);
  if (!response.ok) throw new Error(`AI status returned ${response.status}`);
  return response.json();
}
