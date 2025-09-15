import { useRef, useState } from "react";
import STYLES from "./App.module.css";
import { Button } from "./components/Button";
import { ImageScroller } from "./components/ImageScroller";
import { KoFi } from "./components/KoFi";
import { Metadata } from "./components/Metadata";
import { Slot } from "./components/Slot";
import { COLORS } from "./constants";
import { SettingsPanel } from "./components/SettingsPanel/SettingsPanel";
import { useDiceRoller } from "./hooks/useDiceRoller";

import type {
  ImageScrollerHandle,
  ScrollerItem,
} from "./components/ImageScroller/ImageScroller";
import useSettings from "./contexts/useSettings";
import {
  maps,
  operators,
  helmets,
  vests,
  backpacks,
  rigs,
  weapons,
} from "./data/generated";
import classnames from "classnames";
import { useStoredState } from "./hooks/useStoredState";
import z from "zod";

const itemArrayFromData = (
  data: Record<
    string,
    {
      image: string;
      icon?: string;
      data: { name: string; tier?: number; type?: string };
    }
  >
) => {
  const array = Object.entries(data).map(([, value]) => ({
    name: value.data.name,
    image: value.image,
    tier: value.data.tier,
    type: value.data.type,
    icon: value.icon,
  }));
  // Shuffle
  // Duplicate items to make array 2x as long, so that it can spin more smoothly
  const shuffled = array.sort(() => Math.random() - 0.5);
  const duplicated = [...shuffled, ...shuffled];
  return duplicated;
};

const operatorsArray = itemArrayFromData(operators);
const mapsArray = itemArrayFromData(maps);
const helmetsArray = itemArrayFromData(helmets);
const vestsArray = itemArrayFromData(vests);
const backpacksArray = itemArrayFromData(backpacks);
const rigsArray = itemArrayFromData(rigs);
const weaponsArray = itemArrayFromData(weapons);

const taglines = [
  "Shoot, loot, and scoot!",
  "It's for the boys (and the gals)",
  "Lock and load",
  "For when you can't decide",
  "Pew pew pew",
  "Risk it for the biscuit",
  "take the W",
];

function App() {
  const [tagLine] = useState(
    taglines[Math.floor(Math.random() * taglines.length)]
  );

  const scrollerRefs = useRef<(ImageScrollerHandle | null)[]>([]);

  type Category = {
    key: string;
    items: { name: string; image: string; tier?: number }[];
    initialColor?: string;
    variant?: "weapon" | "operator";
    selectionFilter?: (item: ScrollerItem) => boolean;
  };

  const { tierBounds, weaponTypeEnabled, mapEnabled, showNudgers } =
    useSettings();
  // dice roller
  const { rollDice, DiceRollerComponent } = useDiceRoller();

  const categories: Category[] = [
    {
      key: "operators",
      items: operatorsArray,
      initialColor: COLORS.dfQualityLegendary,
      variant: "operator",
    },
    {
      key: "maps",
      items: mapsArray,
      initialColor: COLORS.dfQualityEpic,
      selectionFilter: (item) => mapEnabled[item.name],
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
  ];

  const [spinning, setSpinning] = useState<boolean[]>(
    Array(categories.length).fill(false)
  );

  const [locked, setLocked] = useState<boolean[]>(
    Array(categories.length).fill(false)
  );

  const [difficulty, setDifficulty] = useStoredState(
    "difficulty",
    "easy",
    z.string()
  );
  const [budget, setBudget] = useStoredState("budget", "200k", z.string());

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
      if (locked[i]) {
        return;
      }
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
        <div className={STYLES.title}>
          <h1>Shotski's Delta Force Random Loadouts</h1>
          <div className={STYLES.tagLine}>{tagLine}</div>
        </div>

        <div className={classnames(STYLES.row, STYLES.mobileOnly)}>
          {spinning.some(Boolean) ? (
            <Button onClick={stopAll}>Stop all</Button>
          ) : (
            <Button onClick={spinAll}>Shoot, Loot, and Scoot!</Button>
          )}
        </div>
        <div className={classnames(STYLES.row, STYLES.slotRow)}>
          {categories.map((cat, idx) => (
            <div
              className={classnames(STYLES.column, STYLES.slotContainer)}
              key={cat.key}
            >
              <Slot
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
              <div className={STYLES.slotButtonsTop}>
                {showNudgers && (
                  <Button
                    disabled={locked[idx] || spinning[idx]}
                    buttonStyle="small"
                    onClick={() => {
                      scrollerRefs.current[idx]?.nudge(-1);
                    }}
                  >
                    ▲
                  </Button>
                )}
              </div>
              <div className={STYLES.slotButtons}>
                <Button
                  disabled={locked[idx]}
                  buttonStyle="small"
                  onClick={() => {
                    if (spinning[idx]) {
                      scrollerRefs.current[idx]?.stopImmediate();
                    } else {
                      const minSpinTime = 1000;
                      const maxSpinTime = 3000;
                      const spinTime =
                        Math.random() * (maxSpinTime - minSpinTime) +
                        minSpinTime;
                      scrollerRefs.current[idx]?.spin(spinTime);
                    }
                  }}
                >
                  {spinning[idx] ? "stop" : "spin"}
                </Button>
                {showNudgers && (
                  <Button
                    disabled={locked[idx] || spinning[idx]}
                    buttonStyle="small"
                    onClick={() => {
                      scrollerRefs.current[idx]?.nudge(1);
                    }}
                  >
                    ▼
                  </Button>
                )}
                <Button
                  buttonStyle="small"
                  active={locked[idx]}
                  onClick={() => {
                    if (spinning[idx]) {
                      scrollerRefs.current[idx]?.stopImmediate();
                    }
                    if (locked[idx]) {
                      // unlock
                      setLocked((prev) => {
                        const next = prev.slice();
                        next[idx] = false;
                        return next;
                      });
                    } else {
                      // lock
                      setLocked((prev) => {
                        const next = prev.slice();
                        next[idx] = true;
                        return next;
                      });
                    }
                  }}
                >
                  {locked[idx] ? "hold" : "hold"}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className={STYLES.row}>
          {spinning.some(Boolean) ? (
            <Button onClick={stopAll}>Stop all</Button>
          ) : (
            <Button onClick={spinAll}>Spin all!</Button>
          )}
        </div>

        <div className={STYLES.rowWide}>
          <div className={STYLES.diceSection}>
            <h2>Difficulty</h2>
            <div className={STYLES.result}>{difficulty}</div>
            <div className={STYLES.button}>
              <Button
                onClick={async () => {
                  try {
                    const res = await rollDice([
                      "easy",
                      "easy",
                      "easy",
                      "normal",
                      "normal",
                      "normal",
                    ]);
                    setDifficulty(res.toString());
                  } catch {
                    // ignore if not mounted
                  }
                }}
              >
                Roll for difficulty
              </Button>
            </div>
          </div>
          <div className={STYLES.diceSection}>
            <h2>Budget</h2>
            <div className={STYLES.result}>{budget}</div>
            <div className={STYLES.button}>
              <Button
                onClick={async () => {
                  try {
                    const res = await rollDice([
                      "0",
                      "100k",
                      "200k",
                      "300k",
                      "500k",
                      "Unlimited",
                    ]);
                    setBudget(res.toString());
                  } catch {
                    // ignore if not mounted
                  }
                }}
              >
                Roll for budget
              </Button>
            </div>
          </div>
        </div>
        <SettingsPanel />
      </div>
      <Metadata />
      <KoFi />

      {/* Dice UI: render full-viewport canvas and roll button above settings */}
      <div>{DiceRollerComponent()}</div>
    </>
  );
}

export default App;
