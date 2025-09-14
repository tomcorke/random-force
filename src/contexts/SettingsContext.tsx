import React, { createContext } from "react";
import * as weapons from "../data/generated/weapons";
import { useStoredState } from "../hooks/useStoredState";
import z from "zod";

// derive weapon types from generated data and enable them by default
const weaponTypeSet = new Set<string>(
  Array.from(Object.values(weapons).map((w) => w.data.type))
);

const defaultWeaponTypeEnabled = Array.from(weaponTypeSet).reduce<
  Record<string, boolean>
>((acc, t) => {
  acc[t] = true;
  return acc;
}, {});

type Settings = {
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  instantSpin: boolean;
  setInstantSpin: (v: boolean) => void;
  tierBounds: Record<string, { min: number; max: number }>;
  setTierBounds: (key: string, bounds: { min: number; max: number }) => void;
  weaponTypeEnabled: Record<string, boolean>;
  setWeaponTypeEnabled: (type: string, enabled: boolean) => void;
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

  const setTierBounds = (key: string, bounds: { min: number; max: number }) =>
    setTierBoundsState((prev) => ({ ...prev, [key]: bounds }));

  const setWeaponTypeEnabled = (type: string, enabled: boolean) =>
    setWeaponTypeEnabledState((prev) => ({ ...prev, [type]: enabled }));

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
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
