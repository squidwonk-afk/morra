import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9_]+$/, "Username: lowercase letters, numbers, underscores only");

export const displayNameSchema = z.string().trim().min(1).max(80);

export const pinSchema = z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits");

/** Optional; empty or malformed values become undefined so signup never fails on referral input. */
export const referralCodeSchema = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== "string") return undefined;
  const t = val.trim().toLowerCase();
  if (t === "") return undefined;
  if (t.length < 4 || t.length > 16) return undefined;
  if (!/^[a-z0-9]+$/.test(t)) return undefined;
  return t;
}, z.string().optional());
