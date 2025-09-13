import type { JSX } from "react";
import STYLES from "./Slot.module.css";

type SlotProps = { children?: JSX.Element; color?: string };

export const Slot = ({ children, color }: SlotProps) => {
  return (
    <div className={STYLES.Slot} style={{ borderColor: color }}>
      {children}
    </div>
  );
};
