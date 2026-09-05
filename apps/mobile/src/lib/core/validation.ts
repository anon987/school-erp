import { z } from "zod";

/** Mirrors apps/web/src/lib/core/validation.ts -- see that file for the reasoning. */
export const e164PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9][0-9]{7,14}$/, "Enter a phone number in international format, e.g. +919415012345");

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date as YYYY-MM-DD");

export const paiseSchema = z.number().int().nonnegative();

/** Money as integer paise -> a rupee display string, e.g. 150000 -> "₹1,500.00". No module on
 *  mobile needs paise INPUT yet (parents only view fees, never collect payment on this surface),
 *  but every screen that shows an amount needs this. */
export function formatPaiseAsRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
