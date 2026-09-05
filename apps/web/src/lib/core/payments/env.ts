import { z } from "zod";

// Server-only. Order creation happens here (apps/web); webhook verification happens in
// apps/worker with its own RAZORPAY_WEBHOOK_SECRET -- neither app needs the other's secret.
const envSchema = z.object({
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
});

export function getRazorpayEnv() {
  return envSchema.parse({
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  });
}
