import React, { createContext } from "react";
import { useStoredState } from "../hooks/useStoredState";
import z from "zod";
import { maps, weapons } from "../data/generated";

// derive weapon types from generated data and enable them by default
const weaponTypeSet = new Set<string>(
  Array.from(Object.values(weapons).map((w) => w.data.type))
);

const mapSet = new Set<string>(
  Array.from(Object.values(maps).map((w) => w.data.name)).flat()
);

const defaultWeaponTypeEnabled = Array.from(weaponTypeSet).reduce<
  Record<string, boolean>
>((acc, t) => {
  acc[t] = true;
  return acc;
}, {});

const defaultMapEnabled = Array.from(mapSet).reduce<Record<string, boolean>>(
  (acc, t) => {
    acc[t] = true;
    return acc;
  },
  {}
);

type Settings = {
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  instantSpin: boolean;
  setInstantSpin: (v: boolean) => void;
  tierBounds: Record<string, { min: number; max: number }>;
  setTierBounds: (key: string, bounds: { min: number; max: number }) => void;
  weaponTypeEnabled: Record<string, boolean>;
  setWeaponTypeEnabled: (type: string, enabled: boolean) => void;
  mapEnabled: Record<string, boolean>;
  setMapEnabled: (map: string, enabled: boolean) => void;
};

const SettingsContext = createContext<Settings | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [soundEnabled, setSoundEnabled] = useStoredState(
    "settings.soundEnabled",
    true,
    z.boolean()
  );
  const [instantSpin, setInstantSpin] = useStoredState(
    "settings.instantSpin",
    false,
    z.boolean()
  );
  // default tier bounds for the first four scrollers
  const [tierBounds, setTierBoundsState] = useStoredState(
    "settings.tierBounds",
    {
      helmets: { min: 1, max: 6 },
      vests: { min: 1, max: 6 },
      backpacks: { min: 1, max: 6 },
      rigs: { min: 1, max: 6 },
    },
    z.record(
      z.string(),
      z.object({ min: z.number().min(1).max(6), max: z.number().min(1).max(6) })
    )
  );

  const [weaponTypeEnabled, setWeaponTypeEnabledState] = useStoredState(
    "settings.weaponTypeEnabled",
    defaultWeaponTypeEnabled,
    z.record(z.string(), z.boolean())
  );

  if (weaponTypeSet.size !== Object.keys(weaponTypeEnabled).length) {
    // weapon types have changed since last run; reset to default
    setWeaponTypeEnabledState(defaultWeaponTypeEnabled);
  }

  const [mapEnabled, setMapEnabledState] = useStoredState(
    "settings.mapEnabled",
    defaultMapEnabled,
    z.record(z.string(), z.boolean())
  );

  if (mapSet.size !== Object.keys(mapEnabled).length) {
    // maps have changed since last run; reset to default
    setMapEnabledState(defaultMapEnabled);
  }

  const setTierBounds = (key: string, bounds: { min: number; max: number }) =>
    setTierBoundsState((prev) => ({ ...prev, [key]: bounds }));

  const setWeaponTypeEnabled = (type: string, enabled: boolean) =>
    setWeaponTypeEnabledState((prev) => ({ ...prev, [type]: enabled }));

  const setMapEnabled = (map: string, enabled: boolean) =>
    setMapEnabledState((prev) => ({ ...prev, [map]: enabled }));

  return (
    <SettingsContext.Provider
      value={{
        soundEnabled,
        setSoundEnabled,
        instantSpin,
        setInstantSpin,
        tierBounds,
        setTierBounds,
        weaponTypeEnabled,
        setWeaponTypeEnabled,
        mapEnabled,
        setMapEnabled,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
