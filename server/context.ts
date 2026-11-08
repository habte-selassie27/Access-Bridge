import dotenv from "dotenv";
import { DEMOS, registerAllDemos } from "../frontend/src/data/demo/index.ts";
import { createLLM } from "./lib/providers/llm/llm.factory.ts";
import { createOCR } from "./lib/providers/ocr/ocr.factory.ts";

dotenv.config();
registerAllDemos();

export const DEMO_INDEX: Record<string, any> = {};
for (const demo of DEMOS) {
  for (const [lang, response] of Object.entries(demo.outputs)) {
    DEMO_INDEX[`${demo.id}:${lang}`] = response;
  }
}

export const llm = createLLM();
export const ocr = createOCR();
