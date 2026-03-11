/**
 * Analyzes quinipolos for outliers: participation count and creation→correction delay.
 * Run: node scripts/analyze-quinipolos.js < path/to/quinipolos.json
 *
 * Or paste JSON array into a file and run:
 * node scripts/analyze-quinipolos.js quinipolos.json
 */

const fs = require("fs");

function getData() {
  const path = process.argv[2];
  if (path && fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  }
  // stdin
  return JSON.parse(fs.readFileSync(0, "utf8"));
}

const list = getData();
if (!Array.isArray(list)) {
  console.error("Expected JSON array of quinipolos");
  process.exit(1);
}

const rows = list.map((q) => {
  const creation = q.creation_date ? new Date(q.creation_date) : null;
  const correction = q.correction_date ? new Date(q.correction_date) : null;
  const participants = q.participants_who_answered || [];
  const n = participants.length;
  const delayDays =
    creation && correction
      ? (correction - creation) / (1000 * 60 * 60 * 24)
      : null;

  return {
    id: q.id?.slice(0, 8),
    end_date: q.end_date?.slice(0, 10),
    has_been_corrected: q.has_been_corrected,
    is_deleted: q.is_deleted,
    participants: n,
    correction_delay_days: delayDays != null ? Math.round(delayDays * 10) / 10 : null,
  };
});

console.log("Participation count:\n");
rows.sort((a, b) => a.participants - b.participants);
rows.forEach((r) => {
  const flags = [
    r.is_deleted && "DELETED",
    !r.has_been_corrected && "NOT_CORRECTED",
  ]
    .filter(Boolean)
    .join(" ");
  console.log(`  ${r.participants.toString().padStart(3)}  ${r.id}  ${r.end_date}  ${flags || ""}`);
});

const counts = rows.map((r) => r.participants).filter((n) => n != null);
const minP = Math.min(...counts);
const maxP = Math.max(...counts);
const low = rows.filter((r) => r.participants === minP);
const high = rows.filter((r) => r.participants === maxP);

console.log("\n--- Outliers by participation ---");
console.log("Lowest participation:", minP, "→", low.map((r) => r.id).join(", "));
console.log("Highest participation:", maxP, "→", high.map((r) => r.id).join(", "));

console.log("\nCreation → correction delay (days):\n");
const withDelay = rows.filter((r) => r.correction_delay_days != null);
withDelay.sort((a, b) => (a.correction_delay_days || 0) - (b.correction_delay_days || 0));
withDelay.forEach((r) => {
  const flags = [
    r.is_deleted && "DELETED",
    !r.has_been_corrected && "NOT_CORRECTED",
  ]
    .filter(Boolean)
    .join(" ");
  console.log(
    `  ${String(r.correction_delay_days).padStart(6)} d  ${r.id}  ${r.end_date}  ${flags || ""}`
  );
});

const delays = withDelay.map((r) => r.correction_delay_days);
const minD = Math.min(...delays);
const maxD = Math.max(...delays);
const shortDelay = withDelay.filter((r) => r.correction_delay_days === minD);
const longDelay = withDelay.filter((r) => r.correction_delay_days === maxD);

console.log("\n--- Outliers by correction delay ---");
console.log("Shortest delay (days):", minD, "→", shortDelay.map((r) => r.id).join(", "));
console.log("Longest delay (days):", maxD, "→", longDelay.map((r) => r.id).join(", "));

const noCorrection = rows.filter((r) => r.correction_delay_days == null && r.has_been_corrected === false);
console.log("\n--- No correction date (not corrected / deleted) ---");
noCorrection.forEach((r) => console.log(`  ${r.id}  ${r.end_date}  participants=${r.participants}`));
