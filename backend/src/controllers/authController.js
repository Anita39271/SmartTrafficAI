import bcrypt from "bcrypt";
import { prisma } from "../utils/prisma.js";
import { publicAccount, signToken } from "../utils/tokens.js";

function requireFields(body, fields) {
  const missing = fields.filter((field) => !body[field]);
  if (missing.length) return `Missing required field: ${missing.join(", ")}`;
  return "";
}

function authResponse(account) {
  return {
    token: signToken(account),
    account: publicAccount(account),
    type: account.role === "user" ? "user" : "admin",
  };
}

export async function signup(req, res, next) {
  try {
    const error = requireFields(req.body, ["full_name", "email", "password", "confirm_password"]);
    if (error) return res.status(400).json({ message: error });
    const { full_name, email, password, confirm_password, phone = "", address = "" } = req.body;
    if (password !== confirm_password) return res.status(400).json({ message: "Passwords do not match" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ message: "Email is already registered" });

    const user = await prisma.user.create({
      data: {
        full_name,
        email: email.toLowerCase(),
        password_hash: await bcrypt.hash(password, 10),
        phone,
        address,
        role: "user",
        settings: { create: { theme: "light", notifications_enabled: true, location_permission: false, save_history: true, data_consent: true } },
      },
    });
    res.status(201).json(authResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const error = requireFields(req.body, ["email", "password"]);
    if (error) return res.status(400).json({ message: error });
    const user = await prisma.user.findFirst({ where: { email: req.body.email.toLowerCase(), role: "user" } });
    if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    res.json(authResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function adminLogin(req, res, next) {
  try {
    const error = requireFields(req.body, ["email", "password"]);
    if (error) return res.status(400).json({ message: error });
    const normalized = req.body.email.toLowerCase();
    const admin = await prisma.user.findFirst({
      where: {
        role: { in: ["admin", "super_admin"] },
        OR: [{ email: normalized }, { full_name: { equals: req.body.email, mode: "insensitive" } }],
      },
    });
    if (!admin || !(await bcrypt.compare(req.body.password, admin.password_hash))) {
      return res.status(401).json({ message: "Invalid admin email/name or password" });
    }
    res.json(authResponse(admin));
  } catch (error) {
    next(error);
  }
}

export function me(req, res) {
  res.json({ account: publicAccount(req.account), type: req.account.role === "user" ? "user" : "admin" });
}

export function logout(req, res) {
  res.json({ message: "Logged out. Remove token on the frontend." });
}
