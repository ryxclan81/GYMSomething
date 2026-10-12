import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./optional.css";
import "./training.css";
import "./controls.css";
import "./workout-focus.css";
import "./refinement.css";
import "./controls-refinement.css";
import "./setwise.css";
import { HelpProvider } from "./components/Help";
import { initialize } from "./state/store";
import { registerSW } from "virtual:pwa-register";
import { useApp } from "./state/store";
import { toast } from "./components/ui";
import { Capacitor } from "@capacitor/core";
initialize();
if (!Capacitor.isNativePlatform())
  registerSW({
    onNeedRefresh() {
      if (!useApp.getState().data.activeSession)
        toast(
          "A new version is ready. Close all Setwise tabs and reopen to update.",
        );
    },
    onRegisterError() {
      toast(
        "Offline installation could not complete. Reconnect and reopen Setwise.",
      );
    },
  });
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelpProvider>
      <App />
    </HelpProvider>
  </React.StrictMode>,
);
