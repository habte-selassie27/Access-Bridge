import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./style.css";

// Force dark theme across the entire UI (dark background, white text).
document.documentElement.dataset.theme = "dark";
document.documentElement.style.colorScheme = "dark";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
