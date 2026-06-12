import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BrainCircuit, CalendarClock, Database, FileDown, Flame, Pencil, Plus, Search, Trash2, UploadCloud, UserCog, Wifi } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import { AlertBox } from "../components/StateBox.jsx";
import { analytics, trafficRecords } from "../data/mockData.js";
import { useAuth } from "../context/AuthContext.jsx";
import api, { getApiError } from "../services/api.js";

export function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data } = await api.get("/admin/dashboard");
        setSummary(data);
      } catch (apiError) {
        setError(getApiError(apiError));
      }
    }
    loadDashboard();
  }, []);

  const stats = [
    [Database, "Historical traffic records", summary?.total_traffic_records ?? "0", "teal"],
    [AlertTriangle, "Active roadworks", summary?.active_roadworks ?? "18", "amber"],
    [Flame, "Active incidents", summary?.active_incidents ?? "7", "coral"],
    [Wifi, "Last live data fetch", summary?.last_live_data_fetch_time ? new Date(summary.last_live_data_fetch_time).toLocaleString() : "No fetch yet", "teal"],
    [Database, "Fetched records last time", summary?.total_fetched_traffic_records ?? "0", "violet"],
    [Wifi, "Source status", summary?.live_source_status ?? "Traffic Data Source", "amber"],
    [BrainCircuit, "AI predictions generated", summary?.ai_predictions_generated ?? "12,480", "violet"],
    [AlertTriangle, "High-risk routes", summary?.high_risk_routes ?? "11", "coral"],
    [CalendarClock, "Last data upload date", summary?.last_data_upload_date ?? "11 Jun 2026", "teal"],
    [BrainCircuit, "Last AI model training date", summary?.last_ai_model_training_date ?? "09 Jun 2026", "violet"],
  ];
  return (
    <>
      <PageHeader title="Admin Dashboard" description="Operational summary for historical traffic data, QLDTraffic incidents, model activity, and risk levels." />
      {error && <div className="mb-5"><AlertBox type="error" text={error} /></div>}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([Icon, label, value, tone]) => <StatCard key={label} icon={Icon} label={label} value={value} tone={tone} />)}
      </div>
    </>
  );
}

export function UploadTrafficData() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistoricalStats();
  }, []);

  async function loadHistoricalStats() {
    try {
      const { data } = await api.get("/admin/historical-data/stats");
      setStats(data);
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  async function handleFileSelect(event) {
    setError("");
    setMessage("");
    setSummary(null);
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    if (!selected) {
      setPreviewRows([]);
      return;
    }
    try {
      const text = await selected.text();
      setPreviewRows(previewHistoricalRows(text, selected.name).slice(0, 10));
      setMessage("Preview loaded. Review the first rows, then start import.");
    } catch (apiError) {
      setPreviewRows([]);
      setError(apiError.message || "Could not preview this file.");
    }
  }

  async function importHistoricalData() {
    if (!file) {
      setError("Choose a CSV or JSON file before starting import.");
      return;
    }
    setError("");
    setMessage("");
    setSummary(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/admin/historical-data/import", formData, {
        timeout: 120000,
      });
      setSummary(data.summary);
      setMessage("Historical traffic data import completed.");
      await loadHistoricalStats();
    } catch (apiError) {
      setError(getApiError(apiError));
    } finally {
      setLoading(false);
    }
  }

  async function downloadTemplate() {
    try {
      const { data } = await api.get("/admin/historical-data/import-template", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "smarttraffic-historical-data-template.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  async function saveIncident() {
    setError("");
    setMessage("");
    try {
      await api.post("/admin/incidents", {
        incident_type: "roadwork",
        road_name: "Manual incident road",
        description: "Manual frontend incident record",
        severity: "medium",
        status: "active",
        source: "frontend_manual",
      });
      setMessage("Incident saved to PostgreSQL.");
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  return (
    <>
      <PageHeader title="Upload Historical Traffic Data" description="Import clean historical traffic records into PostgreSQL for AI model training." action={<button onClick={downloadTemplate} className="btn-secondary"><FileDown size={18} /> CSV Template</button>} />
      {message && <div className="mb-5"><AlertBox text={message} /></div>}
      {error && <div className="mb-5"><AlertBox type="error" text={error} /></div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="mb-4 text-lg font-black">Upload historical data file</h2>
          <input className="input" type="file" accept=".csv,.json,.geojson,application/json,text/csv" onChange={handleFileSelect} />
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 dark:bg-white/5">
            <p className="font-black">Required columns</p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">road_name, date, time, average_speed or traffic_volume, congestion_level</p>
            <p className="mt-2 font-black">Optional columns</p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">suburb, latitude, longitude, day_of_week, incident_count, roadwork_active, weather, source</p>
          </div>
          <button onClick={importHistoricalData} disabled={loading || !file} className="btn-primary mt-4"><UploadCloud size={18} /> {loading ? "Importing..." : "Start Import"}</button>
        </div>
        <div className="panel p-6">
          <h2 className="mb-4 text-lg font-black">Historical data coverage</h2>
          <div className="grid gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{stats?.total_historical_records ?? 0}</strong><br />Total records</div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{stats?.coverage_label || "No historical data imported"}</strong><br />Historical data coverage</div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{stats?.earliest_date || "Not available"} to {stats?.latest_date || "Not available"}</strong><br />Stored date range</div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{stats?.model_data_readiness || "Checking..."}</strong><br />Model training readiness</div>
          </div>
        </div>
      </div>
      {previewRows.length > 0 && (
        <div className="panel mt-6 overflow-hidden">
          <div className="border-b border-slate-100 p-5 dark:border-white/10">
            <h2 className="text-lg font-black">Preview first 10 rows</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-300">
                <tr>{Object.keys(previewRows[0] || {}).slice(0, 10).map((head) => <th key={head} className="p-4">{head}</th>)}</tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={index} className="border-t border-slate-100 dark:border-white/10">
                    {Object.keys(previewRows[0] || {}).slice(0, 10).map((key) => <td key={key} className="p-4">{String(row[key] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {summary && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="panel mt-6 p-6">
            <h2 className="mb-4 text-lg font-black">Import summary</h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{summary.total_rows}</strong><br />Total rows</div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{summary.inserted_rows}</strong><br />Inserted rows</div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{summary.updated_rows}</strong><br />Updated rows</div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{summary.skipped_duplicate_rows}</strong><br />Skipped duplicates</div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><strong>{summary.invalid_rows}</strong><br />Invalid rows</div>
            </div>
          </div>
          <div className="panel mt-6 p-6">
            <h2 className="mb-4 text-lg font-black">Validation errors</h2>
            {!summary.errors?.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No validation errors returned.</p> : (
              <div className="max-h-80 overflow-auto text-sm">
                {summary.errors.slice(0, 50).map((item) => (
                  <div key={item.row} className="border-b border-slate-100 py-3 dark:border-white/10">
                    <strong>Row {item.row}</strong>: {item.errors.join(", ")}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="panel mt-6 p-6">
        <h2 className="mb-4 text-lg font-black">Manual admin incident record</h2>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_2fr_auto]">
          <input className="input" placeholder="Road name" />
          <select className="input"><option>Roadwork</option><option>Incident</option><option>Closure</option></select>
          <textarea className="input min-h-12" placeholder="Details" />
          <button onClick={saveIncident} className="btn-primary"><Plus size={18} /> Add record</button>
        </div>
      </div>
    </>
  );
}

function previewHistoricalRows(text, filename) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];
  if (filename.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    const rows = Array.isArray(parsed) ? parsed : parsed.rows || parsed.data || parsed.features?.map((feature) => feature.properties || feature);
    return Array.isArray(rows) ? rows : [];
  }
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0] || "");
  return lines.slice(1, 11).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function splitCsvLine(line) {
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

export function TrafficRecords() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [records, setRecords] = useState(trafficRecords);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTraffic() {
      try {
        const { data } = await api.get("/admin/traffic");
        setRecords(data.traffic);
      } catch (apiError) {
        setError(getApiError(apiError));
      }
    }
    loadTraffic();
  }, []);

  async function deleteRecord(id) {
    try {
      await api.delete(`/admin/traffic/${id}`);
      setRecords(records.filter((record) => record.id !== id));
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  function exportCsv() {
    const headers = ["incident_type", "road_name", "location", "severity", "source", "start_date", "end_date", "status"];
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((key) => JSON.stringify(row[key] || "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smarttraffic-records.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const rows = records.filter((row) => {
    const haystack = `${row.road || ""} ${row.road_name || ""} ${row.type || ""} ${row.incident_type || ""} ${row.source || ""}`.toLowerCase();
    const matchesSearch = haystack.includes(query.toLowerCase());
    const matchesFilter = filter === "all" || row.incident_type === filter || row.type === filter;
    return matchesSearch && matchesFilter;
  });
  return (
    <>
      <PageHeader title="Traffic Records" description="Search, filter, edit, delete, and export historical traffic records from PostgreSQL." action={<button className="btn-secondary" onClick={exportCsv}><FileDown size={18} /> Export CSV</button>} />
      {error && <div className="mb-5"><AlertBox type="error" text={error} /></div>}
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-white/10 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
            <input className="input pl-10" placeholder="Search road or type" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <select className="input sm:w-56" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All types</option>
            <option value="crash">crash</option>
            <option value="roadwork">roadwork</option>
            <option value="congestion">congestion</option>
            <option value="flooding">flooding</option>
            <option value="event">event</option>
            <option value="hazard">hazard</option>
            <option value="closure">closure</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-300">
              <tr>{["Congestion", "Road name", "Suburb", "Average speed", "Volume", "Date", "Time", "Source", "Actions"].map((head) => <th key={head} className="p-4">{head}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 dark:border-white/10">
                  <td className="p-4 font-bold">{row.congestion_level || row.level}</td><td className="p-4">{row.road_name || row.road}</td><td className="p-4">{row.suburb || row.location}</td><td className="p-4">{row.average_speed ? `${row.average_speed} km/h` : row.speed}</td><td className="p-4">{row.traffic_volume}</td><td className="p-4">{row.date ? new Date(row.date).toLocaleDateString() : ""}</td><td className="p-4">{row.time}</td><td className="p-4">{row.source}</td>
                  <td className="p-4"><div className="flex gap-2"><button className="btn-secondary py-2"><Pencil size={15} /> Edit</button><button className="btn-secondary py-2 text-rose-600" onClick={() => deleteRecord(row.id)}><Trash2 size={15} /> Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function FetchLiveData() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [source, setSource] = useState("mock");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [rows, setRows] = useState(trafficRecords.slice(0, 3));

  useEffect(() => {
    async function loadStatus() {
      try {
        const { data } = await api.get("/admin/live-data/status");
        setStatus(data);
      } catch (apiError) {
        setError(getApiError(apiError));
      }
    }
    loadStatus();
  }, []);

  async function fetchLiveData() {
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/admin/fetch-live-data", { source });
      setRows(data.records);
      setStatus({ source: data.source, last_fetch_time: data.fetched_at, last_records_fetched: data.total_fetched, last_records_saved: data.total_saved, mock_mode_active: data.mock_mode });
      setMessage(`${data.source} fetched ${data.total_fetched} records and saved ${data.total_saved} to PostgreSQL.`);
    } catch (apiError) {
      setError(getApiError(apiError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Fetch QLDTraffic Data" description="Fetch current and planned Queensland traffic events and save them as incident records in PostgreSQL." />
      {message && <div className="mb-5"><AlertBox text={message} /></div>}
      {error && <div className="mb-5"><AlertBox type="error" text={error} /></div>}
      <div className="panel p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="grid gap-2 text-sm font-semibold">
            Source
            <select className="input" value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="live">QLDTraffic Live API</option>
              <option value="mock">Development Traffic Source</option>
            </select>
          </label>
          <button onClick={fetchLiveData} disabled={loading} className="btn-primary"><Wifi size={18} /> {loading ? "Fetching..." : "Fetch Latest Traffic Data"}</button>
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-white/5">
          <p><strong>Configured source:</strong> {status?.configured_source || status?.source || "Traffic Data Source"}</p>
          <p><strong>Last fetch:</strong> {status?.last_fetch_time ? new Date(status.last_fetch_time).toLocaleString() : "No fetch yet"}</p>
          <p><strong>Last records fetched:</strong> {status?.last_records_fetched ?? 0}</p>
          <p><strong>Mode:</strong> {status?.mock_mode_active ? "Development traffic source" : "Live API"}</p>
        </div>
        <div className="mt-6 grid gap-3">
          {rows.map((item) => <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5" key={item.id}>{item.road_name || item.road} - {item.incident_type || item.type} - {item.severity || item.level} - {item.source}</div>)}
        </div>
      </div>
    </>
  );
}

export function AIManagement() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);
  const [dataSummary, setDataSummary] = useState(null);
  const [historicalStats, setHistoricalStats] = useState(null);

  async function loadStatus() {
    try {
      const [aiResponse, dashboardResponse, statsResponse] = await Promise.all([
        api.get("/ai/status"),
        api.get("/admin/dashboard"),
        api.get("/admin/historical-data/stats"),
      ]);
      setStatus(aiResponse.data);
      setDataSummary(dashboardResponse.data);
      setHistoricalStats(statsResponse.data);
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function trainModel() {
    setMessage("");
    setError("");
    try {
      const { data } = await api.post("/ai/train");
      setMessage(`${data.message}. Records used: ${data.records_used}.`);
      setStatus({ connected: true, ...data, model_exists: true });
      loadStatus();
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  async function runTestPrediction() {
    setMessage("");
    setError("");
    try {
      const { data } = await api.post("/ai/predict", {
        starting_address: "Brisbane CBD",
        destination_address: "Gold Coast",
        travel_date: "2026-06-14",
        travel_time: "08:30",
        transport_mode: "car",
      });
      setMessage(`Test prediction: ${data.recommended_route} recommended with ${data.predicted_congestion}.`);
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  return (
    <>
      <PageHeader title="AI Management" description="Model status, retraining controls, accuracy, training date, record count, and test prediction form." />
      {message && <div className="mb-5"><AlertBox text={message} /></div>}
      {error && <div className="mb-5"><AlertBox type="error" text={error} /></div>}
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="panel p-6">
          <h2 className="text-lg font-black">Model status</h2>
          <p className={`mt-3 text-4xl font-black ${status?.connected ? "text-teal-600" : "text-rose-600"}`}>{status?.connected ? "Connected" : "Offline"}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-500 dark:text-slate-400">
         <p>Model exists: <strong>{status?.model_exists ? "Yes" : "No"}</strong></p>
         <p>Model type: <strong>{status?.model_type || status?.model_status || "Not trained"}</strong></p>
         <p>Training source: <strong>{status?.training_source || "Not available"}</strong></p>
         <p>Accuracy estimate: <strong>{status?.accuracy ?? "Not trained"}</strong></p>
         <p>Records used: <strong>{status?.records_used ?? "Not available"}</strong></p>
         <p>Real records available: <strong>{status?.real_records_available ?? historicalStats?.total_historical_records ?? "Not available"}</strong></p>
         <p>Historical traffic records available: <strong>{dataSummary?.total_traffic_records ?? "Not available"}</strong></p>
         <p>Historical data coverage: <strong>{historicalStats?.coverage_label || "No historical data imported"}</strong></p>
         <p>Training date range: <strong>{status?.date_range_used?.earliest_date || "Not available"} to {status?.date_range_used?.latest_date || "Not available"}</strong></p>
         <p>Enough data exists: <strong>{status?.enough_real_data || historicalStats?.enough_data_for_training ? "Yes" : "No"}</strong></p>
         <p>Incident records available: <strong>{dataSummary?.active_incidents ?? "Not available"}</strong></p>
         <p>Traffic data source: <strong>{dataSummary?.live_source_status ?? "Checking..."}</strong></p>
         <p>Trained at: <strong>{status?.trained_at || status?.last_trained || "Not trained yet"}</strong></p>
         <p>{status?.message || "Checking AI service..."}</p>
       </div>
       {status?.model_type !== "real-data" && (
         <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-200">
           This model is not confirmed as trained on enough imported historical traffic data. Import real data, then train again.
         </div>
       )}
       <button onClick={trainModel} className="btn-primary mt-5"><BrainCircuit size={18} /> Train AI Model</button>
        </div>
        <div className="panel p-6">
          <h2 className="mb-4 text-lg font-black">Test prediction</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="input" placeholder="Source" defaultValue="Brisbane CBD" />
            <input className="input" placeholder="Destination" defaultValue="Gold Coast" />
            <input className="input" type="date" defaultValue="2026-06-14" />
            <input className="input" type="time" defaultValue="08:30" />
          </div>
          <button onClick={runTestPrediction} className="btn-secondary mt-4">Run test prediction</button>
        </div>
      </div>
    </>
  );
}

export function ManageAdmins() {
  const { admin } = useAuth();
  const allowed = admin?.role === "super_admin";
  const [admins, setAdmins] = useState([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "admin" });

  useEffect(() => {
    if (!allowed) return;
    loadAdmins();
  }, [allowed]);

  async function loadAdmins() {
    try {
      const { data } = await api.get("/admin/users");
      setAdmins(data.admins || []);
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  async function createAdmin(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const { data } = await api.post("/admin/create-admin", form);
      setAdmins([data.admin, ...admins]);
      setForm({ full_name: "", email: "", password: "", role: "admin" });
      setMessage("Admin account created.");
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  async function changeAdminRole(item) {
    const nextRole = item.role === "super_admin" ? "admin" : "super_admin";
    setMessage("");
    setError("");
    try {
      const { data } = await api.put(`/admin/change-role/${item.id}`, { role: nextRole });
      setAdmins(admins.map((entry) => (entry.id === item.id ? data.admin : entry)));
      setMessage("Admin role updated.");
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  async function removeAdmin(item) {
    setMessage("");
    setError("");
    try {
      await api.delete(`/admin/remove-admin/${item.id}`);
      setAdmins(admins.filter((entry) => entry.id !== item.id));
      setMessage("Admin account removed.");
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  const filteredAdmins = admins.filter((item) => `${item.full_name || ""} ${item.email || ""} ${item.role || ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <PageHeader title="Manage Admins" description="Super admin controls for adding, removing, searching, and changing admin roles." />
      {!allowed ? <AlertBox type="error" text="Only the super_admin account can see admin management features." /> : (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form className="panel p-6" onSubmit={createAdmin}>
            <h2 className="mb-4 text-lg font-black">Add admin</h2>
            {message && <div className="mb-4"><AlertBox text={message} /></div>}
            {error && <div className="mb-4"><AlertBox type="error" text={error} /></div>}
            <div className="grid gap-4">
              <input className="input" placeholder="Name" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required />
              <input className="input" placeholder="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
              <input className="input" placeholder="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
              <select className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="admin">admin</option><option value="super_admin">super_admin</option></select>
              <button className="btn-primary"><UserCog size={18} /> Add admin</button>
            </div>
          </form>
          <div className="panel p-6">
            <input className="input mb-4" placeholder="Search admin" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="grid gap-3">
              {filteredAdmins.map((item) => (
                <div key={item.email} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                  <div><p className="font-bold">{item.full_name || item.name}</p><p className="text-sm text-slate-500 dark:text-slate-400">{item.email} - {item.role}</p></div>
                  <div className="flex gap-2"><button className="btn-secondary py-2" type="button" onClick={() => changeAdminRole(item)}>Change role</button><button className="btn-secondary py-2 text-rose-600" type="button" onClick={() => removeAdmin(item)}>Remove</button></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ReportsAnalytics() {
  const colors = ["#14b8a6", "#f43f5e", "#eab308", "#8b5cf6"];
  return (
    <>
      <PageHeader title="Reports / Analytics" description="Charts for congestion, peak times, incident types, and prediction trends." />
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Most congested roads"><ResponsiveContainer width="100%" height={260}><BarChart data={analytics.roads}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="congestion" fill="#14b8a6" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartPanel>
        <ChartPanel title="Peak congestion times"><ResponsiveContainer width="100%" height={260}><AreaChart data={analytics.peakTimes}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" /><YAxis /><Tooltip /><Area dataKey="level" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.18} /></AreaChart></ResponsiveContainer></ChartPanel>
        <ChartPanel title="Incident type summary"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={analytics.incidentTypes} dataKey="value" nameKey="name" outerRadius={90} label>{analytics.incidentTypes.map((_, index) => <Cell key={index} fill={colors[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></ChartPanel>
        <ChartPanel title="Prediction summary"><div className="grid h-[260px] place-items-center text-center"><div><p className="text-5xl font-black text-teal-600">78%</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">AI predictions currently recommend low to moderate risk routes.</p></div></div></ChartPanel>
      </div>
    </>
  );
}

function ChartPanel({ title, children }) {
  return <div className="panel p-5"><h2 className="mb-4 text-lg font-black">{title}</h2>{children}</div>;
}
