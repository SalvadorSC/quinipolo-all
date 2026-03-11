#!/usr/bin/env node
/**
 * Reorganizes team logo images into:
 * - team-shields-curated: images with pixel ratio (e.g. 100x100) AND hex value (e.g. _ffffff)
 * - team-shields-pending: images that don't fit the criteria above
 */

const fs = require("fs");
const path = require("path");

const HEX_SUFFIX = /_[0-9A-Fa-f]{6}$/i;
const PX_SUFFIX = /\d+x\d+/i;

const BE_ROOT = path.join(__dirname, "..");
const TEAMS_LOGOS = path.join(BE_ROOT, "teams_logos");
const TEAMS_LOGOS1 = path.join(BE_ROOT, "teams_logos1");
const CURATED_DIR = path.join(BE_ROOT, "team-shields-curated");
const PENDING_DIR = path.join(BE_ROOT, "team-shields-pending");

function hasPixelRatio(filename) {
  const base = path.basename(filename, path.extname(filename));
  return PX_SUFFIX.test(base);
}

function hasHexValue(filename) {
  const base = path.basename(filename, path.extname(filename));
  return HEX_SUFFIX.test(base);
}

function isCurated(filename) {
  return hasPixelRatio(filename) && hasHexValue(filename);
}

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if ([".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) {
        files.push(full);
      }
    }
  }
  return files;
}

function moveFile(src, destDir) {
  const basename = path.basename(src);
  const dest = path.join(destDir, basename);
  if (fs.existsSync(dest)) {
    console.warn(`  Skipping (exists): ${basename}`);
    return;
  }
  fs.renameSync(src, dest);
}

function main() {
  const allFiles = [...collectFiles(TEAMS_LOGOS), ...collectFiles(TEAMS_LOGOS1)];
  const curated = [];
  const pending = [];

  for (const f of allFiles) {
    if (isCurated(f)) {
      curated.push(f);
    } else {
      pending.push(f);
    }
  }

  fs.mkdirSync(CURATED_DIR, { recursive: true });
  fs.mkdirSync(PENDING_DIR, { recursive: true });

  console.log(`Curated (${curated.length}): pixel ratio + hex`);
  for (const f of curated) {
    moveFile(f, CURATED_DIR);
  }

  console.log(`\nPending (${pending.length}): missing pixel ratio and/or hex`);
  for (const f of pending) {
    moveFile(f, PENDING_DIR);
  }

  console.log(`\nDone. Curated: ${curated.length}, Pending: ${pending.length}`);
}

main();
