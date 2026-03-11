const fs = require("fs").promises;
const path = require("path");
const { chromium } = require("playwright");
const {
  searchAndNavigateToTeam,
  extractLogoFromTeamPage,
} = require("./findLargerLogosViaSearch");
const axios = require("axios");

const OUTPUT_DIR = path.join(__dirname, "..", "..", "team-shields-pending");

const TEAM_SEARCH_ALIASES = {
  Alemania: ["Germany", "Alemania"],
  "Dinamarca/Islandia": ["Denmark", "Dinamarca", "Iceland"],
  "Estrella Roja": ["Crvena Zvezda", "Estrella Roja", "Red Star"],
  "Gran Bretaña F": ["Great Britain", "Gran Bretaña", "Britain"],
  Hungria: ["Hungary", "Hungria"],
  "Paises Bajos": ["Netherlands", "Paises Bajos", "Holland"],
  RUMANIA: ["Romania", "Rumania", "RUMANIA"],
  ESLOVAQUIA: ["Slovakia", "Eslovaquia", "ESLOVAQUIA"],
  ISRAEL: ["Israel", "ISRAEL"],
  Donosti: ["Donosti", "Donostia", "Larraintarrak"],
  Larraina: ["Larraina", "Larraintarrak"],
  "Olimpic Roma": ["Olympic Roma", "Roma Visnova", "Olimpic Roma", "Roma"],
  "Roma Vis Nova": ["Roma Visnova", "Roma Vis Nova"],
  Ortigia: ["Ortigia", "Ortigia Siracusa"],
  Pozuelo: ["Pozuelo", "Pozuelo de Alarcón"],
  UPNA: ["UPNA", "Universidad Pública de Navarra", "Navarra"],
  "UPNA F": ["UPNA", "Universidad Pública de Navarra", "Navarra"],
  "E. Waterpolo Zaragoza F": ["Zaragoza", "E. Waterpolo Zaragoza F"],
  "KVK Radnički Kragujevac M": ["Radnicki", "Radnički Kragujevac"],
  "W.P.C. Dinamo Tblisi M": ["Dinamo Tbilisi", "Dinamo Tblisi", "Georgia"],
};

function getSearchQueries(teamName) {
  const trimmed = teamName.trim();
  const aliases = TEAM_SEARCH_ALIASES[trimmed];
  if (aliases) {
    return aliases;
  }
  return [trimmed];
}

function sanitizeFilename(teamName) {
  return teamName
    .trim()
    .replace(/ñ/gi, "N")
    .replace(/Ñ/g, "N")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

async function downloadAndSaveLogo(teamName, logoUrl, dimensions, outputDir) {
  try {
    const response = await axios.get(logoUrl, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Referer: "https://www.flashscore.com/",
      },
    });

    const buffer = Buffer.from(response.data);
    const sanitizedName = sanitizeFilename(teamName);
    const ext = path.extname(logoUrl).toLowerCase() || ".png";
    const filename = `${sanitizedName}_${dimensions.width}x${dimensions.height}${ext}`;
    const filepath = path.join(outputDir, filename);

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(filepath, buffer);
    return filename;
  } catch (error) {
    console.log(`    ✗ Failed to save: ${error.message}`);
    return null;
  }
}

async function fetchLogoForTeam(page, teamEntry, outputDir, delay = 2000) {
  const teamName = teamEntry.teamName || teamEntry;
  const searchQueries = getSearchQueries(teamName);

  for (const query of searchQueries) {
    const teamUrl = await searchAndNavigateToTeam(page, query);
    if (!teamUrl) {
      await page.waitForTimeout(delay);
      continue;
    }

    const logoInfo = await extractLogoFromTeamPage(page, teamUrl);
    if (logoInfo && logoInfo.url) {
      const dimensions = { width: logoInfo.width || 100, height: logoInfo.height || 100 };
      const filename = await downloadAndSaveLogo(
        teamName,
        logoInfo.url,
        dimensions,
        outputDir
      );
      if (filename) {
        return { teamName, filename, dimensions };
      }
    }
    await page.waitForTimeout(delay);
  }
  return null;
}

async function fetchLogosByTeamList(teamList, options = {}) {
  const {
    outputDir = OUTPUT_DIR,
    delay = 2500,
    headless = true,
    maxTeams = 100,
  } = options;

  const teamsToProcess = teamList.slice(0, maxTeams);
  const results = { found: [], notFound: [] };

  const browser = await chromium.launch({
    headless,
    slowMo: headless ? 0 : 300,
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    for (let i = 0; i < teamsToProcess.length; i++) {
      const entry = teamsToProcess[i];
      const teamName = typeof entry === "string" ? entry : entry.teamName;
      console.log(`\n[${i + 1}/${teamsToProcess.length}] ${teamName}`);

      const result = await fetchLogoForTeam(page, entry, outputDir, delay);
      if (result) {
        results.found.push(result);
        console.log(`    ✅ Saved: ${result.filename}`);
      } else {
        results.notFound.push(teamName);
        console.log(`    ⚠️  Not found`);
      }
    }

    console.log(`\n✨ Summary:`);
    console.log(`   Found: ${results.found.length}`);
    console.log(`   Not found: ${results.notFound.length}`);
    if (results.notFound.length > 0) {
      console.log(`   Missing: ${results.notFound.join(", ")}`);
    }

    return results;
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cliTeamNames = args.filter((a) => !a.startsWith("--"));
  const maxTeams = parseInt(args.find((a) => a.startsWith("--max="))?.split("=")[1]) || 100;
  const headless = !args.includes("--visible");

  const defaultTeamList = [
    { teamName: "Alemania" },
    { teamName: "Alimos F" },
    { teamName: "C.D Ciudad de Rivas F" },
    { teamName: "CS Plebiscito Padova F" },
    { teamName: "CSA Steaua Bucarest M" },
    { teamName: "Dinamarca/Islandia" },
    { teamName: "Donosti " },
    { teamName: "Dunaujvaros F" },
    { teamName: "E. Waterpolo Zaragoza F" },
    { teamName: "Eger F" },
    { teamName: "Ekipe Orizzonte F" },
    { teamName: "ESLOVAQUIA" },
    { teamName: "Estrella Roja" },
    { teamName: "Gran Bretaña F" },
    { teamName: "Hungria" },
    { teamName: "ISRAEL" },
    { teamName: "KVK Radnički Kragujevac M" },
    { teamName: "Larraina" },
    { teamName: "Nancy F" },
    { teamName: "Olimpic Roma" },
    { teamName: "Orizzonte Catania F" },
    { teamName: "Ortigia" },
    { teamName: "Paises Bajos" },
    { teamName: "Pozuelo" },
    { teamName: "Rapallo F" },
    { teamName: "Roma Vis Nova" },
    { teamName: "RUMANIA" },
    { teamName: "Rumania F" },
    { teamName: "SC Quinto M" },
    { teamName: "Telimar Pallanuoto M" },
    { teamName: "UPNA" },
    { teamName: "UPNA F" },
    { teamName: "UVSE F" },
    { teamName: "W.P.C. Dinamo Tblisi M" },
  ];

  const teamList = cliTeamNames.length > 0
    ? cliTeamNames.map((t) => ({ teamName: t }))
    : defaultTeamList;

  try {
    await fetchLogosByTeamList(teamList, {
      maxTeams,
      delay: 2500,
      headless,
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchLogosByTeamList, fetchLogoForTeam };
