import STYLES from "./SettingsPanel.module.css";
import { useSettings } from "../../contexts/useSettings";
import { useState } from "react";
import { Slider } from "../Slider/Slider";
import { Button } from "../Button";

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

  const {
    tierBounds,
    setTierBounds,
    weaponTypeEnabled,
    setWeaponTypeEnabled,
    mapEnabled,
    setMapEnabled,
  } = useSettings();

  const armourCategories = ["helmets", "vests", "rigs", "backpacks"];
  const weaponTypes: string[] = [
    "rifle",
    "smg",
    "mp",
    "sniper",
    "lmg",
    "shotgun",
    "special",
    "pistol",
  ];

  if (weaponTypes.some((t) => !Object.keys(weaponTypeEnabled).includes(t))) {
    console.error(
      "Unexpected weapon types",
      weaponTypes.filter((t) => !Object.keys(weaponTypeEnabled).includes(t))
    );
    throw Error("Unexpected weapon types");
  }
  if (Object.keys(weaponTypeEnabled).some((t) => !weaponTypes.includes(t))) {
    console.error(
      "Missing weapon types in settings",
      Object.keys(weaponTypeEnabled).filter((t) => !weaponTypes.includes(t))
    );
    throw Error("Missing weapon types in settings");
  }

  const maps: string[] = [
    "Zero Dam",
    "Layali Grove",
    "Brakkesh",
    "Space City",
    "Tide Prison",
  ];

  if (maps.some((t) => !Object.keys(mapEnabled).includes(t))) {
    console.error(
      "Unexpected maps",
      maps.filter((t) => !Object.keys(mapEnabled).includes(t)),
      Object.keys(mapEnabled)
    );
    throw Error("Unexpected maps");
  }
  if (Object.keys(mapEnabled).some((t) => !maps.includes(t))) {
    console.error(
      "Missing maps in settings",
      Object.keys(mapEnabled).filter((t) => !maps.includes(t))
    );
    throw Error("Missing maps in settings");
  }

  const setMin = (idx: number, v: number) => {
    const key = armourCategories[idx];
    const cur = tierBounds[key] || { min: 1, max: 6 };
    const next = { min: Math.min(v, cur.max), max: cur.max };
    setTierBounds(key, next);
  };

  const setMax = (idx: number, v: number) => {
    const key = armourCategories[idx];
    const cur = tierBounds[key] || { min: 1, max: 6 };
    const next = { min: cur.min, max: Math.max(v, cur.min) };
    setTierBounds(key, next);
  };

  const loadPreset = (preset: "easy" | "normal" | "fullSend") => {
    if (preset === "easy") {
      setTierBounds("helmets", { min: 1, max: 4 });
      setTierBounds("vests", { min: 1, max: 4 });
      setTierBounds("rigs", { min: 1, max: 4 });
      setTierBounds("backpacks", { min: 1, max: 4 });
      Object.keys(weaponTypeEnabled).forEach((type) =>
        setWeaponTypeEnabled(type, true)
      );
      setWeaponTypeEnabled("sniper", false);
      setWeaponTypeEnabled("special", false);
      Object.keys(mapEnabled).forEach((map) => setMapEnabled(map, true));
      setMapEnabled("Brakkesh", false);
      setMapEnabled("Space City", false);
      setMapEnabled("Tide Prison", false);
    } else if (preset === "normal") {
      setTierBounds("helmets", { min: 3, max: 5 });
      setTierBounds("vests", { min: 3, max: 5 });
      setTierBounds("rigs", { min: 3, max: 5 });
      setTierBounds("backpacks", { min: 3, max: 5 });
      Object.keys(weaponTypeEnabled).forEach((type) =>
        setWeaponTypeEnabled(type, true)
      );
      Object.keys(mapEnabled).forEach((map) => setMapEnabled(map, true));
      setMapEnabled("Tide Prison", false);
    } else if (preset === "fullSend") {
      setTierBounds("helmets", { min: 5, max: 6 });
      setTierBounds("vests", { min: 5, max: 6 });
      setTierBounds("rigs", { min: 5, max: 6 });
      setTierBounds("backpacks", { min: 5, max: 6 });
      Object.keys(weaponTypeEnabled).forEach((type) =>
        setWeaponTypeEnabled(type, true)
      );
      setWeaponTypeEnabled("pistol", false);
      Object.keys(mapEnabled).forEach((map) => setMapEnabled(map, true));
    }
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

        <div className={STYLES.rowWide}>
          <div>
            <div className={STYLES.sectionNote}>Load Settings Preset</div>
            <div className={STYLES.column}>
              <Button buttonStyle={"small"} onClick={() => loadPreset("easy")}>
                Easy
              </Button>
              <Button
                buttonStyle={"small"}
                onClick={() => loadPreset("normal")}
              >
                Normal
              </Button>
              <Button
                buttonStyle={"small"}
                onClick={() => loadPreset("fullSend")}
              >
                Full Send
              </Button>
            </div>
          </div>
          <div>
            <div className={STYLES.sectionNote}>Tier bounds per slot</div>
            {armourCategories.map((cat, idx) => (
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
            <div className={STYLES.checkboxVerticalList}>
              {weaponTypes.map((type) => (
                <label key={type} className={STYLES.label}>
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
          <div>
            <div className={STYLES.sectionNote}>Maps</div>
            <div className={STYLES.checkboxVerticalList}>
              {maps.map((map) => (
                <label key={map} className={STYLES.label}>
                  <input
                    type="checkbox"
                    checked={Boolean(mapEnabled[map])}
                    onChange={(e) => setMapEnabled(map, e.target.checked)}
                  />
                  <span style={{ textTransform: "none" }}>{map}</span>
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
