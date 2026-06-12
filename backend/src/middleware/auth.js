import { prisma } from "../utils/prisma.js";
import { verifyToken } from "../utils/tokens.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) return res.status(401).json({ message: "Authentication token is required" });

  try {
    const decoded = verifyToken(token);
    const account = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!account) return res.status(401).json({ message: "Account no longer exists" });
    req.account = account;
    next();
  } catch (error) {
    if (error?.name?.startsWith?.("Prisma")) {
      return res.status(503).json({ message: "Backend or database is not connected. Please start the backend server and PostgreSQL." });
    }
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.account || !roles.includes(req.account.role)) {
      return res.status(403).json({ message: "You do not have permission to access this resource" });
    }
    next();
  };
}
