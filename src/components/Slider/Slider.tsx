import React, { useRef, useCallback } from "react";
import STYLES from "./Slider.module.css";
import { COLORS } from "../../constants";
import { Button } from "../Button";

type SliderProps = {
  startValue?: number;
  steps: number;
  value: number; // 0-based step index
  onChange: (v: number) => void;
  label?: string;
};

const tierColor = (value: number) => {
  // map 0..(n-1) to tier colours roughly (1..6)
  const mapping = [
    COLORS.dfQualityCommon,
    COLORS.dfQualityUncommon,
    COLORS.dfQualityRare,
    COLORS.dfQualityEpic,
    COLORS.dfQualityLegendary,
    COLORS.dfQualityExotic,
  ];
  return mapping[Math.max(0, Math.min(mapping.length - 1, value - 1))];
};

export const Slider: React.FC<SliderProps> = ({
  startValue = 0,
  steps,
  value,
  onChange,
  label,
}) => {
  const minValue = startValue;
  const maxValue = startValue + steps - 1;
  const valueRange = maxValue - minValue;

  const pct = steps > 1 ? ((value - minValue) / valueRange) * 100 : 0;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const pointerToStep = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const pct = x / rect.width;
      const step = minValue + Math.round(pct * (steps - 1));
      return step;
    },
    [steps, minValue]
  );

  const startDrag = (e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLDivElement;
    (target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    const s = pointerToStep(e.clientX);
    onChange(s);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const s = pointerToStep(e.clientX);
    onChange(s);
  };

  const endDrag = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    draggingRef.current = false;
  };

  return (
    <div className={STYLES.Slider}>
      <div className={STYLES.labelRow}>
        <div>{label}</div>
        <div style={{ color: tierColor(value) }}>Tier {value}</div>
      </div>

      <div className={STYLES.trackRow}>
        <Button
          buttonStyle="small"
          onClick={() => onChange(Math.max(minValue, value - 1))}
          aria-label="decrease"
        >
          ◀
        </Button>

        <div style={{ flex: 1 }}>
          <div
            className={STYLES.track}
            ref={trackRef}
            onPointerDown={startDrag}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className={STYLES.steps}>
              {Array.from({ length: steps }).map((_, i) => (
                <div key={i} className={STYLES.stepDot} />
              ))}
            </div>

            <div
              className={STYLES.handle}
              style={{ left: `${pct}%`, background: tierColor(value) }}
            />
          </div>
        </div>

        <Button
          buttonStyle="small"
          onClick={() => onChange(Math.min(maxValue, value + 1))}
          aria-label="increase"
        >
          ▶
        </Button>
      </div>
    </div>
  );
};

export default Slider;
