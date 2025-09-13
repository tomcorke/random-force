import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import STYLES from "./ImageScroller.module.css";
import classnames from "classnames";

type ScrollerItem = { name: string; image: string };

type ImageScrollerProps = {
  items: ScrollerItem[];
};

export const ImageScroller = forwardRef<
  { spin: (time: number) => void },
  ImageScrollerProps
>(({ items }, ref) => {
  const imageArray = items.map((item) => (
    <div className={STYLES.image} key={item.name}>
      <img src={item.image} />
    </div>
  ));

  const OVERLAP_COUNT = 3;
  const scrollOverlapHead = imageArray.slice(0 - OVERLAP_COUNT);
  const scrollOverlapTail = imageArray.slice(0, OVERLAP_COUNT);
  const imageCount = items.length;
  const IMAGE_SIZE = 200;

  // State for slot machine
  const [isSpinning, setIsSpinning] = useState(false);
  const [index, setIndex] = useState(0); // current index
  const [targetIndex, setTargetIndex] = useState<number | null>(null); // where to stop
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const spinTimeout = useRef<NodeJS.Timeout | null>(null);
  const slowDownTimeout = useRef<NodeJS.Timeout | null>(null);
  const spinInterval = useRef<NodeJS.Timeout | null>(null);
  const [transitionDuration, setTransitionDuration] = useState(0.4); // seconds

  // Helper to get a random index
  const getRandomIndex = () => Math.floor(Math.random() * imageCount);

  // Start spinning
  const startSpin = (spinDuration: number) => {
    if (isSpinning) return;
    const chosenIndex = getRandomIndex();
    setTargetIndex(chosenIndex);
    setIsSpinning(true);

    // Fast spin
    let current = index;
    const speed = 30; // ms per frame
    const interval = speed;
    // const slowDownDuration = 2000; // 2 seconds to slow down

    if (spinInterval.current) clearInterval(spinInterval.current);
    if (spinTimeout.current) clearTimeout(spinTimeout.current);
    if (slowDownTimeout.current) clearTimeout(slowDownTimeout.current);

    // Fast spin interval
    spinInterval.current = setInterval(() => {
      // If wrapping from last to first, disable transition for instant jump
      if (current === imageCount - 1) {
        setIsTransitioning(false);
        setScrollPosition(0);
        current = 0;
        // Next tick, re-enable transition
        setTimeout(() => setIsTransitioning(true), 10);
      } else {
        current = (current + 1) % imageCount;
        setIsTransitioning(true);
        setTransitionDuration(0.4);
        setScrollPosition(-(current * IMAGE_SIZE));
      }
      setIndex(current);
    }, interval);

    // After spinDuration, start slowing down
    spinTimeout.current = setTimeout(() => {
      if (spinInterval.current) clearInterval(spinInterval.current);
      let slowCurrent = current;
      const steps =
        ((targetIndex !== null ? targetIndex : 0) - slowCurrent + imageCount) %
        imageCount;
      const slowSteps = steps + imageCount * 2; // always at least 2 full cycles for drama
      let slowStep = 0;
      let slowInterval = 80;
      slowDownTimeout.current = setInterval(() => {
        // If wrapping from last to first, disable transition for instant jump
        if (slowCurrent === imageCount - 1) {
          setIsTransitioning(false);
          setScrollPosition(0);
          slowCurrent = 0;
          setTimeout(() => setIsTransitioning(true), 10);
        } else {
          slowCurrent = (slowCurrent + 1) % imageCount;
          setIsTransitioning(true);
          // If this is the final step, use a long transition
          if (slowStep === slowSteps - 1) {
            setTransitionDuration(1.5); // 1.5s for overscroll
          } else {
            setTransitionDuration(0.4);
          }
          setScrollPosition(-(slowCurrent * IMAGE_SIZE));
        }
        setIndex(slowCurrent);
        slowStep++;
        // Gradually increase interval for slow-down effect
        if (slowInterval < 300) slowInterval += 10;
        if (slowStep >= slowSteps) {
          if (slowDownTimeout.current) clearInterval(slowDownTimeout.current);
          setIsSpinning(false);
        }
      }, slowInterval);
    }, spinDuration);
  };

  // If not spinning, always show the current index
  useEffect(() => {
    setIsTransitioning(true);
    setScrollPosition(-(index * IMAGE_SIZE));
  }, [index]);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (spinInterval.current) clearInterval(spinInterval.current);
      if (spinTimeout.current) clearTimeout(spinTimeout.current);
      if (slowDownTimeout.current) clearInterval(slowDownTimeout.current);
    };
  }, []);

  // Optional: instantly show a pre-determined item (no spin)
  const showItem = (itemIdx: number) => {
    if (spinInterval.current) clearInterval(spinInterval.current);
    if (spinTimeout.current) clearTimeout(spinTimeout.current);
    if (slowDownTimeout.current) clearInterval(slowDownTimeout.current);
    setIsSpinning(false);
    setTargetIndex(itemIdx);
    setIndex(itemIdx);
    setScrollPosition(-(itemIdx * IMAGE_SIZE));
  };

  // Expose spin method to parent via ref
  useImperativeHandle(ref, () => ({
    spin: (spinDuration: number) => startSpin(spinDuration),
    showItem,
  }));

  const overlapHeadScrollPosition = scrollPosition - OVERLAP_COUNT * IMAGE_SIZE;
  const overlapTailScrollPosition = scrollPosition + imageCount * IMAGE_SIZE;

  return (
    <div
      className={STYLES.ImageScroller}
      // Remove onClick handler for external control
      style={{ cursor: isSpinning ? "not-allowed" : "pointer" }}
    >
      <div
        className={classnames(STYLES.scrollArea, STYLES.scrollOverlapHead)}
        style={{ transform: `translateY(${overlapHeadScrollPosition}px)` }}
      >
        {scrollOverlapHead}
      </div>
      <div
        className={classnames(
          STYLES.scrollArea,
          isTransitioning && STYLES.transition
        )}
        style={{
          transform: `translateY(${scrollPosition}px)`,
          transition: isTransitioning
            ? `transform ${transitionDuration}s cubic-bezier(0, 1.4, 1, 1)`
            : "none",
        }}
      >
        {imageArray}
      </div>
      <div
        className={classnames(STYLES.scrollArea, STYLES.scrollOverlapTail)}
        style={{ transform: `translateY(${overlapTailScrollPosition}px)` }}
      >
        {scrollOverlapTail}
      </div>
    </div>
  );
});
