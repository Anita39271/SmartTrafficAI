import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bike, Bus, Car, Circle, Footprints, Heart, Loader2, MapPin, Navigation, Save, Search, ShieldAlert, Train, Trash2, X } from "lucide-react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import PageHeader from "../components/PageHeader.jsx";
import { AlertBox, EmptyBox, LoadingBox } from "../components/StateBox.jsx";
import { incidents, recentSearches, routePredictions, savedRoutes } from "../data/mockData.js";
import { useMockAsync } from "../hooks/useMockAsync.js";
import { useAuth } from "../context/AuthContext.jsx";
import api, { getApiError } from "../services/api.js";

const geoapifyApiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function UserDashboard() {
  const loading = useMockAsync();
  const { user } = useAuth();
  const [apiMessage, setApiMessage] = useState("");
  const [history, setHistory] = useState(recentSearches);
  const [routes, setRoutes] = useState(savedRoutes);

  useEffect(() => {
    async function loadSummary() {
      try {
        const [historyResponse, savedResponse] = await Promise.all([
          api.get("/predictions/history"),
          api.get("/saved-routes"),
        ]);
        setHistory(historyResponse.data.history.map(mapApiHistoryItem));
        setRoutes(savedResponse.data.saved_routes.map(mapApiSavedRoute));
      } catch (error) {
        setApiMessage(getApiError(error));
      }
    }
    loadSummary();
  }, []);

  if (loading) return <LoadingBox />;
  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.full_name || user?.name || "Driver"}`}
        description="SmartTraffic AI helps you compare future Queensland route conditions with AI predictions, route risk, expected delay, and confidence scores."
        action={<Link to="/map" className="btn-primary"><Navigation size={18} /> Start New AI Prediction</Link>}
      />
      {apiMessage && <div className="mb-5"><AlertBox type="error" text={apiMessage} /></div>}
      <div className="panel mb-6 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black">AI traffic prediction summary</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Use the Map / Route Prediction page as the main workspace for entering full addresses, choosing a future travel date and time, and reviewing colour-coded AI route recommendations.
            </p>
          </div>
          <Link to="/map" className="btn-secondary shrink-0"><MapPin size={18} /> Open prediction map</Link>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-4 text-lg font-black">Recent prediction history</h2>
          <div className="grid gap-3">
            {history.map((item) => <RouteRow key={item.id} item={item} />)}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="mb-4 text-lg font-black">Saved routes</h2>
          <div className="grid gap-3">
            {routes.map((route) => (
              <div key={route.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                <p className="font-bold">{route.name}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{route.from} to {route.to} - best around {route.bestTime}</p>
                <Link className="btn-secondary mt-3 py-2" to={`/map?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`}>Start Trip</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function RouteRow({ item }) {
  const color = item.color === "green" ? "text-emerald-600" : item.color === "yellow" ? "text-amber-500" : "text-orange-500";
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
      <div>
        <p className="font-bold">{item.from} to {item.to}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{item.date} at {item.time} - {item.route}</p>
      </div>
      <span className={`badge bg-white dark:bg-white/10 ${color}`}><Circle className="fill-current" size={10} /> {item.result}</span>
    </div>
  );
}

function mapApiHistoryItem(item) {
  return {
    id: item.id,
    from: item.starting_address,
    to: item.destination_address,
    date: item.travel_date,
    time: item.travel_time,
    result: item.predicted_congestion,
    route: item.recommended_route,
    color: item.traffic_colour || "green",
    searched: item.created_at,
  };
}

function mapApiSavedRoute(item) {
  return {
    id: item.id,
    name: item.name,
    from: item.from,
    to: item.to,
    bestTime: item.best_time,
    travelDate: item.travel_date,
    travelTime: item.travel_time,
    routeGeometry: item.route_geometry,
    distanceKm: item.distance_km,
    estimatedDuration: item.estimated_duration,
  };
}

export function MapPrediction() {
  const [searchParams] = useSearchParams();
  const [manual, setManual] = useState(true);
  const [predicted, setPredicted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [trafficContext, setTrafficContext] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [realRoutes, setRealRoutes] = useState([]);
  const [startLocation, setStartLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [liveTripStarted, setLiveTripStarted] = useState(false);
  const [liveTripVisible, setLiveTripVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [liveStatus, setLiveStatus] = useState("");
  const watchIdRef = useRef(null);
  const [form, setForm] = useState({
    starting_address: "Unit 2, 15 Queen Street, Brisbane City QLD 4000",
    destination_address: "Gold Coast University Hospital, Southport QLD 4215",
    travel_date: "2026-06-14",
    travel_time: "08:30",
    transport_mode: "car",
  });
  const recommended = routePredictions.find((route) => route.recommended) || routePredictions[0];
  const routeCards = getRouteCards(predictionResult, realRoutes);
  const selectedRouteMap = selectedRoute ? getMapRouteForCard(selectedRoute) : null;
  const activeMapRoutes = realRoutes;

  useEffect(() => {
    loadTrafficContext();
  }, []);

  useEffect(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to) return;
    const nextForm = { ...form, starting_address: from, destination_address: to };
    setForm(nextForm);
    generatePrediction(nextForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTrafficContext() {
    try {
      const { data } = await api.get("/predictions/traffic-context");
      setTrafficContext(data);
    } catch {
      setTrafficContext(null);
    }
  }

  async function resolveAddress(address, selected) {
    if (selected?.display_name && selected?.lat && selected?.lng && selected.display_name === address) return selected;
    if (selected?.lat && selected?.lng) return selected;
    try {
      const { data } = await api.get("/maps/autocomplete", { params: { text: address } });
      if (data.suggestions?.[0]) return data.suggestions[0];
      return null;
    } catch {
      throw new Error("We could not find that address. Please check the spelling or include suburb and postcode.");
    }
  }

  function getBrowserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Current location is not available in this browser. Please enter a starting address."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          display_name: "Current location",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
        () => reject(new Error("Location permission denied. Please enter a starting address or allow location access.")),
        { enableHighAccuracy: true, timeout: 7000 }
      );
    });
  }

  useEffect(() => () => stopWatchingLocation(), []);

  async function generatePrediction(overrideForm = form) {
    setMessage("");
    setError("");
    if (!geoapifyApiKey) {
      setError("Map address search is not configured. Please add the Geoapify API key.");
      return;
    }
    setSelectedRoute(null);
    setLiveTripStarted(false);
    setLiveTripVisible(false);
    setCurrentLocation(null);
    setLiveStatus("");
    setIsGenerating(true);
    try {
      const start = manual ? await resolveAddress(overrideForm.starting_address, startLocation) : await getBrowserLocation();
      const destination = await resolveAddress(overrideForm.destination_address, destinationLocation);
      if (!start || !destination) {
        setError("We could not find that address. Please check the spelling or include suburb and postcode.");
        return;
      }

      const routeResponse = await api.post("/maps/route", {
        from: { address: overrideForm.starting_address, lat: start.lat, lng: start.lng },
        to: { address: overrideForm.destination_address, lat: destination.lat, lng: destination.lng },
        transport_mode: overrideForm.transport_mode,
      });
      const routes = routeResponse.data.routes || [];
      if (!routes.length) {
        setError("We could not create a route for these locations. Please try another address.");
        return;
      }
      setStartLocation(start);
      setDestinationLocation(destination);
      setRealRoutes(routes);

      const primaryRoute = routes[0];
      const predictionPayload = {
        ...overrideForm,
        use_current_location: !manual,
        start_lat: start.lat,
        start_lng: start.lng,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        route_geometry: primaryRoute.geometry,
        distance: primaryRoute.distance_km,
        estimated_time: primaryRoute.estimated_time,
      };
      const { data } = await api.post("/predictions", predictionPayload);
      setPredictionResult({ ...data, map_routes: routes });
      setPredicted(true);
      loadTrafficContext();
      setMessage("AI prediction generated. Choose one route to continue to live trip mode.");
    } catch (apiError) {
      setPredictionResult(null);
      setPredicted(true);
      setError(apiError.response ? getApiError(apiError) : apiError.message || "We could not create a route for these locations. Please try another address.");
    } finally {
      setIsGenerating(false);
    }
  }

  function chooseRoute(route) {
    setSelectedRoute(route);
    setCurrentLocation(null);
    setLiveTripStarted(false);
    setLiveTripVisible(false);
    setLiveStatus(`You selected ${route.name}. Trip options are ready.`);
    setMessage(`You selected ${route.name}. Review trip options to start now or save for later.`);
  }

  async function saveForLater() {
    if (!selectedRoute) return;
    setError("");
    setMessage("");
    try {
      await api.post("/saved-routes", {
        name: selectedRoute.name,
        from: form.starting_address,
        to: form.destination_address,
        from_lat: startLocation?.lat,
        from_lng: startLocation?.lng,
        to_lat: destinationLocation?.lat,
        to_lng: destinationLocation?.lng,
        travel_date: form.travel_date,
        travel_time: form.travel_time,
        route_geometry: selectedRoute.geometry,
        distance_km: Number.parseFloat(selectedRoute.distance),
        estimated_duration: selectedRoute.time,
        ai_prediction_result: predictionResult,
      });
      setMessage("Your trip has been saved. You can start it later from Saved Routes or History.");
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  function startLiveTrip() {
    if (!selectedRoute) return;
    stopWatchingLocation();
    setLiveTripVisible(true);

    if (!navigator.geolocation) {
      setLiveTripStarted(false);
      setLiveStatus("Location permission was not allowed. You can still preview the selected route, but live tracking is not active.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLiveTripStarted(true);
        setLiveStatus("Trip tracking started. Current location updated.");
      },
      () => {
        setLiveTripStarted(false);
        setLiveStatus("Location permission was not allowed. You can still preview the selected route, but live tracking is not active.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }

  function stopTrip() {
    stopWatchingLocation();
    setLiveTripStarted(false);
    setLiveStatus("Trip stopped. Live tracking is paused.");
  }

  function stopWatchingLocation() {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  return (
    <>
      <PageHeader title="Map / Route Prediction" description="Enter future trip details and compare colour-coded AI route predictions on OpenStreetMap." />
      {!geoapifyApiKey && <div className="mb-5"><AlertBox type="error" text="Map address search is not configured. Please add the Geoapify API key." /></div>}
      {message && <div className="mb-5"><AlertBox text={message} /></div>}
      {error && <div className="mb-5"><AlertBox type="error" text={error} /></div>}
      <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
        <div className="panel p-5">
          <h2 className="mb-4 text-lg font-black">AI prediction form</h2>
          <div className="grid gap-4">
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input type="checkbox" checked={!manual} onChange={() => setManual(!manual)} />
              Use current location
            </label>
            {manual && (
              <AddressField
                label="From / Starting Address"
                value={form.starting_address}
                onChange={(value) => setForm({ ...form, starting_address: value })}
                onSelect={setStartLocation}
                onClear={() => setStartLocation(null)}
                onApproximate={() => setMessage("Using approximate location. Please refine the address for better route accuracy.")}
                placeholder="Enter unit, street, suburb, state or postcode"
              />
            )}
            <AddressField
              label="To / Destination Address"
              value={form.destination_address}
              onChange={(value) => setForm({ ...form, destination_address: value })}
              onSelect={setDestinationLocation}
              onClear={() => setDestinationLocation(null)}
              onApproximate={() => setMessage("Using approximate location. Please refine the address for better route accuracy.")}
              placeholder="Enter destination address, suburb or place name"
            />
            <label className="grid gap-2 text-sm font-semibold">
              Travel Date
              <input className="input" type="date" value={form.travel_date} onChange={(event) => setForm({ ...form, travel_date: event.target.value })} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Travel Time
              <input className="input" type="time" value={form.travel_time} onChange={(event) => setForm({ ...form, travel_time: event.target.value })} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Transport Mode
              <div className="flex items-center gap-3"><TransportModeIcon mode={form.transport_mode} className="text-teal-600" /><select className="input" value={form.transport_mode} onChange={(event) => setForm({ ...form, transport_mode: event.target.value })}><option value="car">Car</option><option value="bus">Bus</option><option value="train">Train</option><option value="walking">Walking</option><option value="cycling">Cycling</option></select></div>
            </label>
            <button className="btn-primary" type="button" onClick={() => generatePrediction()} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Navigation size={18} />} {isGenerating ? "Generating..." : "Traffic Prediction"}
            </button>
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 dark:bg-white/5">
            <p className="font-black">Route colour guide</p>
            <div className="mt-3 grid gap-2 text-slate-600 dark:text-slate-300">
              <p><span className="text-emerald-600">Green</span>: Clear traffic / best route</p>
              <p><span className="text-amber-500">Yellow</span>: Moderate traffic</p>
              <p><span className="text-orange-500">Orange</span>: Slow traffic</p>
              <p><span className="text-red-600">Red</span>: Heavy traffic</p>
              <p><span className="text-red-900 dark:text-red-300">Dark red</span>: Accident, road closure, or serious congestion</p>
            </div>
          </div>
          <TrafficContextPanel context={trafficContext} />
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 dark:border-white/10 dark:bg-white/5">
            <p className="font-black">How this prediction works</p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              SmartTraffic AI analyses the selected route, travel date and time, stored traffic records, active incidents, roadworks and congestion data to estimate route conditions. Predictions may vary depending on live traffic changes.
            </p>
          </div>
        </div>
        <div className="grid gap-6">
          <div className="h-[520px] overflow-hidden rounded-3xl border border-slate-200 shadow-soft dark:border-white/10">
            <LeafletRouteMap
              routes={activeMapRoutes}
              selectedRoute={selectedRoute}
              startLocation={startLocation}
              destinationLocation={destinationLocation}
              currentLocation={currentLocation}
              transportMode={form.transport_mode}
              activeTrip={liveTripStarted}
            />
          </div>
          {predicted && (
            <>
              <div className="panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">AI prediction result</p>
                    <h2 className="mt-1 text-2xl font-black">Recommended route: {predictionResult?.recommended_route || recommended.name}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{predictionResult?.risk_reason || recommended.reason}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5"><strong>{predictionResult?.routes?.[0]?.estimated_time || recommended.time}</strong><br />Time</div>
                    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5"><strong>{predictionResult?.estimated_delay || recommended.delay}</strong><br />Delay</div>
                    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5"><strong>{predictionResult?.confidence_score || recommended.confidence}%</strong><br />Confidence</div>
                  </div>
                </div>
              </div>
              <PredictionCards routes={routeCards} selectedRoute={selectedRoute} onChooseRoute={chooseRoute} transportMode={form.transport_mode} />
              {selectedRoute && (
                <TripOptionsPanel selectedRoute={selectedRoute} form={form} onStart={startLiveTrip} onSave={saveForLater} />
              )}
              {selectedRoute && liveTripVisible && (
                <LiveTripPanel selectedRoute={selectedRoute} selectedRouteMap={selectedRouteMap} currentLocation={currentLocation} liveTripStarted={liveTripStarted} liveStatus={liveStatus} transportMode={form.transport_mode} onStop={stopTrip} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function TrafficContextPanel({ context }) {
  const incidents = context?.active_incidents || [];
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 dark:border-white/10 dark:bg-white/5">
      <p className="font-black">Current traffic context</p>
      <p className="mt-1 text-slate-500 dark:text-slate-400">Traffic data source: {context?.source === "QLDTraffic Live API" ? "QLDTraffic" : "Queensland traffic records"}</p>
      <p className="text-slate-500 dark:text-slate-400">Last updated: {context?.last_updated ? new Date(context.last_updated).toLocaleString() : "No live fetch yet"}</p>
      <div className="mt-3 grid gap-2">
        {incidents.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">No active incidents loaded yet. Admins can fetch the latest traffic data.</p>
        ) : incidents.slice(0, 4).map((incident) => (
          <div key={incident.id} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
            <p className="font-semibold">{incident.incident_type} - {incident.road_name}</p>
            <p className="text-slate-500 dark:text-slate-400">{incident.description}</p>
            <p className="text-slate-500 dark:text-slate-400">Severity: {incident.severity} - Status: {incident.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddressField({ label, value, onChange, onSelect, onClear, placeholder }) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    const text = value.trim();
    setFieldError("");
    if (!focused || text.length < 3) {
      setSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/maps/autocomplete", { params: { text } });
        setSuggestions(data.suggestions || []);
        if ((data.suggestions || []).length === 0) setFieldError("No matching address found. Try adding suburb and postcode.");
      } catch (apiError) {
        setSuggestions([]);
        setFieldError(getApiError(apiError));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [focused, value]);

  return (
    <label className="relative grid gap-2 text-sm font-semibold">
      {label}
      <input
        className="input pl-10 pr-10"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          onClear();
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      <Search className="absolute bottom-3.5 left-3 text-slate-400" size={18} />
      {value && (
        <button
          type="button"
          className="absolute bottom-2.5 right-2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
          onClick={() => {
            onChange("");
            onClear();
          }}
          aria-label={`Clear ${label}`}
        >
          <X size={16} />
        </button>
      )}
      {focused && value && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-white/10 dark:bg-[#171b24]">
          {loading && <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-300">Searching address...</p>}
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.place_id || suggestion.formatted}-${suggestion.lat}-${suggestion.lng}`}
              type="button"
              className="block w-full px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-teal-50 hover:text-teal-700 dark:text-slate-200 dark:hover:bg-teal-400/10 dark:hover:text-teal-200"
              onMouseDown={() => {
                onChange(suggestion.formatted || suggestion.address || suggestion.display_name);
                onSelect({
                  ...suggestion,
                  display_name: suggestion.formatted || suggestion.address || suggestion.display_name,
                  formatted_address: suggestion.formatted || suggestion.address || suggestion.display_name,
                });
              }}
            >
              {suggestion.formatted || suggestion.address || suggestion.display_name}
            </button>
          ))}
          {!loading && fieldError && <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-300">{fieldError}</p>}
        </div>
      )}
    </label>
  );
}

function LeafletRouteMap({ routes = [], selectedRoute, startLocation, destinationLocation, currentLocation, transportMode = "car", activeTrip = false }) {
  return (
    <MapContainer center={[-27.4705, 153.026]} zoom={10} scrollWheelZoom>
      <MapBounds routes={routes} startLocation={startLocation} destinationLocation={destinationLocation} currentLocation={currentLocation} />
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {startLocation && <Marker position={[startLocation.lat, startLocation.lng]} icon={markerIcon}><Popup>Starting address: {startLocation.display_name}</Popup></Marker>}
      {destinationLocation && <Marker position={[destinationLocation.lat, destinationLocation.lng]} icon={markerIcon}><Popup>Destination: {destinationLocation.display_name}</Popup></Marker>}
      {currentLocation && (
        <CircleMarker center={[currentLocation.lat, currentLocation.lng]} radius={9} pathOptions={{ color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 1 }}>
          <Popup>Current location</Popup>
        </CircleMarker>
      )}
      {activeTrip && (currentLocation || startLocation) && (
        <Marker position={[currentLocation?.lat || startLocation.lat, currentLocation?.lng || startLocation.lng]} icon={vehicleMarkerIcon(transportMode)}>
          <Popup>{transportLabel(transportMode)} trip position</Popup>
        </Marker>
      )}
      {routes.map((route) => {
        const isSelected = selectedRoute?.id === route.id;
        return (
          <Polyline
            key={route.id}
            positions={route.geometry || route.points || []}
            pathOptions={{ color: route.color || routeColour(route.id), weight: isSelected ? 8 : 5, opacity: selectedRoute ? (isSelected ? 1 : 0.28) : 0.9 }}
          />
        );
      })}
      {incidents.map((incident) => (
        <CircleMarker key={incident.id} center={incident.position} radius={9} pathOptions={{ color: incident.color, fillColor: incident.color, fillOpacity: 0.85 }}>
          <Popup>{incident.title}: {incident.location}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}


function TransportModeIcon({ mode, size = 18, className = "" }) {
  const Icon = transportIconComponent(mode);
  return <Icon size={size} className={className} aria-hidden="true" />;
}

function transportIconComponent(mode = "") {
  const value = String(mode).toLowerCase();
  if (value.includes("bus")) return Bus;
  if (value.includes("train")) return Train;
  if (value.includes("walk")) return Footprints;
  if (value.includes("cycl") || value.includes("bike")) return Bike;
  return Car;
}

function transportLabel(mode = "") {
  const value = String(mode).toLowerCase();
  if (value.includes("bus")) return "Bus";
  if (value.includes("train")) return "Train";
  if (value.includes("walk")) return "Walking";
  if (value.includes("cycl") || value.includes("bike")) return "Cycling";
  return "Car";
}

function vehicleMarkerIcon(mode) {
  const label = transportLabel(mode).slice(0, 1);
  return L.divIcon({
    className: "smarttraffic-vehicle-marker",
    html: `<div style="width:34px;height:34px;border-radius:999px;background:#fff;border:3px solid #0d9488;box-shadow:0 4px 16px rgba(15,23,42,.28);display:flex;align-items:center;justify-content:center;color:#0f766e;font-weight:900;font-size:14px;">${label}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}
function MapBounds({ routes, startLocation, destinationLocation, currentLocation }) {
  const map = useMap();
  useEffect(() => {
    const points = [
      ...(routes || []).flatMap((route) => route.geometry || route.points || []),
      ...(startLocation ? [[startLocation.lat, startLocation.lng]] : []),
      ...(destinationLocation ? [[destinationLocation.lat, destinationLocation.lng]] : []),
      ...(currentLocation ? [[currentLocation.lat, currentLocation.lng]] : []),
    ].filter(Boolean);
    if (points.length < 2) return;
    map.fitBounds(points, { padding: [38, 38], maxZoom: 14 });
  }, [currentLocation, destinationLocation, map, routes, startLocation]);
  return null;
}

function PredictionCards({ routes = getRouteCards(null), selectedRoute = null, onChooseRoute = null, transportMode = "car" } = {}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {routes.map((route) => {
        const isSelected = selectedRoute?.id === route.id;
        return (
        <div key={route.id} className={`panel p-5 transition ${isSelected ? "ring-4 ring-teal-500 shadow-xl shadow-teal-600/15" : route.recommended ? "ring-2 ring-teal-500" : ""}`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-black"><TransportModeIcon mode={transportMode} size={16} /> {route.name}</h3>
            <span className="h-4 w-4 rounded-full" style={{ background: route.color }} />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{route.level}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Colour status: <span style={{ color: route.color }}>{routeStatus(route.color)}</span></p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <p><strong>{route.time}</strong><br />estimated time</p>
            <p><strong>{route.delay}</strong><br />estimated delay</p>
            <p><strong>{route.distance}</strong><br />distance</p>
            <p><strong>{route.confidence}%</strong><br />confidence score</p>
            <p><strong>{route.recommended ? "Yes" : "No"}</strong><br />recommended</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{route.reason}</p>
          {onChooseRoute && (
            <button type="button" className={isSelected ? "btn-primary mt-5 w-full" : "btn-secondary mt-5 w-full"} onClick={() => onChooseRoute(route)}>
              {isSelected ? "Selected route" : "Choose this route"}
            </button>
          )}
        </div>
        );
      })}
    </div>
  );
}

function TripOptionsPanel({ selectedRoute, form, onStart, onSave }) {
  return (
    <div className="panel p-6 ring-2 ring-teal-500/70">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Trip Options</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-black"><TransportModeIcon mode={form.transport_mode} /> {selectedRoute.name}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedRoute.reason}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" className="btn-primary shrink-0" onClick={onStart}><Navigation size={18} /> Start Trip</button>
          <button type="button" className="btn-secondary shrink-0" onClick={onSave}>Save for Later</button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{form.starting_address}</strong><br />From address</div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{form.destination_address}</strong><br />To address</div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{form.travel_date}</strong><br />Travel date</div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{form.travel_time}</strong><br />Travel time</div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong className="inline-flex items-center gap-2"><TransportModeIcon mode={form.transport_mode} size={16} /> {selectedRoute.time}</strong><br />Estimated travel time</div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{selectedRoute.level}</strong><br />Traffic condition</div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{selectedRoute.delay}</strong><br />Estimated delay</div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{selectedRoute.distance}</strong><br />Distance</div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{selectedRoute.confidence}%</strong><br />Confidence score</div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{selectedRoute.recommended ? "Recommended" : "Available"}</strong><br />Recommended status</div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
          <span className="inline-flex h-3 w-3 rounded-full" style={{ background: selectedRoute.color }} /> <strong>{routeStatus(selectedRoute.color)}</strong><br />Colour status
        </div>
      </div>
    </div>
  );
}

function LiveTripPanel({ selectedRoute, selectedRouteMap, currentLocation, liveTripStarted, liveStatus, transportMode, onStop }) {
  return (
    <div className="panel overflow-hidden">
      <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-[420px]">
          <LeafletRouteMap
            routes={[{ ...selectedRoute, geometry: selectedRouteMap.points }]}
            selectedRoute={selectedRoute}
            startLocation={{ lat: selectedRouteMap.points[0][0], lng: selectedRouteMap.points[0][1] }}
            destinationLocation={{ lat: selectedRouteMap.points[selectedRouteMap.points.length - 1][0], lng: selectedRouteMap.points[selectedRouteMap.points.length - 1][1] }}
            currentLocation={currentLocation}
            transportMode={transportMode || "car"}
            activeTrip={liveTripStarted}
          />
        </div>
        <div className="p-6">
          <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Live Trip Map</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-black"><TransportModeIcon mode={transportMode || "car"} /> {selectedRoute.name}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {liveStatus || `You selected ${selectedRoute.name}. Live navigation is ready.`}
          </p>
          <div className="mt-5 grid gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
              Tracking: <strong>{liveTripStarted ? "Live tracking active" : "Route preview active"}</strong>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
              Estimated remaining time: <strong>{selectedRoute.time}</strong>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
              Status: <strong>{currentLocation ? "Current location updated" : "Waiting for location permission"}</strong>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-secondary" onClick={onStop}>Stop Trip</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getRouteCards(predictionResult, mapRoutes = []) {
  if (predictionResult?.routes?.length) {
    return predictionResult.routes.map((route, index) => ({
      id: route.id || `route-${index + 1}`,
      name: mapRoutes[index]?.name || route.name,
      level: route.traffic_level,
      color: colourToHex(route.colour),
      time: mapRoutes[index]?.estimated_time || route.estimated_time,
      delay: route.delay,
      reason: route.risk_reason,
      confidence: route.confidence_score,
      distance: mapRoutes[index]?.distance_km ? `${mapRoutes[index].distance_km} km` : "Not available",
      geometry: mapRoutes[index]?.geometry || mapRoutes[0]?.geometry,
      recommended: (route.id || `route-${index + 1}`) === predictionResult.recommended_route,
    }));
  }
  const sourceRoutes = mapRoutes.length ? mapRoutes : routePredictions;
  return sourceRoutes.map((route, index) => ({
    id: route.id || `route-${index + 1}`,
    name: route.name || `Predicted route ${index + 1}`,
    level: route.level,
    color: route.color || routeColour(route.id),
    time: route.estimated_time || route.time,
    delay: route.delay,
    reason: route.reason,
    confidence: route.confidence,
    distance: route.distance_km ? `${route.distance_km} km` : "Not available",
    geometry: route.geometry || route.points,
    recommended: route.recommended,
  }));
}

function getMapRouteForCard(route) {
  if (route?.geometry) return { id: route.id, points: route.geometry };
  const index = Math.max(0, Number(String(route.id).replace("route-", "")) - 1);
  return routePredictions[index] || routePredictions[0];
}

function routeColour(id) {
  const colours = {
    "route-1": "#16a34a",
    "route-2": "#eab308",
    "route-3": "#f97316",
    "route-4": "#dc2626",
    "route-5": "#7f1d1d",
  };
  return colours[id] || "#16a34a";
}

function interpolateRoutePoint(points, progress) {
  if (!points?.length) return [-27.4705, 153.026];
  const lastIndex = points.length - 1;
  const scaled = (progress / 100) * lastIndex;
  const startIndex = Math.min(Math.floor(scaled), lastIndex);
  const endIndex = Math.min(startIndex + 1, lastIndex);
  const ratio = scaled - startIndex;
  const start = points[startIndex];
  const end = points[endIndex];
  return [
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio,
  ];
}

function routeStatus(color) {
  const labels = {
    "#16a34a": "Green",
    "#eab308": "Yellow",
    "#f97316": "Orange",
    "#dc2626": "Red",
    "#7f1d1d": "Dark red",
  };
  return labels[color] || "Traffic status";
}

function colourToHex(colour) {
  const colours = {
    green: "#16a34a",
    yellow: "#eab308",
    orange: "#f97316",
    red: "#dc2626",
    "dark red": "#7f1d1d",
  };
  return colours[colour?.toLowerCase()] || "#16a34a";
}

export function PredictionResult() {
  return (
    <>
      <PageHeader title="Prediction Result" description="A focused summary of the latest AI traffic forecast." />
      <PredictionCards />
    </>
  );
}

export function HistoryPage() {
  const [items, setItems] = useState(recentSearches);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data } = await api.get("/predictions/history");
        setItems(data.history.map(mapApiHistoryItem));
      } catch (apiError) {
        setError(getApiError(apiError));
      }
    }
    loadHistory();
  }, []);

  async function deleteItem(id) {
    setError("");
    try {
      await api.delete(`/predictions/history/${id}`);
    } catch (apiError) {
      setError(getApiError(apiError));
    }
    setItems(items.filter((entry) => entry.id !== id));
  }

  return (
    <>
      <PageHeader title="History" description="Previous route searches with save and delete actions." />
      {error && <div className="mb-5"><AlertBox type="error" text={error} /></div>}
      {items.length === 0 ? <EmptyBox text="Your search history is empty." /> : (
        <div className="panel overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 border-b border-slate-100 p-5 last:border-0 dark:border-white/10 md:flex-row md:items-center md:justify-between">
              <RouteRow item={item} />
              <div className="flex gap-2">
                <Link className="btn-secondary py-2" to={`/map?from=${encodeURIComponent(item.from)}&to=${encodeURIComponent(item.to)}`}>Start Trip</Link>
                <button className="btn-secondary py-2"><Heart size={16} /> Save as favourite</button>
                <button className="btn-secondary py-2 text-rose-600" onClick={() => deleteItem(item.id)}><Trash2 size={16} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function ProfilePage({ admin = false }) {
  const { user, admin: adminProfile } = useAuth();
  const profile = admin ? adminProfile : user;
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: profile?.full_name || profile?.name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
  });

  async function saveProfile() {
    setSaved(false);
    setError("");
    if (admin) {
      setSaved(true);
      return;
    }
    try {
      await api.put("/users/profile", {
        full_name: form.full_name,
        phone: form.phone,
        address: form.address,
      });
      setSaved(true);
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  return (
    <>
      <PageHeader title={admin ? "Admin Profile" : "Profile"} description="Edit profile fields. Role is display only." />
      {saved && <div className="mb-5"><AlertBox text="Profile saved." /></div>}
      {error && <div className="mb-5"><AlertBox type="error" text={error} /></div>}
      <div className="panel max-w-3xl p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 text-2xl font-black text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">{(profile?.full_name || profile?.name || "S")[0]}</div>
          <div>
            <p className="font-black">{profile?.full_name || profile?.name || "SmartTraffic profile"}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Role: {profile?.role || "user"} (display only)</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <input className="input" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} placeholder="Full name" />
          <input className="input" value={form.email} disabled placeholder="Email" />
          <input className="input" type="password" placeholder="New password" />
          <input className="input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone number, optional" />
          <input className="input sm:col-span-2" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Address, optional" />
          <input className="input sm:col-span-2" type="file" aria-label="Profile photo optional" />
        </div>
        <button onClick={saveProfile} className="btn-primary mt-5"><Save size={18} /> Save profile</button>
      </div>
    </>
  );
}

export function SettingsPage() {
  const settings = ["Email notifications", "Location permission prompt", "Privacy route history", "Security alerts", "Data consent for AI training"];
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function saveSettings() {
    setError("");
    setSaved(false);
    try {
      await api.put("/settings", {
        notifications: true,
        location_permission: true,
        privacy_history: true,
        security_alerts: true,
        data_consent: true,
      });
      setSaved(true);
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Control theme, notifications, permissions, privacy, security, saved routes, and account actions." />
      {saved && <div className="mb-5"><AlertBox text="Settings saved." /></div>}
      {error && <div className="mb-5"><AlertBox type="error" text={error} /></div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="mb-4 text-lg font-black">Preferences</h2>
          <div className="grid gap-4">
            {settings.map((setting) => (
              <label key={setting} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-semibold dark:bg-white/5">
                {setting}
                <input type="checkbox" defaultChecked />
              </label>
            ))}
          </div>
          <button className="btn-primary mt-5" onClick={saveSettings}>Save settings</button>
        </div>
        <div className="panel p-6">
          <h2 className="mb-4 text-lg font-black">Saved routes management</h2>
          <div className="grid gap-3">
            {savedRoutes.map((route) => (
              <div key={route.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                <p>{route.name}: {route.from} to {route.to}</p>
                <Link className="btn-secondary mt-3 py-2" to={`/map?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`}>Start Trip</Link>
              </div>
            ))}
          </div>
          <button className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white"><ShieldAlert size={18} /> Delete account</button>
        </div>
      </div>
    </>
  );
}

export function UserNotFound() {
  return <EmptyBox text="This user page is not available." />;
}





