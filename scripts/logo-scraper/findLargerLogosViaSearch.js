const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');
const sharp = require('sharp');
const axios = require('axios');

const TEAMS_LOGOS_DIR = path.join(__dirname, '..', '..', 'teams_logos');
const FLASHSCORE_BASE = 'https://www.flashscore.com';

/**
 * Gets all teams with small logos (< 100x100)
 */
async function getTeamsWithSmallLogos() {
  // Export for testing
  if (typeof module !== 'undefined') {
    module.exports.getTeamsWithSmallLogos = getTeamsWithSmallLogos;
  }
  const teams = [];
  try {
    const files = await fs.readdir(TEAMS_LOGOS_DIR);
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) continue;
      
      const filepath = path.join(TEAMS_LOGOS_DIR, file);
      try {
        const buffer = await fs.readFile(filepath);
        const metadata = await sharp(buffer).metadata();
        
        if (metadata.width < 100 || metadata.height < 100) {
          // Extract team name from filename
          // Remove dimensions and extension: TEAMNAME_30x30.png -> TEAMNAME
          let teamName = path.basename(file, ext);
          teamName = teamName.replace(/_\d+x\d+$/, ''); // Remove _30x30
          teamName = teamName.replace(/_(W|F|B)$/, ''); // Remove _W, _F, _B
          
          teams.push({
            name: teamName,
            filename: file,
            currentWidth: metadata.width,
            currentHeight: metadata.height,
          });
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  } catch (error) {
    console.error('Error reading logos directory:', error.message);
  }
  
  return teams;
}

/**
 * Searches for a team on Flashscore and navigates to team page
 * @param {object} page - Playwright page object
 * @param {string} teamName - Team name to search for
 * @returns {Promise<string|null>} Team page URL or null if not found
 */
async function searchAndNavigateToTeam(page, teamName) {
  try {
    // Navigate to Flashscore homepage
    await page.goto(FLASHSCORE_BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Dismiss cookie banner if present
    try {
      const cookieAccept = page.locator('button:has-text("Accept"), button:has-text("I accept"), [id*="onetrust"], [id*="cookie"]').first();
      if (await cookieAccept.count() > 0) {
        await cookieAccept.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Ignore cookie banner errors
    }
    
    // Try multiple ways to find and click search icon
    let searchClicked = false;
    const searchSelectors = [
      '.searchIcon',
      '[data-testid="wcl-icon-action-icon-search"]',
      'svg[data-testid="wcl-icon-action-icon-search"]',
      '.header__icon--search',
      'svg.action-icon-search',
    ];
    
    for (const selector of searchSelectors) {
      try {
        const searchIcon = page.locator(selector).first();
        if (await searchIcon.count() > 0) {
          await searchIcon.click({ timeout: 5000 });
          await page.waitForTimeout(1500);
          searchClicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!searchClicked) {
      console.log(`    ⚠️  Could not click search icon`);
      return null;
    }
    
    // Select "Water polo" from sport dropdown BEFORE typing search
    try {
      const sportDropdown = page.locator('button[data-testid="wcl-selectButton"].searchInput__sportDropdown, button.searchInput__sportDropdown').first();
      if (await sportDropdown.count() > 0) {
        const currentSport = await sportDropdown.locator('div').first().textContent().catch(() => '');
        console.log(`    Current sport filter: "${currentSport}"`);
        
        if (!currentSport.toLowerCase().includes('water polo')) {
          await sportDropdown.click({ timeout: 5000 });
          await page.waitForTimeout(1000);
          
          // Wait for dropdown to open
          await page.waitForSelector('[data-testid="wcl-selectListItem"], div[role="option"]', { timeout: 3000 }).catch(() => {});
          
          // Look for "Water polo" option - try multiple methods
          let waterPoloSelected = false;
          
          // Method 1: By data-testid with text filter
          const waterPoloOption = page.locator('[data-testid="wcl-selectListItem"]').filter({ hasText: /water polo/i }).first();
          if (await waterPoloOption.count() > 0) {
            try {
              // Scroll into view first
              await waterPoloOption.scrollIntoViewIfNeeded();
              await page.waitForTimeout(300);
              
              // Click using JavaScript to ensure it works
              await waterPoloOption.evaluate((el) => {
                el.scrollIntoView({ behavior: 'instant', block: 'center' });
                el.click();
              });
              
              // Wait for dropdown to close (check for data-state="closed" or wait for element to disappear)
              await page.waitForTimeout(1000);
              
              // Wait for dropdown to be closed
              await page.waitForFunction(
                () => {
                  const dropdown = document.querySelector('button.searchInput__sportDropdown');
                  if (!dropdown) return false;
                  return dropdown.getAttribute('data-state') === 'closed' || 
                         dropdown.getAttribute('aria-expanded') === 'false';
                },
                { timeout: 3000 }
              ).catch(() => {});
              
              await page.waitForTimeout(500);
              waterPoloSelected = true;
              console.log(`    ✓ Clicked "Water polo" option`);
            } catch (e) {
              console.log(`    ⚠️  Click failed: ${e.message}`);
            }
          }
          
          // Verify the filter was applied by checking the dropdown text
          if (waterPoloSelected) {
            await page.waitForTimeout(1000);
            // Re-find the dropdown as it might have been re-rendered
            const sportDropdownAfter = page.locator('button[data-testid="wcl-selectButton"].searchInput__sportDropdown, button.searchInput__sportDropdown').first();
            const currentSportAfter = await sportDropdownAfter.locator('div').first().textContent().catch(() => '');
            if (currentSportAfter && currentSportAfter.toLowerCase().includes('water polo')) {
              console.log(`    ✓ Verified sport filter is set to: "${currentSportAfter}"`);
            } else {
              console.log(`    ⚠️  Sport filter shows: "${currentSportAfter || '(empty)'}" (expected "Water polo")`);
              // Don't reset - maybe the UI just doesn't show it but filter is applied
            }
          }
          
          if (!waterPoloSelected) {
            console.log(`    ⚠️  Could not select "Water polo" from dropdown`);
          }
        } else {
          console.log(`    ✓ Sport already set to "Water polo"`);
        }
      }
    } catch (e) {
      console.log(`    ⚠️  Could not select sport dropdown: ${e.message}`);
      // Continue anyway
    }
    
    // Wait a bit after dropdown selection for UI to stabilize
    await page.waitForTimeout(1000);
    
    // Check if search input is visible, if not, click search icon again
    const searchInputSelectors = [
      'input.searchInput__input',
      'input[placeholder*="Type your search"]',
      'input[placeholder*="search" i]',
      'input[maxlength="30"]',
    ];
    
    // Find search input first
    let searchInput = null;
    let inputVisible = false;
    
    for (const selector of searchInputSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.count() > 0) {
          const isVisible = await input.isVisible().catch(() => false);
          if (isVisible) {
            await input.waitFor({ state: 'visible', timeout: 2000 });
            searchInput = input;
            inputVisible = true;
            break;
          }
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    // If input not visible, try clicking search icon again
    if (!inputVisible) {
      try {
        const searchIcon = await page.locator('.searchIcon, [data-testid="wcl-icon-action-icon-search"]').first();
        if (await searchIcon.count() > 0) {
          await searchIcon.click({ timeout: 3000 });
          await page.waitForTimeout(1000);
          
          // Try finding input again
          for (const selector of searchInputSelectors) {
            try {
              const input = page.locator(selector).first();
              if (await input.count() > 0) {
                await input.waitFor({ state: 'visible', timeout: 3000 });
                searchInput = input;
                inputVisible = true;
                break;
              }
            } catch (e) {
              // Try next selector
            }
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    
    if (!searchInput) {
      console.log(`    ⚠️  Search input not found after sport selection`);
      return null;
    }
    
    // Normalize team name for search (convert BARCELONA -> Barcelona)
    const normalizedTeamName = teamName
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Since we've already filtered by "Water polo" sport, just search team names
    // Try multiple variations: simple name, with "CN" prefix
    const searchQueries = [
      normalizedTeamName,
      `CN ${normalizedTeamName}`,
    ];
    
    let foundTeam = null;
    
    for (const query of searchQueries) {
      try {
        console.log(`    🔍 Trying search: "${query}"`);
        // Clear and type new query
        await searchInput.fill('');
        await searchInput.type(query, { delay: 100 });
        
        // Wait for search results to appear
        await page.waitForTimeout(2000);
        
        // Check if we have water polo results
        const searchResults = await page.locator('a.searchResult').all();
        
        // Debug: show all results to see what we're getting
        const debugResults = [];
        const waterPoloResults = [];
        
        for (let i = 0; i < Math.min(searchResults.length, 10); i++) {
          try {
            const name = await searchResults[i].locator('.searchResult__participantName').textContent().catch(() => null);
            const category = await searchResults[i].locator('.searchResult__participantCategory').textContent().catch(() => null);
            if (name) {
              debugResults.push({ name, category: category || 'N/A' });
              if (category && (category.toLowerCase().includes('water polo') || category.toLowerCase().includes('waterpolo'))) {
                waterPoloResults.push({ name, category });
              }
            }
          } catch (e) {}
        }
        
        if (waterPoloResults.length > 0) {
          console.log(`      💧 Found ${waterPoloResults.length} water polo results: ${waterPoloResults.map(r => r.name).join(', ')}`);
        } else if (debugResults.length > 0 && debugResults.length <= 5) {
          console.log(`      Results: ${debugResults.map(r => `${r.name} (${r.category})`).join(', ')}`);
        }
        
        for (const result of searchResults) {
          try {
            const participantName = await result.locator('.searchResult__participantName').textContent();
            const participantCategory = await result.locator('.searchResult__participantCategory').textContent();
            
            // Since we filtered by sport, all results should be water polo, but double-check
            if (participantCategory && 
                (participantCategory.toLowerCase().includes('water polo') || 
                 participantCategory.toLowerCase().includes('waterpolo'))) {
              
              // Check name match
              const normalizedSearchName = teamName.replace(/_/g, ' ').toLowerCase();
              const normalizedParticipantName = participantName.toLowerCase();
              
              const searchWords = normalizedSearchName.split(/\s+/).filter(w => w.length > 2);
              const participantWords = normalizedParticipantName.split(/\s+/).filter(w => w.length > 2);
              const matchingWords = searchWords.filter(word => 
                participantWords.some(pword => pword.includes(word) || word.includes(pword))
              );
              
              if (matchingWords.length > 0 || normalizedParticipantName.includes(normalizedSearchName.substring(0, Math.min(normalizedSearchName.length, 8)))) {
                const href = await result.getAttribute('href');
                if (href) {
                  const teamUrl = href.startsWith('http') ? href : `${FLASHSCORE_BASE}${href}`;
                  console.log(`    ✓ Found: ${participantName} (${participantCategory})`);
                  foundTeam = teamUrl;
                  break;
                }
              }
            }
          } catch (e) {
            // Continue
          }
        }
        
        if (foundTeam) break;
      } catch (e) {
        console.log(`    ⚠️  Search query failed: ${e.message}`);
        // Try next query
      }
    }
    
    if (foundTeam) {
      return foundTeam;
    }
    
    // Fallback: show what we found
    await page.waitForTimeout(1000);
    
    // Look for search results with water polo category
    try {
      await page.waitForSelector('a.searchResult', { timeout: 5000 });
    } catch (e) {
      console.log(`    ⚠️  Search results didn't appear, checking page content...`);
      // Take a screenshot for debugging
      const html = await page.content();
      const hasSearchResult = html.includes('searchResult');
      console.log(`    Page contains 'searchResult': ${hasSearchResult}`);
    }
    
    const searchResults = await page.locator('a.searchResult').all();
    console.log(`    Found ${searchResults.length} search results`);
    
    if (searchResults.length === 0) {
      // Try alternative selectors
      const altResults = await page.locator('[class*="searchResult"], [class*="SearchResult"]').all();
      console.log(`    Found ${altResults.length} results with alternative selector`);
      if (altResults.length > 0) {
        return null; // Can't parse, skip
      }
    }
    
    // Normalize team name for matching (remove underscores, convert to readable format)
    const normalizedSearchName = teamName.replace(/_/g, ' ').toLowerCase();
    
    // Debug: log first few results to see what we're getting
    const debugResults = [];
    const allResults = [];
    
    for (let i = 0; i < Math.min(searchResults.length, 10); i++) {
      const result = searchResults[i];
      try {
        const participantName = await result.locator('.searchResult__participantName').textContent().catch(() => null);
        const participantCategory = await result.locator('.searchResult__participantCategory').textContent().catch(() => null);
        
        if (participantName) {
          allResults.push({ name: participantName, category: participantCategory || 'N/A' });
        } else if (i < 3) {
          // Debug first 3 if name not found
          const resultText = await result.textContent().catch(() => '');
          console.log(`    🔍 Result ${i + 1} text: ${resultText.substring(0, 100)}`);
        }
        
        if (!participantName || !participantCategory) continue;
        
        const normalizedParticipantName = participantName.toLowerCase();
        const normalizedCategory = participantCategory.toLowerCase();
        
        // Debug: collect water polo results
        if (normalizedCategory.includes('water polo') || normalizedCategory.includes('waterpolo')) {
          if (debugResults.length < 5) {
            debugResults.push({ name: participantName, category: participantCategory });
          }
        }
        
        // Check if it's a water polo team
        if (!normalizedCategory.includes('water polo') && !normalizedCategory.includes('waterpolo')) {
          continue;
        }
        
        // Check if name matches (fuzzy match - check if either contains the other)
        const searchWords = normalizedSearchName.split(/\s+/).filter(w => w.length > 2);
        const participantWords = normalizedParticipantName.split(/\s+/).filter(w => w.length > 2);
        
        // Check if significant words match
        const matchingWords = searchWords.filter(word => 
          participantWords.some(pword => pword.includes(word) || word.includes(pword))
        );
        
        // Also check direct substring match
        const directMatch = normalizedParticipantName.includes(normalizedSearchName.substring(0, Math.min(normalizedSearchName.length, 8))) ||
                           normalizedSearchName.includes(normalizedParticipantName.substring(0, Math.min(normalizedParticipantName.length, 8)));
        
        if (matchingWords.length > 0 || directMatch) {
          // Get the href
          const href = await result.getAttribute('href');
          if (href) {
            const teamUrl = href.startsWith('http') ? href : `${FLASHSCORE_BASE}${href}`;
            console.log(`    ✓ Found: ${participantName} (${participantCategory})`);
            return teamUrl;
          }
        }
      } catch (e) {
        // Continue to next result
      }
    }
    
    // Debug output
    if (allResults.length > 0 && allResults.length <= 10) {
      console.log(`    💡 First ${Math.min(5, allResults.length)} search results:`);
      allResults.slice(0, 5).forEach(r => console.log(`      - ${r.name} (${r.category})`));
    }
    
    if (debugResults.length > 0) {
      console.log(`    💡 Found ${debugResults.length} water polo results:`);
      debugResults.forEach(r => console.log(`      - ${r.name} (${r.category})`));
    }
    
    console.log(`    ⚠️  No matching water polo team found for "${teamName}"`);
    return null;
  } catch (error) {
    console.log(`    ✗ Search failed: ${error.message}`);
    return null;
  }
}

/**
 * Extracts logo from team page
 * @param {object} page - Playwright page object
 * @param {string} teamUrl - Team page URL
 * @returns {Promise<{url: string, width: number, height: number}|null>}
 */
async function extractLogoFromTeamPage(page, teamUrl) {
  try {
    await page.goto(teamUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Look for team logo - try multiple selectors
    const logoSelectors = [
      '.participant__image',
      '.participant_image',
      '.teamLogo',
      '.team__logo img',
      'img[alt*="logo" i]',
    ];
    
    let logoUrl = null;
    let logoWidth = 0;
    let logoHeight = 0;
    
    for (const selector of logoSelectors) {
      try {
        const logoImg = await page.locator(selector).first();
        if (await logoImg.count() > 0) {
          const src = await logoImg.getAttribute('src');
          const dataSrc = await logoImg.getAttribute('data-src');
          logoUrl = src || dataSrc;
          
          if (logoUrl) {
            if (logoUrl.startsWith('//')) {
              logoUrl = 'https:' + logoUrl;
            } else if (logoUrl.startsWith('/')) {
              logoUrl = FLASHSCORE_BASE + logoUrl;
            }
            
            // Download and check dimensions
            try {
              const response = await axios.get(logoUrl, {
                responseType: 'arraybuffer',
                timeout: 5000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                },
              });
              const buffer = Buffer.from(response.data);
              const metadata = await sharp(buffer).metadata();
              logoWidth = metadata.width || 0;
              logoHeight = metadata.height || 0;
              
              if (logoWidth >= 100 && logoHeight >= 100) {
                console.log(`    ✓ Found ${logoWidth}x${logoHeight} logo`);
                return { url: logoUrl, width: logoWidth, height: logoHeight };
              }
            } catch (e) {
              // Continue to next selector
            }
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Also try extracting from HTML
    const html = await page.content();
    const logoUrlRegex = /https?:\/\/[^\s"']*static\.flashscore[^\s"']*\/res\/image\/data\/[^\s"']*\.(png|jpg|webp)/gi;
    const logoUrls = [...new Set(html.match(logoUrlRegex) || [])];
    
    for (const url of logoUrls) {
      if (url.includes('bookmakers') || url.includes('gambling') || url.includes('favicon')) {
        continue;
      }
      
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
        });
        const buffer = Buffer.from(response.data);
        const metadata = await sharp(buffer).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        
        if (width >= 100 && height >= 100) {
          console.log(`    ✓ Found ${width}x${height} logo from HTML`);
          return { url, width, height };
        }
      } catch (e) {
        // Continue to next URL
      }
    }
    
    return null;
  } catch (error) {
    console.log(`    ✗ Failed to extract logo: ${error.message}`);
    return null;
  }
}

/**
 * Downloads and saves a logo
 */
async function downloadAndSaveLogo(teamName, logoUrl, dimensions) {
  try {
    const response = await axios.get(logoUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Referer: FLASHSCORE_BASE,
      },
    });
    
    const buffer = Buffer.from(response.data);
    const sanitizedName = teamName.toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_');
    const extension = path.extname(logoUrl).toLowerCase() || '.png';
    const filename = `${sanitizedName}_${dimensions.width}x${dimensions.height}${extension}`;
    const filepath = path.join(TEAMS_LOGOS_DIR, filename);
    
    await fs.writeFile(filepath, buffer);
    console.log(`    ✅ Saved: ${filename}`);
    return filename;
  } catch (error) {
    console.log(`    ✗ Failed to save: ${error.message}`);
    return null;
  }
}

/**
 * Main function to find larger logos via search
 */
async function findLargerLogosViaSearch(options = {}) {
  const { maxTeams = 10, delay = 2000 } = options;
  
  console.log('🔍 Finding teams with small logos (< 100x100)...\n');
  const smallLogoTeams = await getTeamsWithSmallLogos();
  
  if (smallLogoTeams.length === 0) {
    console.log('✅ No teams with small logos found!');
    return;
  }
  
  console.log(`Found ${smallLogoTeams.length} teams with small logos`);
  console.log(`Processing up to ${maxTeams} teams...\n`);
  
  const teamsToProcess = smallLogoTeams.slice(0, maxTeams);
  const headless = process.argv.includes('--headless') !== false; // Default to visible for debugging
  const browser = await chromium.launch({ 
    headless: headless,
    slowMo: headless ? 0 : 300, // Slow down actions when visible
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    
    let found = 0;
    let updated = 0;
    
    for (let i = 0; i < teamsToProcess.length; i++) {
      const team = teamsToProcess[i];
      console.log(`\n[${i + 1}/${teamsToProcess.length}] Searching for: ${team.name} (current: ${team.currentWidth}x${team.currentHeight})`);
      
      // Search and navigate to team page
      const teamUrl = await searchAndNavigateToTeam(page, team.name);
      
      if (!teamUrl) {
        await page.waitForTimeout(delay);
        continue;
      }
      
      // Extract logo from team page
      const logoInfo = await extractLogoFromTeamPage(page, teamUrl);
      
      if (logoInfo && logoInfo.width >= 100 && logoInfo.height >= 100) {
        found++;
        
        // Check if it's better than existing
        const currentArea = team.currentWidth * team.currentHeight;
        const newArea = logoInfo.width * logoInfo.height;
        
        if (newArea > currentArea) {
          // Download and save
          const filename = await downloadAndSaveLogo(team.name, logoInfo.url, logoInfo);
          if (filename) {
            updated++;
            // Optionally delete old logo
            try {
              await fs.unlink(path.join(TEAMS_LOGOS_DIR, team.filename));
              console.log(`    🗑️  Deleted old logo: ${team.filename}`);
            } catch (e) {
              // Ignore deletion errors
            }
          }
        }
      }
      
      // Delay between searches
      await page.waitForTimeout(delay);
    }
    
    console.log(`\n✨ Summary:`);
    console.log(`   Processed: ${teamsToProcess.length} teams`);
    console.log(`   Found larger logos: ${found}`);
    console.log(`   Updated: ${updated}`);
    
  } finally {
    await browser.close();
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const maxTeams = parseInt(args.find(arg => arg.startsWith('--max='))?.split('=')[1]) || 10;
  const delay = parseInt(args.find(arg => arg.startsWith('--delay='))?.split('=')[1]) || 2000;
  
  console.log(`\n📋 Options:`);
  console.log(`   Max teams: ${maxTeams}`);
  console.log(`   Delay between searches: ${delay}ms`);
  console.log(`   Headless: ${process.argv.includes('--headless') ? 'yes' : 'no (visible browser)'}\n`);
  
  try {
    await findLargerLogosViaSearch({ maxTeams, delay });
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  findLargerLogosViaSearch,
  getTeamsWithSmallLogos,
  searchAndNavigateToTeam,
  extractLogoFromTeamPage,
  downloadAndSaveLogo,
};
