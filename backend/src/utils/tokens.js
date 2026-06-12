import jwt from "jsonwebtoken";

const secret = () => process.env.JWT_SECRET || "change_this_secret";

export function signToken(account) {
  return jwt.sign(
    { id: account.id, email: account.email, role: account.role, full_name: account.full_name },
    secret(),
    { expiresIn: "8h" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, secret());
}

export function publicAccount(account) {
  if (!account) return null;
  const { password_hash, ...safeAccount } = account;
  return safeAccount;
}
