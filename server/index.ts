import express from "express";
import cors from "cors";
import { llm, ocr } from "./context.ts";
import { attachRequestId } from "./middleware/request-id.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import healthRouter from "./routes/health.ts";
import metricsRouter from "./routes/metrics.ts";
import evalRouter from "./routes/eval.ts";
import ttsRouter from "./routes/tts.ts";
import followupRouter from "./routes/followup.ts";
import explainRouter from "./routes/explain.ts";
import { log } from "./lib/observability/logger.ts";

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(attachRequestId);

app.use("/api", healthRouter);
app.use("/api", metricsRouter);
app.use("/api", evalRouter);
app.use("/api", ttsRouter);
app.use("/api", followupRouter);
app.use("/api", explainRouter);

app.use(errorHandler);

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  log("info", "PasteWise API listening", { port: PORT, llm: Boolean(llm), ocr: Boolean(ocr) });
});

export default app;
