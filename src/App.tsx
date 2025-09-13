import { useRef, useState } from "react";
import STYLES from "./App.module.css";
import { Button } from "./components/Button";
import { ImageScroller } from "./components/ImageScroller";
import { KoFi } from "./components/KoFi";
import { Metadata } from "./components/Metadata";
import { Slot } from "./components/Slot";
import { TierIcon } from "./components/TierIcon/TierIcon";
import { COLORS } from "./constants";

import * as helmets from "./data/generated/helmets";
import * as vests from "./data/generated/vests";
import * as backpacks from "./data/generated/backpacks";
import * as rigs from "./data/generated/rigs";

const itemArrayFromData = (
  data: Record<string, { image: string; data: { name: string } }>
) =>
  Object.entries(data).map(([key, value]) => ({
    name: value.data.name,
    image: value.image,
  }));

const helmetsArray = itemArrayFromData(helmets);
const vestsArray = itemArrayFromData(vests);
const backpacksArray = itemArrayFromData(backpacks);
const rigsArray = itemArrayFromData(rigs);

function App() {
  const [showButtonTwo, setShowButtonTwo] = useState(false);
  const [showButtonThree, setShowButtonThree] = useState(false);

  const spin = useRef<{ spin: (time: number) => void }>(null);
  const spin2 = useRef<{ spin: (time: number) => void }>(null);
  const spin3 = useRef<{ spin: (time: number) => void }>(null);
  const spin4 = useRef<{ spin: (time: number) => void }>(null);

  return (
    <div className={STYLES.App}>
      <div className={STYLES.testArea}>
        <h1>Hello world</h1>
        <div className={STYLES.row}>
          <Slot></Slot>
          <Slot color={COLORS.dfGreen}>
            <ImageScroller items={helmetsArray} ref={spin} />
          </Slot>
          <Slot color={COLORS.dfQualityRare}>
            <ImageScroller items={vestsArray} ref={spin2} />
          </Slot>
          <Slot color={COLORS.dfQualityEpic}>
            <ImageScroller items={backpacksArray} ref={spin3} />
          </Slot>
          <Slot color={COLORS.dfQualityLegendary}>
            <ImageScroller items={rigsArray} ref={spin4} />
          </Slot>
          <Slot color={COLORS.dfQualityExotic}></Slot>
        </div>
        <div className={STYLES.row}>
          <TierIcon tier={1} />
          <TierIcon tier={2} />
          <TierIcon tier={3} />
          <TierIcon tier={4} />
          <TierIcon tier={5} />
          <TierIcon tier={6} />
        </div>
        <div className={STYLES.row}>
          <Button
            onClick={() => {
              setShowButtonTwo(true);
              spin.current?.spin(5000);
              spin2.current?.spin(6000);
              spin3.current?.spin(7000);
              spin4.current?.spin(8000);
            }}
          >
            Click me
          </Button>
          {showButtonTwo ? (
            <Button onClick={() => setShowButtonThree(true)}>Harder</Button>
          ) : null}
          {showButtonThree ? <Button>Yes like that</Button> : null}
        </div>
      </div>
      <Metadata />
      <KoFi />
    </div>
  );
}

export default App;
