import classNames from "classnames";
import STYLES from "./TierIcon.module.css";

type TierIconProps = { tier: 1 | 2 | 3 | 4 | 5 | 6 };

const tierClassMap = {
  1: STYLES.img_levelicon_01,
  2: STYLES.img_levelicon_02,
  3: STYLES.img_levelicon_03,
  4: STYLES.img_levelicon_04,
  5: STYLES.img_levelicon_05,
  6: STYLES.img_levelicon_06,
} as const;

export const TierIcon = ({ tier }: TierIconProps) => {
  return (
    <div className={STYLES.TierIcon}>
      <div className={classNames(STYLES.img, tierClassMap[tier])} />{" "}
    </div>
  );
};
