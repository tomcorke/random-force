import { useRef, useState } from "react";
import STYLES from "./App.module.css";
import { Button } from "./components/Button";
import { ImageScroller } from "./components/ImageScroller";
import { KoFi } from "./components/KoFi";
import { Metadata } from "./components/Metadata";
import { Slot } from "./components/Slot";
import { COLORS } from "./constants";
import { SettingsPanel } from "./components/SettingsPanel/SettingsPanel";

import * as helmets from "./data/generated/helmets";
import * as vests from "./data/generated/vests";
import * as backpacks from "./data/generated/backpacks";
import * as rigs from "./data/generated/rigs";
import * as weapons from "./data/generated/weapons";
import type { ScrollerItem } from "./components/ImageScroller/ImageScroller";
import useSettings from "./contexts/useSettings";
import { operators } from "./data/generated";

const itemArrayFromData = (
  data: Record<
    string,
    { image: string; data: { name: string; tier?: number; type?: string } }
  >
) => {
  const array = Object.entries(data).map(([, value]) => ({
    name: value.data.name,
    image: value.image,
    tier: value.data.tier,
    type: value.data.type,
  }));
  // Duplicate items to make array 2x as long
  const duplicated = [...array, ...array];
  // Shuffle
  return duplicated.sort(() => Math.random() - 0.5);
};

const operatorsArray = itemArrayFromData(operators);
const helmetsArray = itemArrayFromData(helmets);
const vestsArray = itemArrayFromData(vests);
const backpacksArray = itemArrayFromData(backpacks);
const rigsArray = itemArrayFromData(rigs);
const weaponsArray = itemArrayFromData(weapons);

function App() {
  // generic scroller refs (indexed by category)
  type ScrollerHandle = {
    spin: (time: number) => void;
    showItem: (idx: number) => void;
    stopImmediate: () => void;
  };
  const scrollerRefs = useRef<(ScrollerHandle | null)[]>([]);

  type Category = {
    key: string;
    items: { name: string; image: string; tier?: number }[];
    initialColor?: string;
    variant?: "weapon" | "operator";
    selectionFilter?: (item: ScrollerItem) => boolean;
  };

  const { tierBounds, weaponTypeEnabled } = useSettings();

  const categories: Category[] = [
    {
      key: "operators",
      items: operatorsArray,
      initialColor: COLORS.dfQualityLegendary,
      variant: "operator",
    },
    {
      key: "helmets",
      items: helmetsArray,
      initialColor: COLORS.dfGreen,
      selectionFilter: (item) =>
        item.tier === undefined ||
        (item.tier >= tierBounds.helmets.min &&
          item.tier <= tierBounds.helmets.max),
    },
    {
      key: "vests",
      items: vestsArray,
      initialColor: COLORS.dfQualityRare,
      selectionFilter: (item) =>
        item.tier === undefined ||
        (item.tier >= tierBounds.vests.min &&
          item.tier <= tierBounds.vests.max),
    },
    {
      key: "rigs",
      items: rigsArray,
      initialColor: COLORS.dfQualityLegendary,
      selectionFilter: (item) =>
        item.tier === undefined ||
        (item.tier >= tierBounds.rigs.min && item.tier <= tierBounds.rigs.max),
    },
    {
      key: "backpacks",
      items: backpacksArray,
      initialColor: COLORS.dfQualityEpic,
      selectionFilter: (item) =>
        item.tier === undefined ||
        (item.tier >= tierBounds.backpacks.min &&
          item.tier <= tierBounds.backpacks.max),
    },
    // weapons are wide images; mark variant so UI can size accordingly
    {
      key: "weapons",
      items: weaponsArray,
      initialColor: COLORS.dfQualityRare,
      variant: "weapon",
      selectionFilter: (item) =>
        item.type === undefined ||
        // only show enabled weapon types
        weaponTypeEnabled[item.type],
    },
  ];

  const [spinning, setSpinning] = useState<boolean[]>(
    Array(categories.length).fill(false)
  );

  const neutral = "#888888";
  const [slotColors, setSlotColors] = useState<string[]>(
    Array(categories.length).fill(neutral)
  );

  const indexHandlersRef = useRef<
    Record<number, (index: number, item: { tier?: number }) => void>
  >({});

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

  const handleIndexChange = (slotIdx: number) => {
    if (!indexHandlersRef.current[slotIdx]) {
      indexHandlersRef.current[slotIdx] = (
        _: number,
        item: { tier?: number }
      ) => {
        setSlotColors((prev) => {
          const next = prev.slice();
          next[slotIdx] = mapTierToColor(item?.tier) ?? next[slotIdx];
          return next;
        });
      };
    }
    return indexHandlersRef.current[slotIdx];
  };

  const spinAll = () => {
    const minSpinTime = 1000;
    const maxSpinTime = 5000;
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
    <>
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
                selectionFilter={cat.selectionFilter}
              />
            </Slot>
          ))}
        </div>
        <div className={STYLES.row}>
          {spinning.some(Boolean) ? (
            <Button onClick={stopAll}>
              Let the reels spin, or press to stop now!
            </Button>
          ) : (
            <Button onClick={spinAll}>Shoot, Loot, and Scoot!</Button>
          )}
        </div>
        <SettingsPanel />
      </div>
      <Metadata />
      <KoFi />
    </>
  );
}

export default App;
