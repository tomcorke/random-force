import React, { useRef, useCallback } from "react";
import STYLES from "./Slider.module.css";
import { COLORS } from "../../constants";

type SliderProps = {
  steps: number;
  value: number; // 0-based step index
  onChange: (v: number) => void;
  label?: string;
};

const tierColor = (step: number) => {
  // map 0..(n-1) to tier colours roughly (1..6)
  const mapping = [
    COLORS.dfQualityCommon,
    COLORS.dfQualityUncommon,
    COLORS.dfQualityRare,
    COLORS.dfQualityEpic,
    COLORS.dfQualityLegendary,
    COLORS.dfQualityExotic,
  ];
  return mapping[Math.max(0, Math.min(mapping.length - 1, step))];
};

export const Slider: React.FC<SliderProps> = ({
  steps,
  value,
  onChange,
  label,
}) => {
  const pct = steps > 1 ? (value / (steps - 1)) * 100 : 0;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const pointerToStep = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const pct = x / rect.width;
      const step = Math.round(pct * (steps - 1));
      return step;
    },
    [steps]
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
        <div style={{ color: tierColor(value) }}>Tier {value + 1}</div>
      </div>

      <div className={STYLES.trackRow}>
        <button
          className={STYLES.btn}
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label="decrease"
        >
          ◀
        </button>

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

        <button
          className={STYLES.btn}
          onClick={() => onChange(Math.min(steps - 1, value + 1))}
          aria-label="increase"
        >
          ▶
        </button>
      </div>
    </div>
  );
};

export default Slider;
