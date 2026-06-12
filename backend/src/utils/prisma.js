import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export function isDatabaseError(error) {
  return error?.code?.startsWith?.("P") || ["PrismaClientInitializationError", "PrismaClientKnownRequestError"].includes(error?.name);
}
