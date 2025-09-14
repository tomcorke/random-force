import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AudioProvider } from "./contexts/AudioContext.tsx";
import { SettingsProvider } from "./contexts/SettingsContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SettingsProvider>
      <AudioProvider>
        <App />
      </AudioProvider>
    </SettingsProvider>
  </StrictMode>
);
