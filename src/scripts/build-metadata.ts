// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import simpleGit from "simple-git";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// get current commit sha and datetime
// and put them in a json file in /src/sections/data/build-metadata.json

export async function getGitMetadata() {
  const git = simpleGit();
  try {
    const log = await git.log(["-1"]);
    const commitSha = log.latest?.hash || "unknown";
    const commitDate = log.latest?.date || new Date().toISOString();

    return {
      commitSha,
      commitDate,
    };
  } catch (error) {
    console.error("Error fetching git metadata:", error);
    return {
      commitSha: "unknown",
      commitDate: new Date().toISOString(),
    };
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function saveGitMetadata() {
  const metadata = await getGitMetadata();

  const metadataPath = path.join(__dirname, "../data", "build-metadata.json");
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}

// Call this function to save the metadata when the app starts
saveGitMetadata().catch((error) => {
  console.error("Failed to save git metadata:", error);
});
