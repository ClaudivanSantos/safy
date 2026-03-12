import { createHash } from "node:crypto";

export function hashRecoveryToken(token: string): string {
  const normalized = token.trim().replace(/\s+/g, "").replace(/-/g, "").toLowerCase();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
