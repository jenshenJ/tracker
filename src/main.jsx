import React from "react";
import { createRoot } from "react-dom/client";
import Tracker95 from "./app.jsx";
createRoot(document.getElementById("root")).render(<Tracker95 />);
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
