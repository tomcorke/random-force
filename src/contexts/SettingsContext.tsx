import React, { createContext, useContext, useState } from "react";

type Settings = {
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  instantSpin: boolean;
  setInstantSpin: (v: boolean) => void;
  tierBounds: Record<string, { min: number; max: number }>;
  setTierBounds: (key: string, bounds: { min: number; max: number }) => void;
};

const SettingsContext = createContext<Settings | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [instantSpin, setInstantSpin] = useState(false);
  // default tier bounds for the first four scrollers
  const [tierBounds, setTierBoundsState] = useState<
    Record<string, { min: number; max: number }>
  >({
    helmets: { min: 0, max: 5 },
    vests: { min: 0, max: 5 },
    backpacks: { min: 0, max: 5 },
    rigs: { min: 0, max: 5 },
  });

  const setTierBounds = (key: string, bounds: { min: number; max: number }) =>
    setTierBoundsState((prev) => ({ ...prev, [key]: bounds }));

  return (
    <SettingsContext.Provider
      value={{
        soundEnabled,
        setSoundEnabled,
        instantSpin,
        setInstantSpin,
        tierBounds,
        setTierBounds,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};

export default SettingsContext;
