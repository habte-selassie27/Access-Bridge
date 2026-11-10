import express from "express";
import cors from "cors";
import { llm, ocr } from "./context.ts";
import { attachRequestId } from "./middleware/request-id.ts";
import { requestLogger } from "./middleware/request-logger.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import healthRouter from "./routes/health.ts";
import metricsRouter from "./routes/metrics.ts";
import evalRouter from "./routes/eval.ts";
import ttsRouter from "./routes/tts.ts";
import followupRouter from "./routes/followup.ts";
import explainRouter from "./routes/explain.ts";
import extractRouter from "./routes/extract.ts";
import verifyRouter from "./routes/verify.ts";
import askRouter from "./routes/ask.ts";
import importRouter from "./routes/import.ts";
import eligibilityRouter from "./routes/eligibility.ts";
import compareRouter from "./routes/compare.ts";
import translateRouter from "./routes/translate.ts";
import simplifyRouter from "./routes/simplify.ts";
import { log } from "./lib/observability/logger.ts";

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(attachRequestId);
app.use(requestLogger);

app.use("/api", healthRouter);
app.use("/api", metricsRouter);
app.use("/api", evalRouter);
app.use("/api", ttsRouter);
app.use("/api", followupRouter);
app.use("/api", explainRouter);
app.use("/api", extractRouter);
app.use("/api", verifyRouter);
app.use("/api", askRouter);
app.use("/api", importRouter);
app.use("/api", eligibilityRouter);
app.use("/api", compareRouter);
app.use("/api", translateRouter);
app.use("/api", simplifyRouter);

app.use(errorHandler);

export default app;

// Only listen when run as a standalone server (not on Vercel serverless).
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT || 3001);
  app.listen(PORT, () => {
    log("info", "PasteWise API listening", { port: PORT, llm: Boolean(llm), ocr: Boolean(ocr) });
  });
}
