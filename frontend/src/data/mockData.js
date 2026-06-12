export const qldCities = [
  "Brisbane CBD",
  "South Brisbane",
  "Gold Coast",
  "Sunshine Coast",
  "Ipswich",
  "Logan",
  "Toowoomba",
  "Cairns",
  "Townsville",
];

export const addressSuggestions = [
  "Brisbane CBD, QLD",
  "South Brisbane QLD 4101",
  "Fortitude Valley QLD 4006",
  "Griffith University Nathan Campus QLD",
  "Gold Coast QLD",
  "Brisbane Airport QLD",
  "Logan Central QLD",
  "Ipswich QLD",
];

export const routePredictions = [
  {
    id: 1,
    name: "Route 1 - M1 Pacific Motorway",
    level: "Clear traffic",
    color: "#16a34a",
    time: "47 min",
    delay: "4 min",
    reason: "Lowest predicted congestion, shorter delay, and no major roadworks.",
    confidence: 94,
    recommended: true,
    points: [
      [-27.4705, 153.026],
      [-27.62, 153.11],
      [-27.88, 153.29],
      [-28.0167, 153.4],
    ],
  },
  {
    id: 2,
    name: "Route 2 - Gateway and Logan",
    level: "Moderate traffic",
    color: "#eab308",
    time: "58 min",
    delay: "12 min",
    reason: "Predicted school-zone congestion near Logan and merging delays.",
    confidence: 88,
    recommended: false,
    points: [
      [-27.4705, 153.026],
      [-27.48, 153.15],
      [-27.68, 153.19],
      [-28.0167, 153.4],
    ],
  },
  {
    id: 3,
    name: "Route 3 - Beaudesert Road",
    level: "Slow traffic",
    color: "#f97316",
    time: "66 min",
    delay: "20 min",
    reason: "Roadworks and slower arterial movement through the southbound corridor.",
    confidence: 84,
    recommended: false,
    points: [
      [-27.4705, 153.026],
      [-27.57, 152.99],
      [-27.82, 153.08],
      [-28.0167, 153.4],
    ],
  },
  {
    id: 4,
    name: "Route 4 - Nerang connection",
    level: "Heavy traffic",
    color: "#dc2626",
    time: "72 min",
    delay: "26 min",
    reason: "Roadworks and incident risk around the southbound corridor.",
    confidence: 82,
    recommended: false,
    points: [
      [-27.4705, 153.026],
      [-27.57, 152.99],
      [-27.82, 153.08],
      [-28.0167, 153.4],
    ],
  },
  {
    id: 5,
    name: "Route 5 - Incident diversion",
    level: "Serious congestion",
    color: "#7f1d1d",
    time: "89 min",
    delay: "41 min",
    reason: "Accident risk and possible lane closure make this the highest-risk option.",
    confidence: 79,
    recommended: false,
    points: [
      [-27.4705, 153.026],
      [-27.52, 153.19],
      [-27.74, 153.24],
      [-28.0167, 153.4],
    ],
  },
];

export const incidents = [
  { id: 1, title: "Roadworks", type: "Slow", location: "M1 near Springwood", position: [-27.61, 153.13], color: "#f97316" },
  { id: 2, title: "Crash cleanup", type: "Serious", location: "Gateway merge", position: [-27.5, 153.16], color: "#7f1d1d" },
  { id: 3, title: "Lane closure", type: "Moderate", location: "South Brisbane", position: [-27.48, 153.02], color: "#eab308" },
];

export const recentSearches = [
  { id: 1, from: "Brisbane CBD", to: "Gold Coast", date: "2026-06-14", time: "08:30", result: "Clear traffic", route: "Route 1", color: "green", searched: "Today" },
  { id: 2, from: "Logan", to: "Brisbane Airport", date: "2026-06-15", time: "17:15", result: "Moderate traffic", route: "Route 2", color: "yellow", searched: "Yesterday" },
  { id: 3, from: "Ipswich", to: "South Brisbane", date: "2026-06-18", time: "07:45", result: "Slow traffic", route: "Route 3", color: "orange", searched: "2 days ago" },
];

export const savedRoutes = [
  { id: 1, name: "Work commute", from: "South Brisbane", to: "Brisbane CBD", bestTime: "09:20" },
  { id: 2, name: "Weekend coast trip", from: "Brisbane CBD", to: "Gold Coast", bestTime: "10:45" },
];

export const trafficRecords = [
  { id: "QLD-1021", road: "M1 Pacific Motorway", type: "Flow", level: "Clear", speed: "88 km/h", updated: "11 Jun 2026, 08:10" },
  { id: "QLD-1022", road: "Gateway Motorway", type: "Incident", level: "Heavy", speed: "31 km/h", updated: "11 Jun 2026, 08:16" },
  { id: "QLD-1023", road: "Bruce Highway", type: "Roadwork", level: "Moderate", speed: "64 km/h", updated: "11 Jun 2026, 08:22" },
  { id: "QLD-1024", road: "Ipswich Motorway", type: "Flow", level: "Slow", speed: "42 km/h", updated: "11 Jun 2026, 08:25" },
];

export const analytics = {
  roads: [
    { name: "M1", congestion: 76 },
    { name: "Gateway", congestion: 68 },
    { name: "Bruce Hwy", congestion: 54 },
    { name: "Ipswich Mwy", congestion: 47 },
  ],
  peakTimes: [
    { time: "6 AM", level: 24 },
    { time: "8 AM", level: 83 },
    { time: "12 PM", level: 42 },
    { time: "5 PM", level: 91 },
    { time: "8 PM", level: 35 },
  ],
  incidentTypes: [
    { name: "Roadworks", value: 34 },
    { name: "Crash", value: 16 },
    { name: "Closure", value: 9 },
    { name: "Weather", value: 12 },
  ],
};
