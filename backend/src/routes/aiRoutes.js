import { Router } from "express";
import { predict, status, train } from "../controllers/aiController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.post("/predict", predict);
router.post("/train", requireRole("admin", "super_admin"), train);
router.get("/status", requireRole("admin", "super_admin"), status);

export default router;
