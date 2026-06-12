import bcrypt from "bcrypt";

const password = "password123";

export const users = [
  {
    id: "user-1",
    full_name: "Queensland Driver",
    email: "driver@smarttraffic.ai",
    password_hash: bcrypt.hashSync(password, 10),
    phone: "0400 000 000",
    address: "Brisbane City QLD 4000",
    role: "user",
  },
];

export const admins = [
  {
    id: "admin-1",
    full_name: "Anita",
    email: "anita@smarttraffic.ai",
    password_hash: bcrypt.hashSync(password, 10),
    role: "super_admin",
  },
];

export const settings = {
  "user-1": {
    notifications: true,
    location_permission: false,
    privacy_history: true,
    security_alerts: true,
    data_consent: true,
  },
};

export const predictionHistory = [
  {
    id: "prediction-1",
    user_id: "user-1",
    starting_address: "Brisbane CBD, QLD",
    destination_address: "Gold Coast QLD",
    travel_date: "2026-06-14",
    travel_time: "08:30",
    recommended_route: "Route 1",
    predicted_congestion: "Low traffic",
    traffic_colour: "green",
    created_at: "2026-06-11",
  },
];

export const savedRoutes = [
  { id: "saved-1", user_id: "user-1", name: "Work commute", from: "South Brisbane QLD 4101", to: "Brisbane CBD, QLD", best_time: "09:20" },
  { id: "saved-2", user_id: "user-1", name: "Weekend coast trip", from: "Brisbane CBD, QLD", to: "Gold Coast QLD", best_time: "10:45" },
];

export const trafficRecords = [
  { id: "QLD-1021", road: "M1 Pacific Motorway", type: "Flow", level: "Clear", speed: "88 km/h", updated: "11 Jun 2026, 08:10" },
  { id: "QLD-1022", road: "Gateway Motorway", type: "Incident", level: "Heavy", speed: "31 km/h", updated: "11 Jun 2026, 08:16" },
  { id: "QLD-1023", road: "Bruce Highway", type: "Roadwork", level: "Moderate", speed: "64 km/h", updated: "11 Jun 2026, 08:22" },
];

export const incidents = [
  { id: "incident-1", road: "M1 near Springwood", type: "Roadwork", severity: "Slow", description: "Lane works southbound" },
  { id: "incident-2", road: "Gateway Motorway", type: "Crash", severity: "Serious", description: "Crash cleanup near merge" },
];
