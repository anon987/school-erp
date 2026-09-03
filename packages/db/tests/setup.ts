import { config } from "dotenv";
import path from "node:path";
import WebSocket from "ws";

// Loads packages/db/.env.test if present. Not committed -- see tests/README.md for what it
// needs and how to get the values from `supabase status`.
config({ path: path.resolve(__dirname, "../.env.test") });

// supabase-js always initializes a Realtime client, even though this suite never subscribes to
// anything -- it just needs a WebSocket constructor to exist at construction time. Node 22+
// ships one natively; below that (this repo targets Node 20, see root package.json engines),
// it isn't global. Polyfilling with `ws` here is a test-only workaround.
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocket;
}
