import { Router } from "express";
import { createPrediction, deleteHistory, getHistory, trafficContext } from "../controllers/predictionController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("user"));
router.post("/", createPrediction);
router.get("/traffic-context", trafficContext);
router.get("/history", getHistory);
router.delete("/history/:id", deleteHistory);

export default router;
