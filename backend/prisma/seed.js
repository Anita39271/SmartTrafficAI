import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertUser({ full_name, email, password, role, phone, address }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      full_name,
      role,
      phone,
      address,
      password_hash: await bcrypt.hash(password, 10),
    },
    create: {
      full_name,
      email,
      role,
      phone,
      address,
      password_hash: await bcrypt.hash(password, 10),
      settings: role === "user" ? { create: { theme: "light", notifications_enabled: true, location_permission: false, save_history: true, data_consent: true } } : undefined,
    },
  });
}

async function main() {
  await prisma.savedRoute.deleteMany({
    where: { user: { email: { in: ["admin@smarttraffic.ai", "partner@smarttraffic.ai", "user@smarttraffic.ai"] } } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: ["admin@smarttraffic.ai", "partner@smarttraffic.ai", "user@smarttraffic.ai"] } },
  });

  const superAdmin = await upsertUser({
    full_name: "Anita",
    email: "anita@smarttraffic.ai",
    password: "12345",
    role: "super_admin",
  });

  const today = new Date("2026-06-11T00:00:00.000Z");
  const historicalRoads = [
    ["Brisbane CBD", "Brisbane City", -27.4705, 153.026],
    ["M1 Pacific Motorway", "Springwood", -27.635, 153.13],
    ["Ipswich Road", "Annerley", -27.512, 153.032],
    ["Gympie Road", "Chermside", -27.386, 153.032],
    ["Logan Road", "Mount Gravatt", -27.537, 153.079],
    ["Airport Drive", "Brisbane Airport", -27.394, 153.121],
    ["Gold Coast Highway", "Southport", -27.967, 153.414],
  ];

  await prisma.historicalTrafficData.deleteMany({});
  const historicalRows = [];
  for (let dayOffset = 0; dayOffset < 90; dayOffset += 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - dayOffset);
    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
    const isWeekend = ["Saturday", "Sunday"].includes(dayOfWeek);
    for (const [road_name, suburb, latitude, longitude] of historicalRoads) {
      for (const hour of ["07:30", "08:30", "12:30", "17:15"]) {
        const peak = ["07:30", "08:30", "17:15"].includes(hour);
        const baseVolume = road_name.includes("M1") ? 9800 : road_name.includes("CBD") ? 6800 : 5200;
        const traffic_volume = Math.round(baseVolume * (peak ? 1.25 : 0.72) * (isWeekend ? 0.78 : 1));
        const average_speed = Math.max(18, Math.round((road_name.includes("M1") ? 82 : 54) - (peak ? 18 : 4) - (traffic_volume > 9000 ? 10 : 0)));
        const incident_count = peak && dayOffset % 9 === 0 ? 1 : 0;
        const roadwork_active = road_name.includes("Gympie") || (road_name.includes("M1") && dayOffset % 6 === 0);
        const congestion_level = average_speed < 30 || incident_count > 0 ? "high" : average_speed < 48 || peak ? "medium" : "low";
        historicalRows.push({
          road_name,
          suburb,
          latitude,
          longitude,
          date,
          day_of_week: dayOfWeek,
          time: hour,
          traffic_volume,
          average_speed,
          congestion_level,
          incident_count,
          roadwork_active,
          weather: dayOffset % 11 === 0 ? "rain" : "clear",
          source: "sample historical Queensland traffic data",
        });
      }
    }
  }
  await prisma.historicalTrafficData.createMany({ data: historicalRows });

  await prisma.trafficData.deleteMany({});
  await prisma.trafficData.createMany({
    data: [
      ["Brisbane CBD", "Brisbane CBD", -27.4705, 153.026, 4250, 32, "Moderate"],
      ["M1 Pacific Motorway", "Springwood to Gold Coast", -27.635, 153.13, 9800, 74, "Low"],
      ["Ipswich Road", "Annerley", -27.512, 153.032, 6100, 41, "Heavy"],
      ["Gympie Road", "Chermside", -27.386, 153.032, 5500, 46, "Moderate"],
      ["Logan Road", "Mount Gravatt", -27.537, 153.079, 4800, 52, "Moderate"],
      ["Brisbane Airport", "Airport Drive", -27.394, 153.121, 3600, 58, "Low"],
      ["Gold Coast Highway", "Southport", -27.967, 153.414, 7200, 38, "Heavy"],
    ].map(([road_name, location, latitude, longitude, traffic_volume, average_speed, congestion_level]) => ({
      road_name,
      location,
      latitude,
      longitude,
      traffic_volume,
      average_speed,
      congestion_level,
      date: today,
      time: "08:30",
      source: "Development Traffic Source",
    })),
  });

  await prisma.incident.deleteMany({});
  await prisma.incident.createMany({
    data: [
      ["roadwork", "M1 Pacific Motorway", "Planned lane works southbound near Springwood", -27.61, 153.13, "medium", "active"],
      ["congestion", "Ipswich Road", "Peak-hour congestion around Annerley", -27.512, 153.032, "high", "active"],
      ["crash", "Gateway Motorway", "Crash cleanup near merge lane", -27.5, 153.16, "severe", "active"],
      ["event", "Brisbane CBD", "Major event traffic around city centre", -27.4705, 153.026, "medium", "planned"],
      ["hazard", "Gold Coast Highway", "Debris reported near Southport", -27.967, 153.414, "low", "active"],
    ].map(([incident_type, road_name, description, latitude, longitude, severity, status], index) => ({
      external_id: `seed-incident-${index + 1}`,
      incident_type,
      road_name,
      description,
      latitude,
      longitude,
      severity,
      status,
      start_date: today,
      end_date: null,
      source: "Development Traffic Source",
      raw_data: { source: "seed", description },
      uploaded_by_admin_id: superAdmin.id,
    })),
  });

  console.log("Seed complete: Anita super admin, sample historical traffic data, current traffic data, and incidents created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
