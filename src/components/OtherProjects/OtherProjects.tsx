import STYLES from "./OtherProjects.module.css";

export const OtherProjects = () => {
  return (
    <div className={STYLES.OtherProjects}>
      <div className={STYLES.content}>
        <div className={STYLES.title}>Other Projects</div>
        <a
          href="https://dftimers.corke.dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          Delta Force Map Timers: dftimers.corke.dev
        </a>
      </div>
    </div>
  );
};
