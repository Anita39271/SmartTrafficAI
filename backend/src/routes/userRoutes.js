import { Router } from "express";
import { changePassword, deleteAccount, getProfile, updateProfile } from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("user"));
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);
router.delete("/account", deleteAccount);

export default router;
