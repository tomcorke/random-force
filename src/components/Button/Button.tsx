import classNames from "classnames";
import STYLES from "./Button.module.scss";

type ButtonStyle = "small";

type ButtonProps = {
  children: string;
  onClick?: () => void;
  buttonStyle?: ButtonStyle;
  disabled?: boolean;
  active?: boolean;
};

export const Button = ({
  children,
  onClick,
  buttonStyle,
  disabled = false,
  active = false,
}: ButtonProps) => {
  return (
    <button
      className={classNames(
        STYLES.Button,
        buttonStyle ? STYLES[buttonStyle] : undefined,
        {
          [STYLES.active]: active,
          [STYLES.disabled]: disabled,
        }
      )}
      onClick={() => {
        if (disabled) {
          return;
        }
        onClick?.();
      }}
    >
      {children}
    </button>
  );
};
