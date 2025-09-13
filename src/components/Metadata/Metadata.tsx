import metadata from "../../data/build-metadata.json";

import STYLES from "./Metadata.module.css";

export const Metadata = () => (
  <div className={STYLES.metadata}>
    <div
      className={STYLES.gitSha}
      style={{ color: `#${metadata.commitSha.slice(0, 6)}` }}
    >
      {metadata.commitSha.slice(0, 6)}
    </div>
    <div className={STYLES.gitDate}>{metadata.commitDate}</div>
  </div>
);
