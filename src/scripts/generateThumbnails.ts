/**
 * Generate missing thumbnails for existing gallery photos.
 * Reads all .jpeg/.webp files in uploads/ and creates thumbnails in uploads/thumbs/
 *
 * Run: npx tsx src/scripts/generateThumbnails.ts
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import dotenv from "dotenv";

dotenv.config();

const UPLOADS_PATH = process.env.UPLOADS_PATH || path.join(process.cwd(), "data", "uploads");
const THUMBS_PATH = path.join(UPLOADS_PATH, "thumbs");

const THUMB_WIDTH = 300;

async function generateThumbnails() {
  // Ensure thumbs directory exists
  if (!fs.existsSync(THUMBS_PATH)) {
    fs.mkdirSync(THUMBS_PATH, { recursive: true });
  }

  const files = fs.readdirSync(UPLOADS_PATH).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return [".jpeg", ".jpg", ".webp", ".png"].includes(ext) && !fs.statSync(path.join(UPLOADS_PATH, f)).isDirectory();
  });

  console.log(`Found ${files.length} images in ${UPLOADS_PATH}`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const thumbPath = path.join(THUMBS_PATH, file);
    if (fs.existsSync(thumbPath)) {
      skipped++;
      continue;
    }

    try {
      const srcPath = path.join(UPLOADS_PATH, file);
      await sharp(srcPath)
        .resize(THUMB_WIDTH, THUMB_WIDTH, { fit: "cover", position: "center" })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);
      created++;
      console.log(`  ✓ ${file}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${file}: ${err}`);
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped, ${failed} failed`);
}

generateThumbnails().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
