import { prisma } from "../utils/prisma.js";

function mapSavedRoute(item) {
  return {
    id: item.id,
    user_id: item.user_id,
    name: item.route_name,
    from: item.source_location,
    to: item.destination_location,
    from_lat: item.source_latitude,
    from_lng: item.source_longitude,
    to_lat: item.destination_latitude,
    to_lng: item.destination_longitude,
    best_time: item.travel_time || "",
    travel_date: item.travel_date?.toISOString().slice(0, 10) || "",
    travel_time: item.travel_time || "",
    route_geometry: item.route_geometry || null,
    distance_km: item.distance_km,
    estimated_duration: item.estimated_duration,
    ai_prediction_result: item.ai_prediction_result || null,
    created_at: item.created_at,
  };
}

export async function listSavedRoutes(req, res, next) {
  try {
    const savedRoutes = await prisma.savedRoute.findMany({ where: { user_id: req.account.id }, orderBy: { created_at: "desc" } });
    res.json({ saved_routes: savedRoutes.map(mapSavedRoute) });
  } catch (error) {
    next(error);
  }
}

export async function createSavedRoute(req, res, next) {
  try {
    const { name, from, to, from_lat, from_lng, to_lat, to_lng, travel_date, travel_time, route_geometry, distance_km, estimated_duration, ai_prediction_result } = req.body;
    if (!name || !from || !to) return res.status(400).json({ message: "Name, from, and to are required" });
    const route = await prisma.savedRoute.create({
      data: {
        user_id: req.account.id,
        route_name: name,
        source_location: from,
        destination_location: to,
        source_latitude: from_lat === undefined ? null : Number(from_lat),
        source_longitude: from_lng === undefined ? null : Number(from_lng),
        destination_latitude: to_lat === undefined ? null : Number(to_lat),
        destination_longitude: to_lng === undefined ? null : Number(to_lng),
        travel_date: travel_date ? new Date(`${travel_date}T00:00:00.000Z`) : null,
        travel_time: travel_time || null,
        route_geometry: route_geometry || undefined,
        distance_km: distance_km === undefined ? null : Number(distance_km),
        estimated_duration: estimated_duration || null,
        ai_prediction_result: ai_prediction_result || undefined,
      },
    });
    res.status(201).json({ saved_route: mapSavedRoute(route) });
  } catch (error) {
    next(error);
  }
}

export async function deleteSavedRoute(req, res, next) {
  try {
    const route = await prisma.savedRoute.findFirst({ where: { id: req.params.id, user_id: req.account.id } });
    if (!route) return res.status(404).json({ message: "Saved route not found" });
    await prisma.savedRoute.delete({ where: { id: req.params.id } });
    res.json({ message: "Saved route deleted" });
  } catch (error) {
    next(error);
  }
}
