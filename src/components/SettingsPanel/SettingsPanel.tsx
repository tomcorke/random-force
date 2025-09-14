import STYLES from "./SettingsPanel.module.css";
import { useSettings } from "../../contexts/useSettings";
import { useState } from "react";
import { Slider } from "../Slider/Slider";

const WEAPON_TYPE_LABELS: Record<string, string> = {
  rifle: "Assault Rifle",
  smg: "SMG",
  mp: "Marksman Rifle",
  lmg: "Light Machinegun",
};

export const SettingsPanel = () => {
  const { soundEnabled, setSoundEnabled, instantSpin, setInstantSpin } =
    useSettings();

  const [expanded, setExpanded] = useState(false);

  // min/max tier settings for first 4 scrollers (0-based steps -> tier 1..6)
  const categories = ["helmets", "vests", "backpacks", "rigs"];
  const { tierBounds, setTierBounds, weaponTypeEnabled, setWeaponTypeEnabled } =
    useSettings();

  const setMin = (idx: number, v: number) => {
    const key = categories[idx];
    const cur = tierBounds[key] || { min: 1, max: 6 };
    const next = { min: Math.min(v, cur.max), max: cur.max };
    setTierBounds(key, next);
  };

  const setMax = (idx: number, v: number) => {
    const key = categories[idx];
    const cur = tierBounds[key] || { min: 1, max: 6 };
    const next = { min: cur.min, max: Math.max(v, cur.min) };
    setTierBounds(key, next);
  };

  return (
    <div
      className={STYLES.SettingsPanel + (expanded ? " " + STYLES.expanded : "")}
    >
      <div className={STYLES.titleBar} onClick={() => setExpanded((s) => !s)}>
        <div className={STYLES.title}>Settings</div>
        <div className={STYLES.chev} aria-hidden>
          {expanded ? "▾" : "▸"}
        </div>
      </div>
      <div className={STYLES.body}>
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
        <div className={STYLES.columns}>
          <div>
            <div className={STYLES.sectionNote}>Tier bounds per slot</div>
            {categories.map((cat, idx) => (
              <div key={cat} style={{ marginTop: 8 }}>
                <div className={STYLES.categoryTitle}>{cat}</div>
                <div className={STYLES.twoColumn}>
                  <div className={STYLES.flex1}>
                    <Slider
                      startValue={1}
                      steps={6}
                      value={(tierBounds[cat] || { min: 1 }).min}
                      onChange={(v) => setMin(idx, v)}
                      label="Min tier"
                    />
                  </div>
                  <div className={STYLES.flex1}>
                    <Slider
                      startValue={1}
                      steps={6}
                      value={(tierBounds[cat] || { max: 6 }).max}
                      onChange={(v) => setMax(idx, v)}
                      label="Max tier"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className={STYLES.sectionNote}>Weapon types</div>
            <div className={STYLES.weaponTypes}>
              {Object.keys(weaponTypeEnabled || {}).map((type) => (
                <label key={type} className={STYLES.weaponLabel}>
                  <input
                    type="checkbox"
                    checked={Boolean(weaponTypeEnabled[type])}
                    onChange={(e) =>
                      setWeaponTypeEnabled(type, e.target.checked)
                    }
                  />
                  <span style={{ textTransform: "none" }}>
                    {WEAPON_TYPE_LABELS[type] ??
                      type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
