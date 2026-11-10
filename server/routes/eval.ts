import { Router } from "express";
import fs from "node:fs";
import path from "node:path";

const router = Router();

router.get("/eval", (_req, res) => {
  const resultsPath = path.join(process.cwd(), "data", "eval", "results.json");
  let payload: unknown = null;
  if (fs.existsSync(resultsPath)) {
    try {
      payload = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
    } catch {
      payload = null;
    }
  }
  if (payload && typeof payload === "object") {
    return res.json({
      ok: true,
      data: { ...payload, measured: true },
      meta: { version: "1.0", measured: true },
    });
  }
  return res.json({
    ok: true,
    data: { measured: false, languages: {}, failures: [] },
    meta: { version: "1.0", measured: false },
  });
});

export default router;
