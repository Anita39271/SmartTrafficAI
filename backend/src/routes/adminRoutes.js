import { Router } from "express";
import {
  changeRole,
  createAdmin,
  createIncident,
  dashboard,
  deleteIncident,
  deleteTraffic,
  exportTraffic,
  fetchLiveData,
  liveDataStatus,
  historicalDataCoverageStats,
  historicalDataImportTemplate,
  importHistoricalData,
  listIncidents,
  listTraffic,
  listUsers,
  removeAdmin,
  updateIncident,
  updateTraffic,
  uploadTraffic,
} from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "super_admin"));
router.get("/dashboard", dashboard);
router.get("/users", listUsers);

router.post("/create-admin", requireRole("super_admin"), createAdmin);
router.put("/change-role/:id", requireRole("super_admin"), changeRole);
router.delete("/remove-admin/:id", requireRole("super_admin"), removeAdmin);

router.post("/traffic/upload", uploadTraffic);
router.get("/traffic", listTraffic);
router.get("/traffic/export", exportTraffic);
router.put("/traffic/:id", updateTraffic);
router.delete("/traffic/:id", deleteTraffic);

router.post("/historical-data/import", importHistoricalData);
router.get("/historical-data/import-template", historicalDataImportTemplate);
router.get("/historical-data/stats", historicalDataCoverageStats);

router.post("/incidents", createIncident);
router.get("/incidents", listIncidents);
router.put("/incidents/:id", updateIncident);
router.delete("/incidents/:id", deleteIncident);

router.post("/fetch-live-data", fetchLiveData);
router.get("/live-data/status", liveDataStatus);

export default router;
