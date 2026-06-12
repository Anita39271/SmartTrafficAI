import bcrypt from "bcrypt";
import { prisma } from "../utils/prisma.js";
import { publicAccount } from "../utils/tokens.js";

export function getProfile(req, res) {
  res.json({ profile: publicAccount(req.account) });
}

export async function updateProfile(req, res, next) {
  try {
    const { full_name, phone, address, profile_photo } = req.body;
    const user = await prisma.user.update({
      where: { id: req.account.id },
      data: { full_name, phone, address, profile_photo },
    });
    res.json({ profile: publicAccount(user), message: "Profile updated" });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ message: "Current and new passwords are required" });
    const user = await prisma.user.findUnique({ where: { id: req.account.id } });
    if (!user || !(await bcrypt.compare(current_password, user.password_hash))) return res.status(401).json({ message: "Current password is incorrect" });
    if (new_password.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });
    await prisma.user.update({ where: { id: req.account.id }, data: { password_hash: await bcrypt.hash(new_password, 10) } });
    res.json({ message: "Password changed" });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    await prisma.user.delete({ where: { id: req.account.id } });
    res.json({ message: "Account deleted" });
  } catch (error) {
    next(error);
  }
}
