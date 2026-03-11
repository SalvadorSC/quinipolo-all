require("dotenv").config();
const { supabase } = require("../services/supabaseClient");
const fs = require("fs");
const path = require("path");

function escapeCsvValue(val) {
  if (val === null || val === undefined) return "";
  const str = Array.isArray(val) ? JSON.stringify(val) : String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function exportWaterpoloTeams() {
  const { data: teams, error } = await supabase
    .from("teams")
    .select("*")
    .eq("sport", "waterpolo")
    .order("name");

  if (error) {
    console.error("Error fetching teams:", error);
    process.exit(1);
  }

  if (!teams?.length) {
    console.log("No waterpolo teams found.");
    return;
  }

  const cols = Object.keys(teams[0]);
  const header = cols.join(",");
  const rows = teams.map((row) =>
    cols.map((c) => escapeCsvValue(row[c])).join(",")
  );
  const csv = [header, ...rows].join("\n");

  const outPath = path.join(
    __dirname,
    "../../PAST PLANS/waterpolo_teams.csv"
  );
  fs.writeFileSync(outPath, csv, "utf8");
  console.log(`Exported ${teams.length} waterpolo teams to ${outPath}`);
}

exportWaterpoloTeams().catch((err) => {
  console.error(err);
  process.exit(1);
});
