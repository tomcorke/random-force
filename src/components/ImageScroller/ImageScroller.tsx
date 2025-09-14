import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useSettings } from "../../contexts/useSettings";
import STYLES from "./ImageScroller.module.css";
import classnames from "classnames";
import { TierIcon } from "../TierIcon/TierIcon";
import useAudio from "../../contexts/useAudio";

export type ScrollerItem = {
  name: string;
  image: string;
  tier?: number;
  type?: string;
};

type ImageScrollerProps = {
  items: ScrollerItem[];
  onIndexChange?: (index: number, item: ScrollerItem) => void;
  onSpinningChange?: (isSpinning: boolean) => void;
  variant?: "weapon" | "operator";
  selectionFilter?: (item: ScrollerItem) => boolean;
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
    selectionFilter,
  }: ImageScrollerProps,
  ref: React.ForwardedRef<ImageScrollerHandle>
) => {
  const imageCount = items.length;
  const isWeapon = variant === "weapon";
  const isOperator = variant === "operator";
  const showResultTier = !isWeapon && !isOperator;
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

  const { instantSpin } = useSettings();

  const { playTick, playDing } = useAudio();

  const getRandomIndex = () => Math.floor(Math.random() * imageCount);

  const getValidRandomIndex = () => {
    if (!selectionFilter) return getRandomIndex();

    const allowed = items.filter((it) => selectionFilter(it));
    if (allowed.length === 0) return getRandomIndex();

    const pick = Math.floor(Math.random() * allowed.length);
    const pickedItem = allowed[pick];
    return items.indexOf(pickedItem);
  };

  const startSpin = (spinDuration: number) => {
    if (isSpinning) return;
    const chosenIndex = getValidRandomIndex();
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
      const steps = ((finalTarget - slowCurrent + imageCount) %
        imageCount) as number;
      const extraCycles = 0; //variant === "weapon" ? 1 : 2;
      const slowSteps = steps + imageCount * extraCycles;
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
    if (onIndexChange) {
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
      className={classnames(
        STYLES.ImageScroller,
        isWeapon && STYLES.weapon,
        isOperator && STYLES.operator
      )}
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
                  isOperator && STYLES.operator,
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
        {showResultTier ? (
          <div className={STYLES.resultTier}>
            <TierIcon tier={toTierUnion(items[index]?.tier)} />
          </div>
        ) : null}
        <div className={STYLES.resultName}>{items[index]?.name}</div>
      </div>
    </div>
  );
};

const ImageScroller = forwardRef<ImageScrollerHandle, ImageScrollerProps>(
  ImageScrollerImpl
);

export { ImageScroller };
