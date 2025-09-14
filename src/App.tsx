import { useRef, useState } from "react";
import STYLES from "./App.module.css";
import { Button } from "./components/Button";
import { ImageScroller } from "./components/ImageScroller";
import { KoFi } from "./components/KoFi";
import { Metadata } from "./components/Metadata";
import { Slot } from "./components/Slot";
import { COLORS } from "./constants";
import { SettingsProvider } from "./contexts/SettingsContext";
import { SettingsPanel } from "./components/SettingsPanel/SettingsPanel";

import * as helmets from "./data/generated/helmets";
import * as vests from "./data/generated/vests";
import * as backpacks from "./data/generated/backpacks";
import * as rigs from "./data/generated/rigs";
import * as weapons from "./data/generated/weapons";

const itemArrayFromData = (
  data: Record<string, { image: string; data: { name: string; tier?: number } }>
) =>
  Object.entries(data).map(([, value]) => ({
    name: value.data.name,
    image: value.image,
    tier: value.data.tier,
  }));

const helmetsArray = itemArrayFromData(helmets);
const vestsArray = itemArrayFromData(vests);
const backpacksArray = itemArrayFromData(backpacks);
const rigsArray = itemArrayFromData(rigs);

function App() {
  // generic scroller refs (indexed by category)
  type ScrollerHandle = {
    spin: (time: number) => void;
    showItem: (idx: number) => void;
    stopImmediate: () => void;
  };
  const scrollerRefs = useRef<(ScrollerHandle | null)[]>([]);

  // Define categories to render — easy to extend with a new slot
  const weaponsArray = itemArrayFromData(weapons);

  type Category = {
    key: string;
    items: { name: string; image: string; tier?: number }[];
    initialColor?: string;
    variant?: "weapon";
  };

  const categories: Category[] = [
    { key: "helmets", items: helmetsArray, initialColor: COLORS.dfGreen },
    { key: "vests", items: vestsArray, initialColor: COLORS.dfQualityRare },
    {
      key: "backpacks",
      items: backpacksArray,
      initialColor: COLORS.dfQualityEpic,
    },
    { key: "rigs", items: rigsArray, initialColor: COLORS.dfQualityLegendary },
    // weapons are wide images; mark variant so UI can size accordingly
    {
      key: "weapons",
      items: weaponsArray,
      initialColor: COLORS.dfQualityRare,
      variant: "weapon",
    },
  ];

  const [spinning, setSpinning] = useState<boolean[]>(
    Array(categories.length).fill(false)
  );

  const neutral = "#888888";
  const [slotColors, setSlotColors] = useState<string[]>(
    Array(categories.length).fill(neutral)
  );

  const mapTierToColor = (tier?: number) => {
    switch (tier) {
      case 1:
        return COLORS.dfQualityCommon;
      case 2:
        return COLORS.dfQualityUncommon;
      case 3:
        return COLORS.dfQualityRare;
      case 4:
        return COLORS.dfQualityEpic;
      case 5:
        return COLORS.dfQualityLegendary;
      case 6:
        return COLORS.dfQualityExotic;
      default:
        return undefined;
    }
  };

  const handleIndexChange =
    (slotIdx: number) => (_: number, item: { tier?: number }) => {
      setSlotColors((prev) => {
        const next = prev.slice();
        next[slotIdx] = mapTierToColor(item?.tier) ?? next[slotIdx];
        return next;
      });
    };

  const spinAll = () => {
    const minSpinTime = 3000;
    const maxSpinTime = 10000;
    categories.forEach((_, i) => {
      const spinTime =
        Math.random() * (maxSpinTime - minSpinTime) + minSpinTime;
      scrollerRefs.current[i]?.spin(spinTime);
    });
  };

  const stopAll = () => {
    scrollerRefs.current.forEach((r) => r?.stopImmediate());
  };

  const handleSpinningChange = (idx: number) => (isSpinning: boolean) => {
    setSpinning((prev) => {
      const next = prev.slice();
      next[idx] = isSpinning;
      return next;
    });
  };

  return (
    <SettingsProvider>
      <div className={STYLES.App}>
        <h1>Shotski's Random Delta Force Loadout Spinner</h1>
        <div className={STYLES.row}>
          {categories.map((cat, idx) => (
            <Slot
              key={cat.key}
              color={slotColors[idx]}
              label={cat.key}
              variant={cat.variant}
            >
              <ImageScroller
                items={cat.items}
                ref={(el) => {
                  scrollerRefs.current[idx] = el;
                }}
                onIndexChange={handleIndexChange(idx)}
                onSpinningChange={handleSpinningChange(idx)}
                // pass variant so ImageScroller can adapt sizing
                variant={cat.variant}
                tierKey={cat.key}
              />
            </Slot>
          ))}
        </div>
        <div className={STYLES.row}>
          {spinning.some(Boolean) ? (
            <Button onClick={stopAll}>Stop all</Button>
          ) : (
            <Button onClick={spinAll}>Shoot, Loot, and Scoot!</Button>
          )}
        </div>
        <SettingsPanel />
      </div>
      <Metadata />
      <KoFi />
    </SettingsProvider>
  );
}

export default App;
