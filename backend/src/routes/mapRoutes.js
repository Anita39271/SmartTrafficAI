import { Router } from "express";
import { autocomplete, route } from "../controllers/mapController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("user"));
router.get("/autocomplete", autocomplete);
router.post("/route", route);

export default router;
