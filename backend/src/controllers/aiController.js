import { callAiPrediction, callAiStatus, callAiTrain, fallbackAiPrediction } from "../services/predictionService.js";
import { prisma } from "../utils/prisma.js";

export async function predict(req, res, next) {
  try {
    const [trafficData, incidents] = await Promise.all([
      prisma.historicalTrafficData.findMany({ orderBy: { date: "desc" }, take: 250 }),
      prisma.incident.findMany({ where: { status: { in: ["active", "planned"] } }, orderBy: { updated_at: "desc" }, take: 25 }),
    ]);
    try {
      res.json(await callAiPrediction(req.body || {}, { trafficData, incidents }));
    } catch {
      res.json(fallbackAiPrediction(req.body || {}));
    }
  } catch (error) {
    next(error);
  }
}

export async function train(req, res, next) {
  const startedAt = new Date();
  try {
    const trainingRecords = await prisma.historicalTrafficData.findMany({
      orderBy: [{ date: "asc" }, { time: "asc" }],
      select: {
        road_name: true,
        suburb: true,
        date: true,
        day_of_week: true,
        time: true,
        traffic_volume: true,
        average_speed: true,
        congestion_level: true,
        incident_count: true,
        roadwork_active: true,
        weather: true,
        source: true,
      },
    });
    const result = await callAiTrain({
      historical_traffic_data: trainingRecords.map((record) => ({
        ...record,
        date: record.date.toISOString().slice(0, 10),
      })),
    });
    await prisma.modelTrainingRun.create({
      data: {
        model_name: result.model_name || "random_forest_traffic_model",
        records_used: Number(result.records_used || 0),
        accuracy_score: result.accuracy_score === undefined ? (result.accuracy === undefined ? null : Number(result.accuracy)) : Number(result.accuracy_score),
        trained_by_admin_id: req.account.id,
        status: result.model_status || "development/sample-data model",
        started_at: startedAt,
        completed_at: new Date(),
        model_file_path: result.model_file_path || "app/saved_model/traffic_model.joblib",
      },
    });
    await prisma.adminLog.create({ data: { admin_id: req.account.id, action: "train_ai_model", details: JSON.stringify(result) } });
    res.json({ message: "AI model trained by FastAPI service", ...result });
  } catch (error) {
    await prisma.modelTrainingRun.create({
      data: {
        model_name: "random_forest_traffic_model",
        records_used: 0,
        trained_by_admin_id: req.account.id,
        status: "failed",
        started_at: startedAt,
        completed_at: new Date(),
      },
    }).catch(() => {});
    await prisma.adminLog.create({ data: { admin_id: req.account.id, action: "train_ai_model", details: "AI service unavailable; training fallback reported" } }).catch(() => {});
    res.status(503).json({ message: "AI service is not connected. Please start the FastAPI AI service." });
  }
}

export async function status(req, res) {
  try {
    const result = await callAiStatus();
    res.json({ connected: true, ai_service_url: process.env.AI_SERVICE_URL || "http://localhost:8000", ...result });
  } catch {
    res.json({
      connected: false,
      model_exists: false,
      ai_service_url: process.env.AI_SERVICE_URL || "http://localhost:8000",
      message: "AI service is not connected. Showing rule-based prediction.",
    });
  }
}
