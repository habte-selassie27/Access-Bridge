import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { initA11y } from "./lib/a11y.ts";
import { initAuth } from "./lib/auth.ts";
import { initHybrid } from "./lib/hybrid/index.ts";
import { initRemoteConfig } from "./lib/hybrid/remoteConfig.ts";
import "./style.css";

// Apply the saved accessibility preferences before the first paint so the
// page never flashes the wrong theme or text size, and read the session so
// the right set of saved documents is shown from the first render.
initA11y();
initAuth();
// Firebase AI Logic hybrid inference (no-op when not configured).
initHybrid();
void initRemoteConfig();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
