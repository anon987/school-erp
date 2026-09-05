import { z } from "zod";

// Server-only -- deliberately not NEXT_PUBLIC_. See apps/worker/.env.example for the matching
// values this must line up with.
const envSchema = z.object({
  WORKER_URL: z.string().url(),
  WORKER_INTERNAL_SECRET: z.string().min(16),
});

export const workerEnv = envSchema.parse({
  WORKER_URL: process.env.WORKER_URL,
  WORKER_INTERNAL_SECRET: process.env.WORKER_INTERNAL_SECRET,
});
