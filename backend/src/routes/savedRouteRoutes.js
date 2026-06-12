import { Router } from "express";
import { createSavedRoute, deleteSavedRoute, listSavedRoutes } from "../controllers/savedRouteController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("user"));
router.get("/", listSavedRoutes);
router.post("/", createSavedRoute);
router.delete("/:id", deleteSavedRoute);

export default router;
