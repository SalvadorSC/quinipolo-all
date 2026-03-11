/**
 * Test script to verify tie display in match results graphics.
 * Run: node scripts/test-tie-graphics.js
 * Requires backend to be running on port 3000.
 */

const fs = require("fs");
const path = require("path");
const http = require("http");

const PLACEHOLDER_MATCH = { gameType: "waterpolo", homeTeam: "Team A", awayTeam: "Team B", leagueId: "DHM", isGame15: false };
const PLACEHOLDER_ANSWER = (n) => ({ matchNumber: n, chosenWinner: "Team A", goalsHomeTeam: "10", goalsAwayTeam: "9" });

const quinipolo = [
  { gameType: "waterpolo", homeTeam: "CN Sabadell", awayTeam: "CN Barcelona", leagueId: "DHM", isGame15: false },
  ...Array(14).fill(PLACEHOLDER_MATCH),
].slice(0, 15);

const correct_answers = [
  {
    matchNumber: 1,
    chosenWinner: "CN Sabadell",
    goalsHomeTeam: "18",
    goalsAwayTeam: "17",
    regularGoalsHomeTeam: "14",
    regularGoalsAwayTeam: "14",
  },
  ...Array.from({ length: 14 }, (_, i) => PLACEHOLDER_ANSWER(i + 2)),
].slice(0, 15);

const MOCK_PAYLOAD = {
  _meta: { matchday: "J16" },
  rawBeResponses: {
    correctionSee: { quinipolo, correct_answers },
  },
};

const postData = JSON.stringify({
  correctionSee: MOCK_PAYLOAD.rawBeResponses.correctionSee,
  _meta: MOCK_PAYLOAD._meta,
});

const req = http.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/api/graphics/generate",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      if (res.statusCode !== 200) {
        console.error("Error:", res.statusCode, body);
        process.exit(1);
      }
      const result = JSON.parse(body);
      const images = result?.images || result;
      const image1 = images?.image1;
      if (!image1) {
        console.error("No image1 in response. Keys:", Object.keys(result), "images keys:", result?.images ? Object.keys(result.images) : "n/a");
        process.exit(1);
      }
      const base64 = image1.replace(/^data:image\/png;base64,/, "");
      const outPath = path.join(__dirname, "..", "test-tie-output.png");
      fs.writeFileSync(outPath, Buffer.from(base64, "base64"));
      console.log("Saved:", outPath);
      console.log("Match 1 (CN Sabadell vs CN Barcelona) should show 14-14 with 18-17 tie-breaker below.");
    });
  }
);

req.on("error", (e) => {
  console.error("Request failed:", e.message);
  process.exit(1);
});
req.write(postData);
req.end();
