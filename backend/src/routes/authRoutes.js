import { Router } from "express";
import { adminLogin, login, logout, me, signup } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/admin-login", adminLogin);
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, logout);

export default router;
