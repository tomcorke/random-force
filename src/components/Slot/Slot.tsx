import type { ReactNode } from "react";
import STYLES from "./Slot.module.css";

type SlotProps = {
  children?: ReactNode;
  color?: string;
  label?: string;
  variant?: string;
};

export const Slot = ({ children, color, label, variant }: SlotProps) => {
  const wrapperClass =
    variant === "weapon"
      ? `${STYLES.SlotWrapper} ${STYLES.weapon}`
      : STYLES.SlotWrapper;
  const slotClass =
    variant === "weapon" ? `${STYLES.Slot} ${STYLES.weapon}` : STYLES.Slot;
  return (
    <div className={wrapperClass}>
      {label ? <div className={STYLES.title}>{label}</div> : null}
      <div className={slotClass} style={{ borderColor: color }}>
        {children}
        <div className={STYLES.overlay} />
      </div>
    </div>
  );
};
