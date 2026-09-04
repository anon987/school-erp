import { z } from "zod";

/**
 * E.164 format, matching the check constraint on user_profile.phone (packages/db). Every
 * phone-collecting form across every module should use this, not a bespoke regex per feature.
 */
export const e164PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9][0-9]{7,14}$/, "Enter a phone number in international format, e.g. +919415012345");

/** ISO date (YYYY-MM-DD) -- what every date column in the schema stores and what <input type="date"> emits. */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date as YYYY-MM-DD");

/**
 * Money is integer paise, never a float, per CLAUDE.md. No module needs this yet (Fees is P1
 * weeks 8-10), but it belongs here now so the first feature that does need it reaches for this
 * instead of inventing its own.
 */
export const paiseSchema = z.number().int().nonnegative();
