import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { startOutboxSync } from "./offline/outbox";
import "./index.css";

// Cache the app shell so the PWA opens without signal (no-op in development).
registerSW({ immediate: true });
// Deliver reports saved offline whenever a connection is available.
startOutboxSync();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
