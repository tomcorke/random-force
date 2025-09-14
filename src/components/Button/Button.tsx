import classNames from "classnames";
import STYLES from "./Button.module.css";

type ButtonStyle = "default" | "small";

type ButtonProps = {
  children: string;
  onClick?: () => void;
  buttonStyle?: ButtonStyle;
  disabled?: boolean;
};

export const Button = ({
  children,
  onClick,
  buttonStyle = "default",
  disabled = false,
}: ButtonProps) => {
  return (
    <button
      className={classNames(STYLES.Button, STYLES[buttonStyle], {
        [STYLES.disabled]: disabled,
      })}
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
