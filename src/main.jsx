import React from "react";
import ReactDOM from "react-dom/client";
import QuinielaApp from "./App.jsx";
import { storage } from "./lib/storage.js";
import "./index.css";

// The original component talks to a global `window.storage` (the Claude
// artifact sandbox API). On Vercel that doesn't exist, so we expose our own
// implementation backed by the /api/storage serverless function (Vercel KV)
// with a localStorage fallback. Same interface, no component changes needed.
window.storage = storage;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QuinielaApp />
  </React.StrictMode>
);
