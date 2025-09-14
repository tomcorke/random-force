import STYLES from "./SettingsPanel.module.css";
import { useSettings } from "../../contexts/SettingsContext";
import { useState } from "react";
import { Slider } from "../Slider/Slider";

export const SettingsPanel = () => {
  const { soundEnabled, setSoundEnabled, instantSpin, setInstantSpin } =
    useSettings();

  // min/max tier settings for first 4 scrollers (0-based steps -> tier 1..6)
  const categories = ["helmets", "vests", "backpacks", "rigs"];
  const { tierBounds, setTierBounds } = useSettings();

  const setMin = (idx: number, v: number) => {
    const key = categories[idx];
    const cur = tierBounds[key] || { min: 0, max: 5 };
    const next = { min: Math.min(v, cur.max), max: cur.max };
    setTierBounds(key, next);
  };

  const setMax = (idx: number, v: number) => {
    const key = categories[idx];
    const cur = tierBounds[key] || { min: 0, max: 5 };
    const next = { min: cur.min, max: Math.max(v, cur.min) };
    setTierBounds(key, next);
  };

  return (
    <div className={STYLES.SettingsPanel}>
      <h3>Settings</h3>
      <div className={STYLES.row}>
        <label className={STYLES.switchLabel}>
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
          />
          <span>Sound</span>
        </label>
      </div>
      <div className={STYLES.row}>
        <label className={STYLES.switchLabel}>
          <input
            type="checkbox"
            checked={instantSpin}
            onChange={(e) => setInstantSpin(e.target.checked)}
          />
          <span>Instant spin</span>
        </label>
      </div>

      <hr />
      <div style={{ fontSize: 12, color: "#bbb", marginTop: 8 }}>
        Tier bounds per slot
      </div>
      {categories.map((cat, idx) => (
        <div key={cat} style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 13,
              color: "#ddd",
              marginBottom: 6,
              textTransform: "capitalize",
            }}
          >
            {cat}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Slider
                steps={6}
                value={(tierBounds[cat] || { min: 0 }).min}
                onChange={(v) => setMin(idx, v)}
                label="Min tier"
              />
            </div>
            <div style={{ flex: 1 }}>
              <Slider
                steps={6}
                value={(tierBounds[cat] || { max: 5 }).max}
                onChange={(v) => setMax(idx, v)}
                label="Max tier"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SettingsPanel;
