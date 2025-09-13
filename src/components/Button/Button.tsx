import STYLES from "./Button.module.css";

type ButtonProps = { children: string; onClick?: () => void };

export const Button = ({ children, onClick }: ButtonProps) => {
  return (
    <button className={STYLES.Button} onClick={onClick}>
      {children}
    </button>
  );
};
