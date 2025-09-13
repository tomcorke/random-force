// This script generates TypeScript modules for each data item and category from raw JSON files.
// It is intended to be run with ts-node or after compiling with tsc, in a Node.js environment.
//
// For each JSON file in src/data/raw (a "category"), it:
//   - Creates a directory in src/generated for the category
//   - For each item in the JSON:
//       - Creates a subdirectory for the item
//       - Downloads the referenced image (if any) into the item folder
//       - Generates an index.ts that exports the item data and image path
//   - Generates an index.ts in the category folder that exports all items
// - Generates an index.ts in src/generated that exports all categories
import { promises as fs } from "fs"; // Node.js file system promises API
import * as path from "path"; // Node.js path utilities

// __dirname polyfill for ESM (Windows compatible)
// This allows us to resolve paths relative to this script file
const __dirname = path.dirname(
  new URL(import.meta.url).pathname.replace(/^\/[A-Za-z]:/, (m) => m.slice(1))
);

// Directory containing the raw JSON data files
const RAW_DIR = path.resolve(__dirname, "../data/raw");
// Directory where generated TypeScript modules will be written
const GENERATED_DIR = path.resolve(__dirname, "../data/generated");

/**
 * Sanitizes a string to be safe for use as a folder or variable name.
 * Replaces spaces and special characters with underscores.
 */
function sanitizeName(name: string): string {
  // Replace all non-alphanumeric, non-underscore characters with _
  let safe = name.replace(/[^a-zA-Z0-9_]/g, "_");
  // If the name starts with a digit, prefix with _
  if (/^[0-9]/.test(safe)) {
    safe = "_" + safe;
  }
  // Remove consecutive underscores
  safe = safe.replace(/_+/g, "_");
  // Remove trailing underscores
  safe = safe.replace(/_+$/, "");
  return safe;
}

/**
 * Ensures a directory exists, creating it recursively if needed.
 */
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Downloads an image from a URL and saves it to the given destination path.
 */
async function downloadImage(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  // Buffer is available in Node.js
  await fs.writeFile(dest, Buffer.from(arrayBuffer));
}

/**
 * Main script logic:
 *  - Reads all JSON files in the raw data directory (each is a category)
 *  - For each item in each file, creates a folder, downloads its image, and generates an index.ts
 *  - Generates index.ts files for each category and for the root generated folder
 */
async function main() {
  console.log("Reading raw data directory:", RAW_DIR);
  const files = (await fs.readdir(RAW_DIR)).filter((f: string) =>
    f.endsWith(".json")
  );
  console.log(`Found ${files.length} category file(s):`, files);
  const categoryExports: string[] = [];

  // Process each category (JSON file)
  for (const file of files) {
    const category = path.basename(file, ".json");
    const categoryDir = path.join(GENERATED_DIR, category);
    console.log(`\nProcessing category: ${category}`);
    await ensureDir(categoryDir);
    // Parse all items in the category
    const items = JSON.parse(
      await fs.readFile(path.join(RAW_DIR, file), "utf8")
    );
    console.log(`  Found ${items.length} item(s) in category '${category}'.`);
    const itemExports: string[] = [];

    // Process each item in the category
    for (const [i, item] of items.entries()) {
      const itemName = sanitizeName(item.name);
      const itemDir = path.join(categoryDir, itemName);
      console.log(
        `    [${i + 1}/${items.length}] Processing item: ${item.name}`
      );
      await ensureDir(itemDir);
      let imageExport = "";
      // Download the item's image if a src is provided
      if (item.src) {
        const ext = path.extname(new URL(item.src).pathname) || ".png";
        const imageFile = `image${ext}`;
        const imagePath = path.join(itemDir, imageFile);
        console.log(`      Downloading image: ${item.src} -> ${imagePath}`);
        try {
          await downloadImage(item.src, imagePath);
          console.log("      Image downloaded successfully.");
        } catch (e) {
          console.error(`      Failed to download image for ${item.name}:`, e);
        }
        // Export the image using require (for use in TS/JS)
        imageExport = `import image from './${imageFile}';`;
      }
      // Write the item's index.ts file exporting its data and image
      const itemIndex = [
        `const data = ${JSON.stringify(item, null, 2)};`,
        imageExport,
        `export { data${imageExport ? ", image" : ""} };`,
      ]
        .filter(Boolean)
        .join("\n\n");
      await fs.writeFile(path.join(itemDir, "index.ts"), itemIndex);
      // Add export for this item to the category index
      itemExports.push(`export * as ${itemName} from './${itemName}';`);
    }
    // Write the category's index.ts exporting all items
    await fs.writeFile(
      path.join(categoryDir, "index.ts"),
      itemExports.join("\n")
    );
    console.log(`  Wrote index.ts for category '${category}'.`);
    // Add export for this category to the root index
    categoryExports.push(`export * as ${category} from './${category}';`);
  }
  // Write the root generated/index.ts exporting all categories
  await fs.writeFile(
    path.join(GENERATED_DIR, "index.ts"),
    categoryExports.join("\n")
  );
  console.log("\nAll data components generated successfully.");
}

// Run the script and handle errors
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
