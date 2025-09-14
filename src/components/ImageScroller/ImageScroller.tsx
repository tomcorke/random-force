import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useSettings } from "../../contexts/SettingsContext";
import STYLES from "./ImageScroller.module.css";
import classnames from "classnames";
import { TierIcon } from "../TierIcon/TierIcon";

type ScrollerItem = { name: string; image: string; tier?: number };

type ImageScrollerProps = {
  items: ScrollerItem[];
  onIndexChange?: (index: number, item: ScrollerItem) => void;
  onSpinningChange?: (isSpinning: boolean) => void;
  variant?: "weapon";
  tierKey?: string;
};

type ImageScrollerHandle = {
  spin: (time: number) => void;
  showItem: (idx: number) => void;
  stopImmediate: () => void;
};

const ImageScrollerImpl = (
  {
    items,
    onIndexChange,
    onSpinningChange,
    variant,
    tierKey,
  }: ImageScrollerProps,
  ref: React.ForwardedRef<ImageScrollerHandle>
) => {
  const imageCount = items.length;
  const isWeapon = variant === "weapon";
  const IMAGE_SIZE = isWeapon ? 200 : 200;
  const angleStep = 8; // degrees per item on the wheel
  const spacing = IMAGE_SIZE + 10; // outer size includes padding

  const [isSpinning, setIsSpinning] = useState(false);
  const [index, setIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [showResult, setShowResult] = useState(false);

  const spinTimeout = useRef<number | null>(null);
  const slowDownTimeout = useRef<number | null>(null);
  const spinInterval = useRef<number | null>(null);

  // Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const ensureAudio = async () => {
    if (!audioCtxRef.current) {
      const win = window as unknown as {
        webkitAudioContext?: unknown;
        AudioContext?: unknown;
      };
      const ctor = (win.AudioContext ||
        win.webkitAudioContext) as unknown as new (
        ...args: unknown[]
      ) => AudioContext;
      audioCtxRef.current = new ctor();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = 0.05;
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended")
      await audioCtxRef.current.resume();
  };

  const { soundEnabled, instantSpin } = useSettings();

  const settings = useSettings();
  const boundsForKey = tierKey ? settings.tierBounds?.[tierKey] : undefined;

  const playTick = async () => {
    if (!soundEnabled) return;
    try {
      await ensureAudio();
      const ctx = audioCtxRef.current!;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      g.connect(masterGainRef.current!);

      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 1000 + Math.random() * 300;
      osc.connect(g);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);

      setTimeout(() => {
        try {
          osc.disconnect();
          g.disconnect();
        } catch {
          /* ignore */
        }
      }, 200);
    } catch {
      // ignore audio errors
    }
  };

  const playDing = async () => {
    if (!soundEnabled) return;
    try {
      await ensureAudio();
      const ctx = audioCtxRef.current!;
      const master = masterGainRef.current!;

      // small bell: two sine oscillators with quick exponential decay
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.8, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      g.connect(master);

      const o1 = ctx.createOscillator();
      o1.type = "sine";
      o1.frequency.value = 880; // fundamental
      const o2 = ctx.createOscillator();
      o2.type = "sine";
      o2.frequency.value = 1320; // octave-ish overtone

      o1.connect(g);
      o2.connect(g);
      o1.start();
      o2.start();
      o1.stop(ctx.currentTime + 1.1);
      o2.stop(ctx.currentTime + 1.1);

      setTimeout(() => {
        try {
          o1.disconnect();
          o2.disconnect();
          g.disconnect();
        } catch {
          /* ignore */
        }
      }, 1500);
    } catch {
      // ignore audio errors
    }
  };

  const getRandomIndex = () => Math.floor(Math.random() * imageCount);

  // pick a random index from items whose tier is within bounds (if tierKey provided)
  const getRandomIndexWithinBounds = () => {
    if (!boundsForKey) return getRandomIndex();
    const allowed = items
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => {
        const t = Math.max(1, Math.min(6, Math.floor(it.tier ?? 1)));
        const zeroBased = t - 1;
        return zeroBased >= boundsForKey.min && zeroBased <= boundsForKey.max;
      });
    if (allowed.length === 0) return getRandomIndex();
    const pick = Math.floor(Math.random() * allowed.length);
    return allowed[pick].idx;
  };

  const startSpin = (spinDuration: number) => {
    if (isSpinning) return;
    const chosenIndex = getRandomIndexWithinBounds();
    setTargetIndex(chosenIndex);
    // hide any previous result while spinning
    setShowResult(false);

    let current = index;
    const speed = 30; // ms per frame

    if (spinInterval.current)
      window.clearInterval(spinInterval.current as number);
    if (spinTimeout.current) window.clearTimeout(spinTimeout.current as number);
    if (slowDownTimeout.current)
      window.clearInterval(slowDownTimeout.current as number);

    // If instantSpin is enabled, skip animation and jump to the final index immediately
    if (instantSpin) {
      setIndex(chosenIndex);
      setTargetIndex(null);
      setIsSpinning(false);
      // do not notify parent that a spin started (instant)
      playDing();
      setShowResult(true);
      return;
    }

    // animated spin: notify parent and set spinning state
    setIsSpinning(true);
    if (typeof onSpinningChange === "function") onSpinningChange(true);

    spinInterval.current = window.setInterval(() => {
      if (current === imageCount - 1) {
        setIsTransitioning(false);
        current = 0;
        setIndex(current);
        playTick();
        setTimeout(() => setIsTransitioning(true), 10);
      } else {
        current = (current + 1) % imageCount;
        setIsTransitioning(true);
        setIndex(current);
        playTick();
      }
    }, speed);

  const finalTarget = chosenIndex;
  spinTimeout.current = window.setTimeout(() => {
      if (spinInterval.current)
        window.clearInterval(spinInterval.current as number);
      let slowCurrent = current;
  const steps = ((finalTarget - slowCurrent + imageCount) % imageCount) as number;
      const slowSteps = steps + imageCount * 2; // extra cycles
      let slowStep = 0;
      let slowInterval = 80;
      slowDownTimeout.current = window.setInterval(() => {
        if (slowCurrent === imageCount - 1) {
          setIsTransitioning(false);
          slowCurrent = 0;
          setIndex(slowCurrent);
          playTick();
          setTimeout(() => setIsTransitioning(true), 10);
        } else {
          slowCurrent = (slowCurrent + 1) % imageCount;
          setIsTransitioning(true);
          setIndex(slowCurrent);
          playTick();
        }
        slowStep++;
        if (slowInterval < 300) slowInterval += 10;
        if (slowStep >= slowSteps) {
          if (slowDownTimeout.current)
            window.clearInterval(slowDownTimeout.current as number);
          // play a ding when the wheel finishes
          playDing();
          setIsSpinning(false);
          if (typeof onSpinningChange === "function") onSpinningChange(false);
          // show the result overlay briefly
          setShowResult(true);
        }
      }, slowInterval as number);
    }, spinDuration as number);
  };

  useEffect(() => {
    setIsTransitioning(true);
    if (typeof onIndexChange === "function") {
      const cur = items[index];
      if (cur) onIndexChange(index, cur);
    }
  }, [index, items, onIndexChange]);

  const itemTransform = (itemIdx: number) => {
    let offset = (itemIdx - index + imageCount) % imageCount;
    if (offset > imageCount / 2) offset -= imageCount;

    const rotateX = offset * angleStep;
    const translateY = offset * spacing;
    const translateZ = -Math.abs(offset) * 4;

    return `translateY(${translateY}px) rotateX(${rotateX}deg) translateZ(${translateZ}px)`;
  };

  // Convert numeric tier to the TierIcon expected union type (1..6)
  const toTierUnion = (n?: number) => {
    const t = Math.max(1, Math.min(6, Math.floor(n ?? 1)));
    return t as 1 | 2 | 3 | 4 | 5 | 6;
  };

  useEffect(() => {
    return () => {
      if (spinInterval.current)
        window.clearInterval(spinInterval.current as number);
      if (spinTimeout.current)
        window.clearTimeout(spinTimeout.current as number);
      if (slowDownTimeout.current)
        window.clearInterval(slowDownTimeout.current as number);
    };
  }, []);

  const showItem = (itemIdx: number) => {
    if (spinInterval.current)
      window.clearInterval(spinInterval.current as number);
    if (spinTimeout.current) window.clearTimeout(spinTimeout.current as number);
    if (slowDownTimeout.current)
      window.clearInterval(slowDownTimeout.current as number);
    setIsSpinning(false);
    if (typeof onSpinningChange === "function") onSpinningChange(false);
    setTargetIndex(itemIdx);
    setIndex(itemIdx);
    // small bell to signal the manual selection
    playDing();
    setShowResult(true);
  };

  const stopImmediate = () => {
    // clear any running timers/intervals
    if (spinInterval.current)
      window.clearInterval(spinInterval.current as number);
    if (spinTimeout.current) window.clearTimeout(spinTimeout.current as number);
    if (slowDownTimeout.current)
      window.clearInterval(slowDownTimeout.current as number);

    // jump to the target index if set, otherwise keep current
    const finalIdx = targetIndex !== null ? targetIndex : index;
    setIndex(finalIdx);
    setTargetIndex(null);
    setIsSpinning(false);
    if (typeof onSpinningChange === "function") onSpinningChange(false);
    // notify parent of index change
    if (typeof onIndexChange === "function")
      onIndexChange(finalIdx, items[finalIdx]);
    // play ding and show result
    playDing();
    setShowResult(true);
  };

  useImperativeHandle(ref, () => ({
    spin: (spinDuration: number) => startSpin(spinDuration),
    showItem,
    stopImmediate,
  }));

  return (
    <div
      className={classnames(STYLES.ImageScroller, isWeapon && STYLES.weapon)}
      style={{ cursor: isSpinning ? "not-allowed" : "pointer" }}
    >
      <div className={STYLES.scrollerWindow}>
        <div className={STYLES.itemsLayer}>
          {items.map((item, idx) => {
            const offset = (idx - index + imageCount) % imageCount;
            const normalizedOffset =
              offset > imageCount / 2 ? offset - imageCount : offset;
            const transform = itemTransform(idx);
            const isCenter = idx === index;
            return (
              <div
                key={item.name}
                className={classnames(
                  STYLES.image,
                  isWeapon && STYLES.weapon,
                  isCenter && STYLES.highlight,
                  isTransitioning && STYLES.transition
                )}
                style={{ transform, zIndex: 1000 - Math.abs(normalizedOffset) }}
                data-idx={idx}
              >
                <img src={item.image} />
              </div>
            );
          })}
        </div>
      </div>
      <div
        className={classnames(STYLES.resultOverlay, showResult && STYLES.show)}
      >
        <div className={STYLES.resultTier}>
          <TierIcon tier={toTierUnion(items[index]?.tier)} />
        </div>
        <div className={STYLES.resultName}>{items[index]?.name}</div>
      </div>
    </div>
  );
};

const ImageScroller = forwardRef<ImageScrollerHandle, ImageScrollerProps>(
  ImageScrollerImpl
);

export { ImageScroller };
