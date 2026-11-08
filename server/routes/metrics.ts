import { Router } from "express";
import { getMetrics } from "../lib/observability/metrics.ts";

const router = Router();
router.get("/metrics", (_req, res) => {
  res.json({ ok: true, data: getMetrics() });
});
export default router;
