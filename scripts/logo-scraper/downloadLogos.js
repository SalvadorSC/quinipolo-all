const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp");
const { fetchTeamLogosFromLeague } = require("./flashscoreLogos");

const TEAMS_LOGOS_DIR = path.join(__dirname, "..", "..", "teams_logos");

/**
 * Sanitizes a team name to create a valid filename
 * Removes "W", "F", and "B" suffixes (women's, female, B teams use same logo)
 * @param {string} teamName - Team name
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(teamName) {
  // Remove "W", "F", or "B" suffix for filename (they use same logo as main team)
  let name = teamName.trim();
  if (name.endsWith(' W') || name.endsWith(' F') || name.endsWith(' B')) {
    name = name.slice(0, -2).trim();
  }
  
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
}

/**
 * Gets image dimensions and metadata
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<{width: number, height: number, format: string}>}
 */
async function getImageInfo(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
    };
  } catch (error) {
    throw new Error(`Failed to get image info: ${error.message}`);
  }
}

/**
 * Checks if an image is square (within tolerance)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} tolerance - Tolerance percentage (default 5%)
 * @returns {boolean}
 */
function isSquare(width, height, tolerance = 0.05) {
  if (width === 0 || height === 0) return false;
  const ratio = Math.min(width, height) / Math.max(width, height);
  return ratio >= (1 - tolerance);
}

/**
 * Calculates a score for logo quality (higher is better)
 * Prioritizes: square logos > larger logos
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} Quality score
 */
function calculateLogoScore(width, height) {
  const area = width * height;
  const squareBonus = isSquare(width, height) ? 10000 : 0;
  return area + squareBonus;
}

/**
 * Determines file extension from URL or content type
 * @param {string} url - Image URL
 * @param {Buffer} buffer - Image buffer
 * @returns {string} File extension (png, jpg, webp, etc.)
 */
function getFileExtension(url, buffer) {
  // Try to get extension from URL
  const urlMatch = url.match(/\.(png|jpg|jpeg|webp|svg|gif)(\?|$)/i);
  if (urlMatch) {
    return urlMatch[1].toLowerCase();
  }

  // Try to detect from buffer (magic numbers)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "png";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "jpg";
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return "webp";
  }

  // Default to png
  return "png";
}

/**
 * Tries to find a larger version of a Flashscore logo URL
 * Flashscore serves the same URL but the actual file might be different sizes
 * Strategy: Check actual dimensions, and if small, the download process will
 * try to find larger versions from match detail pages
 * @param {string} url - Original logo URL
 * @returns {Promise<string[]>} Array of URLs to try (original + potential larger versions)
 */
async function findLargerLogoUrls(url) {
  const urlsToTry = [url];
  
  // Flashscore typically serves the full-size image (100x100) even when displayed small
  // But some logos might actually be 30x30 files
  // We'll check dimensions when downloading and handle replacement there
  
  return urlsToTry;
}

/**
 * Downloads an image from a URL
 * @param {string} url - Image URL
 * @returns {Promise<Buffer>} Image buffer
 */
async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        Referer: "https://www.flashscore.com/",
      },
    });
    return Buffer.from(response.data);
  } catch (error) {
    throw new Error(`Failed to download image from ${url}: ${error.message}`);
  }
}

/**
 * Finds existing logo files for a team (with or without dimensions in name)
 * Also looks for old naming conventions with _W, _F, _B suffixes
 * @param {string} sanitizedName - Sanitized team name (without W/F/B suffix)
 * @returns {Promise<Array<{filename: string, filepath: string, width?: number, height?: number}>>}
 */
async function findExistingLogos(sanitizedName) {
  const existingLogos = [];
  try {
    const files = await fs.readdir(TEAMS_LOGOS_DIR);
    
    // Pattern 1: Current format: TEAMNAME_100x100.png or TEAMNAME.png
    const pattern1 = new RegExp(`^${sanitizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(_\\d+x\\d+)?\\.(png|jpg|jpeg|webp)$`, 'i');
    
    // Pattern 2: Old format with W/F/B suffix: TEAMNAME_W.png, TEAMNAME_F_30x30.png, etc.
    const pattern2 = new RegExp(`^${sanitizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(W|F|B)(_\\d+x\\d+)?\\.(png|jpg|jpeg|webp)$`, 'i');
    
    for (const file of files) {
      if (pattern1.test(file) || pattern2.test(file)) {
        const filepath = path.join(TEAMS_LOGOS_DIR, file);
        try {
          const buffer = await fs.readFile(filepath);
          const info = await getImageInfo(buffer);
          existingLogos.push({
            filename: file,
            filepath,
            width: info.width,
            height: info.height,
          });
        } catch {
          // If we can't read dimensions, still include it
          existingLogos.push({
            filename: file,
            filepath,
          });
        }
      }
    }
  } catch (error) {
    // Directory might not exist or be readable
  }
  return existingLogos;
}

/**
 * Saves a logo image to the teams_logos directory
 * @param {string} teamName - Team name
 * @param {string} logoUrl - Logo URL
 * @param {boolean} overwrite - Whether to overwrite existing files
 * @returns {Promise<{filename: string, status: string, dimensions?: string}>}
 */
async function saveLogo(teamName, logoUrl, overwrite = false) {
  try {
    // Download the image
    const buffer = await downloadImage(logoUrl);
    
    // Get image dimensions
    const imageInfo = await getImageInfo(buffer);
    const { width, height, format } = imageInfo;
    
    // Check if logo is small (< 100x100)
    const isSmall = width < 100 || height < 100;
    const dimensionStr = `${width}x${height}`;
    
    // Determine filename with dimensions
    const sanitizedName = sanitizeFilename(teamName);
    const extension = getFileExtension(logoUrl, buffer);
    const filename = `${sanitizedName}_${dimensionStr}.${extension}`;
    const filepath = path.join(TEAMS_LOGOS_DIR, filename);
    
    // Find existing logos for this team
    const existingLogos = await findExistingLogos(sanitizedName);
    
    // Check if we should replace existing logos
    if (existingLogos.length > 0 && !overwrite) {
      let shouldReplace = false;
      let bestExisting = existingLogos[0];
      let bestExistingScore = calculateLogoScore(
        bestExisting.width || 0,
        bestExisting.height || 0
      );
      
      // Find the best existing logo
      for (const existing of existingLogos) {
        const score = calculateLogoScore(existing.width || 0, existing.height || 0);
        if (score > bestExistingScore) {
          bestExisting = existing;
          bestExistingScore = score;
        }
      }
      
      const newScore = calculateLogoScore(width, height);
      
      // Replace if new logo is better (larger area or more square)
      if (newScore > bestExistingScore) {
        shouldReplace = true;
        // Delete old logos
        for (const existing of existingLogos) {
          try {
            await fs.unlink(existing.filepath);
            console.log(`  🗑️  Deleted old logo: ${existing.filename}`);
          } catch (error) {
            console.warn(`  ⚠️  Could not delete ${existing.filename}: ${error.message}`);
          }
        }
      } else {
        // New logo is not better, skip it
        const status = isSmall ? 'small' : 'exists';
        console.log(`  ⏭️  Skipping ${teamName} (existing logo ${bestExisting.filename} is better)`);
        return { filename: bestExisting.filename, status, dimensions: dimensionStr };
      }
    }
    
    // Ensure directory exists
    try {
      await fs.mkdir(TEAMS_LOGOS_DIR, { recursive: true });
    } catch {
      // Directory might already exist
    }
    
    // Save the file
    await fs.writeFile(filepath, buffer);
    
    const status = isSmall ? 'small' : 'saved';
    const message = isSmall 
      ? `  ⚠️  Saved ${filename} (SMALL: ${dimensionStr} < 100x100)`
      : `  ✅ Saved ${filename} (${dimensionStr})`;
    console.log(message);
    
    return { filename, status, dimensions: dimensionStr };
  } catch (error) {
    console.error(`  ❌ Failed to save logo for ${teamName}: ${error.message}`);
    return { filename: null, status: 'error', error: error.message };
  }
}

/**
 * Fetches and downloads all team logos from a Flashscore league page
 * @param {string} leagueUrl - Flashscore league URL
 * @param {Object} options - Options
 * @param {number} options.maxMatches - Maximum matches to process
 * @param {number} options.concurrency - Concurrent requests
 * @param {boolean} options.overwrite - Overwrite existing files
 * @returns {Promise<Map<string, string>>} Map of team name to saved filename
 */
async function fetchAndDownloadLogos(leagueUrl, options = {}) {
  const { maxMatches = 50, concurrency = 5, overwrite = false } = options;

  console.log(`\n🔍 Fetching team logos from: ${leagueUrl}`);
  console.log(`   Options: maxMatches=${maxMatches}, concurrency=${concurrency}, overwrite=${overwrite}\n`);

  // Step 1: Fetch logo URLs from Flashscore
  const logoUrls = await fetchTeamLogosFromLeague(leagueUrl, {
    maxMatches,
    concurrency,
  });

  if (logoUrls.size === 0) {
    console.log("❌ No logos found");
    return new Map();
  }

  console.log(`\n📥 Downloading ${logoUrls.size} logos...\n`);

  // Step 2: Group logos by team name (handle multiple URLs for same team)
  // Prioritize square and larger logos
  const teamLogoMap = new Map();
  for (const [teamName, logoUrl] of logoUrls.entries()) {
    if (!teamLogoMap.has(teamName)) {
      teamLogoMap.set(teamName, []);
    }
    teamLogoMap.get(teamName).push(logoUrl);
  }
  
  // Step 3: For each team, download all logo URLs and pick the best one
  // Also try to find larger versions of small logos
  const savedLogos = new Map();
  const downloadPromises = [];
  
  for (const [teamName, urls] of teamLogoMap.entries()) {
    const promise = (async () => {
      // Download all URLs for this team
      const logoCandidates = [];
      for (const url of urls) {
        try {
          const buffer = await downloadImage(url);
          const info = await getImageInfo(buffer);
          logoCandidates.push({
            url,
            buffer,
            width: info.width,
            height: info.height,
            score: calculateLogoScore(info.width, info.height),
          });
          
          // Note: Flashscore typically serves full-size images (100x100) even when displayed small
          // If we get a small image (30x30), it means that's the actual file size
          // The download script will handle comparing and replacing with larger versions
          // when processing multiple URLs for the same team
        } catch (error) {
          console.warn(`  ⚠️  Failed to download ${url}: ${error.message}`);
        }
      }
      
      if (logoCandidates.length === 0) {
        return;
      }
      
      // Sort by score (best first) - prioritize square and larger logos
      logoCandidates.sort((a, b) => b.score - a.score);
      
      // Save the best logo
      const bestLogo = logoCandidates[0];
      const result = await saveLogo(teamName, bestLogo.url, overwrite);
      
      if (result.filename) {
        savedLogos.set(teamName, result);
      }
    })();
    
    downloadPromises.push(promise);
  }

  // Process downloads with concurrency control
  for (let i = 0; i < downloadPromises.length; i += concurrency) {
    const batch = downloadPromises.slice(i, i + concurrency);
    await Promise.all(batch);
  }

  console.log(`\n✨ Completed! Saved ${savedLogos.size} logos to ${TEAMS_LOGOS_DIR}\n`);

  return savedLogos;
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Support multiple URLs
  const urls = [];
  let maxMatches = 50;
  let overwrite = false;
  
  for (const arg of args) {
    if (arg === "--overwrite" || arg === "-o") {
      overwrite = true;
    } else if (arg.startsWith("--max=") || arg.startsWith("-m=")) {
      maxMatches = parseInt(arg.split("=")[1]) || 50;
    } else if (arg.startsWith("http")) {
      urls.push(arg);
    } else if (!isNaN(parseInt(arg))) {
      maxMatches = parseInt(arg);
    }
  }
  
  // Default URL if none provided
  if (urls.length === 0) {
    urls.push("https://www.flashscore.com/water-polo/spain/");
  }

  try {
    // Process all URLs
    const allSavedLogos = new Map();
    
    for (const url of urls) {
      console.log(`\n${"=".repeat(70)}`);
      console.log(`Processing: ${url}`);
      console.log(`${"=".repeat(70)}`);
      
      const savedLogos = await fetchAndDownloadLogos(url, {
        maxMatches,
        concurrency: 5,
        overwrite,
      });
      
      // Merge results (newer logos override older ones)
      for (const [teamName, result] of savedLogos.entries()) {
        allSavedLogos.set(teamName, result);
      }
    }
    
    // Print final summary
    if (allSavedLogos.size > 0) {
      console.log("\n📋 Final Summary (all URLs):");
      console.log("=".repeat(70));
      const smallLogos = [];
      const normalLogos = [];
      
      for (const [teamName, result] of allSavedLogos.entries()) {
        if (result.status === 'small') {
          smallLogos.push({ teamName, filename: result.filename, dimensions: result.dimensions });
        } else {
          normalLogos.push({ teamName, filename: result.filename, dimensions: result.dimensions });
        }
      }
      
      if (normalLogos.length > 0) {
        console.log(`\n✅ Normal logos (${normalLogos.length}):`);
        for (const { teamName, filename, dimensions } of normalLogos) {
          console.log(`  ${teamName.padEnd(40)} → ${filename} (${dimensions})`);
        }
      }
      
      if (smallLogos.length > 0) {
        console.log(`\n⚠️  Small logos < 100x100 (${smallLogos.length}):`);
        for (const { teamName, filename, dimensions } of smallLogos) {
          console.log(`  ${teamName.padEnd(40)} → ${filename} (${dimensions})`);
        }
      }
      
      console.log("=".repeat(70));
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  fetchAndDownloadLogos,
  saveLogo,
  downloadImage,
  sanitizeFilename,
};
