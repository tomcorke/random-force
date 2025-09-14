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
import fs from "fs"; // Node.js file system promises API
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
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Downloads an image from a URL and saves it to the given destination path.
 */
async function downloadImage(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  // Buffer is available in Node.js
  fs.writeFileSync(dest, Buffer.from(arrayBuffer));
}

const copyLocalOrDownloadImage = async (
  propKey: string,
  value: string,
  itemDir: string
) => {
  let imageExport = "";

  let ext = ".png"; // Default extension
  if (value.startsWith("http")) {
    ext = path.extname(new URL(value).pathname) || ".png";
  } else if (value.startsWith("./")) {
    ext = path.extname(value) || ".png";
  }
  const imageFile = `${propKey}${ext}`;
  const imagePath = path.join(itemDir, imageFile);

  if (value.startsWith("./")) {
    // Local file reference
    const localImagePath = path.resolve(RAW_DIR, value);
    if (fs.existsSync(localImagePath)) {
      fs.copyFileSync(localImagePath, imagePath);
      console.log(
        `      Copied local image: ${localImagePath} -> ${imagePath}`
      );
    } else {
      throw Error(`      Local image file does not exist: ${localImagePath}`);
    }
  } else if (value.startsWith("http")) {
    if (!fs.existsSync(imagePath)) {
      console.log(`      Downloading image: ${value} -> ${imagePath}`);
      try {
        await downloadImage(value, imagePath);
        console.log("      Image downloaded successfully.");
      } catch (e) {
        console.error(`      Failed to download image for ${propKey}:`, e);
      }
    }
  } else {
    throw Error("Unsupported image source format: " + value);
  }
  // Export the image using require (for use in TS/JS)
  imageExport = `import ${propKey} from './${imageFile}';`;
  return imageExport;
};

const propertyBehaviours: Record<
  string,
  {
    fn: (
      key: string,
      value: string,
      itemDir: string
    ) => string | Promise<string>;
    key?: string;
  }
> = {
  src: { fn: copyLocalOrDownloadImage, key: "image" },
  icon: { fn: copyLocalOrDownloadImage, key: "icon" },
};

/**
 * Main script logic:
 *  - Reads all JSON files in the raw data directory (each is a category)
 *  - For each item in each file, creates a folder, downloads its image, and generates an index.ts
 *  - Generates index.ts files for each category and for the root generated folder
 */
async function main() {
  console.log("Reading raw data directory:", RAW_DIR);
  const files = fs
    .readdirSync(RAW_DIR)
    .filter((f: string) => f.endsWith(".json"));
  console.log(`Found ${files.length} category file(s):`, files);
  const topLevelGeneratedExports: string[] = [];

  // Process each category (JSON file)
  for (const file of files) {
    const category = path.basename(file, ".json");
    const categoryDir = path.join(GENERATED_DIR, category);
    console.log(`\nProcessing category: ${category}`);
    await ensureDir(categoryDir);
    // Parse all items in the category
    const items = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), "utf8"));
    console.log(`  Found ${items.length} item(s) in category '${category}'.`);
    const categoryExports: string[] = [];

    // Process each item in the category
    for (const [i, item] of items.entries()) {
      if (!item.name) {
        throw Error(
          `Required property "name" is missing for item at index ${i} in category "${category}"`
        );
      }

      const itemName = sanitizeName(item.name);
      const itemDir = path.join(categoryDir, itemName);
      console.log(
        `    [${i + 1}/${items.length}] Processing item: ${item.name}`
      );
      await ensureDir(itemDir);

      const itemExports: Record<string, string> = {};

      itemExports.data = `const data = ${JSON.stringify(item, null, 2)};`;

      for (const [propKey, behaviour] of Object.entries(propertyBehaviours)) {
        if (item[propKey]) {
          itemExports[behaviour.key || propKey] = (await behaviour.fn(
            behaviour.key || propKey,
            item[propKey],
            itemDir
          )) as string;
        }
      }

      const itemIndexFileContents = `${Object.values(itemExports)
        .filter(Boolean)
        .join("\n\n")}

export { ${Object.keys(itemExports).join(", ")} };`;
      fs.writeFileSync(path.join(itemDir, "index.ts"), itemIndexFileContents);
      // Add export for this item to the category index
      categoryExports.push(`export * as ${itemName} from './${itemName}';`);
    }
    // Write the category's index.ts exporting all items
    fs.writeFileSync(
      path.join(categoryDir, "index.ts"),
      categoryExports.join("\n")
    );
    console.log(`  Wrote index.ts for category '${category}'.`);
    // Add export for this category to the root index
    topLevelGeneratedExports.push(
      `export * as ${category} from './${category}';`
    );
  }

  console.log(topLevelGeneratedExports);
  // Write the root generated/index.ts exporting all categories
  fs.writeFileSync(
    path.join(GENERATED_DIR, "index.ts"),
    topLevelGeneratedExports.join("\n")
  );
  console.log("\nAll data components generated successfully.");
}

// Run the script and handle errors
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
