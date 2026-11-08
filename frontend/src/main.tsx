import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { applyTheme, loadTheme } from "./theme.ts";
import "./style.css";

// Apply the saved theme before the first render so there is no light flash.
applyTheme(loadTheme());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
