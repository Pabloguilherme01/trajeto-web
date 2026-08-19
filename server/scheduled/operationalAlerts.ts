import type { Request, Response } from "express";
import { isOperationalAlertAutomationTask, evaluateGooglePaginationOperationalAlerts } from "../db";
import { sdk } from "../_core/sdk";

export async function runOperationalAlertsSchedule(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    if (!await isOperationalAlertAutomationTask(user.taskUid)) return res.status(403).json({ error: "unknown-schedule" });
    const result = await evaluateGooglePaginationOperationalAlerts();
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error("[Operational alerts schedule] failed", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "unknown-error", timestamp: new Date().toISOString() });
  }
}
