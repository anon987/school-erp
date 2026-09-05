import { createServer, type Server } from "node:http";
import { handleUpdateMemberRoles } from "./membersRoutes";
import { handleRazorpayWebhook } from "./razorpayWebhookRoute";
import { handleActivateGuardianPortalAccount, handleCreateGuardianPortalAccount } from "./guardianPortalRoutes";
import { handleDispatchNotifications } from "./notificationRoutes";

const MEMBER_ROLES_PATH = /^\/internal\/school-members\/([0-9a-f-]{36})\/roles$/i;
const GUARDIAN_PORTAL_ACCOUNT_PATH = /^\/internal\/guardians\/([0-9a-f-]{36})\/portal-account$/i;

/**
 * Plain node:http, not a framework -- this service exposes a small, fixed set of internal
 * routes (/settings/members' role assignment and the Razorpay webhook), never a browser client
 * directly. A router/middleware framework would be more dependency and more surface than the
 * current route count justifies; add one when the route count actually does.
 */
export function createHttpServer(): Server {
  return createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://internal");

    if (req.method === "GET" && url.pathname === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const memberRolesMatch = url.pathname.match(MEMBER_ROLES_PATH);
    if (req.method === "POST" && memberRolesMatch) {
      const schoolMemberId = memberRolesMatch[1] as string;
      void handleUpdateMemberRoles(req, res, schoolMemberId);
      return;
    }

    const guardianPortalMatch = url.pathname.match(GUARDIAN_PORTAL_ACCOUNT_PATH);
    if (req.method === "POST" && guardianPortalMatch) {
      const guardianId = guardianPortalMatch[1] as string;
      void handleCreateGuardianPortalAccount(req, res, guardianId);
      return;
    }

    if (req.method === "POST" && url.pathname === "/internal/notifications/dispatch") {
      void handleDispatchNotifications(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/internal/portal/activate") {
      void handleActivateGuardianPortalAccount(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/webhooks/razorpay") {
      void handleRazorpayWebhook(req, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found." }));
  });
}
