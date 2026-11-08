import { registerDemo } from "../../lib/api.ts";
import demo1 from "./demo-1.json";
import demo2 from "./demo-2.json";
import demo3 from "./demo-3.json";

export const DEMOS = [demo1, demo2, demo3] as const;

export function registerAllDemos(): void {
  for (const demo of DEMOS) {
    // register each language output as its own demo entry keyed by `${id}:${lang}`
    for (const [lang, response] of Object.entries(demo.outputs)) {
      registerDemo(`${demo.id}:${lang}`, response as any);
    }
  }
}

export type DemoDoc = typeof DEMOS[number];
