const { fetchHtml } = require("./http");
const { extractFlashscoreEvents } = require("./flashscoreData");
const { chromium } = require("playwright");
const axios = require("axios");

// Lazy load team matcher to avoid Supabase initialization errors if not configured
let teamMatcher = null;
function getTeamMatcher() {
  if (!teamMatcher) {
    try {
      teamMatcher = require("./teamMatcher");
    } catch (error) {
      // Team matcher not available (e.g., Supabase not configured)
      return null;
    }
  }
  return teamMatcher;
}

/**
 * Extracts team IDs from Flashscore data feed
 * Team IDs are typically in fields like FH (home team ID) and FK (away team ID)
 * @param {Object} eventMap - Parsed event data map
 * @returns {Object} Object with homeTeamId and awayTeamId
 */
function extractTeamIds(eventMap) {
  // Team IDs might be in various fields - try common patterns
  // FH÷ might contain team ID, FK÷ might contain team ID
  // Or they might be in separate fields
  const homeTeamId = eventMap["FH_ID"] || eventMap["home_id"] || null;
  const awayTeamId = eventMap["FK_ID"] || eventMap["away_id"] || null;
  
  return { homeTeamId, awayTeamId };
}

/**
 * Constructs a Flashscore match URL from match ID and team info
 * Tries multiple formats, starting with the simplest
 * @param {string} matchId - Match ID from data feed
 * @param {string} homeTeam - Home team name
 * @param {string} awayTeam - Away team name
 * @param {string} homeTeamId - Home team ID (optional)
 * @param {string} awayTeamId - Away team ID (optional)
 * @param {string} baseDomain - Domain (flashscore.com or flashscore.es)
 * @returns {string[]} Array of URLs to try (in order of preference)
 */
function constructMatchUrls(matchId, homeTeam, awayTeam, homeTeamId = null, awayTeamId = null, baseDomain = "flashscore.com") {
  const baseUrl = `https://www.${baseDomain}`;
  const urls = [];
  
  // Format 1: Simple with just mid parameter (might redirect to correct URL)
  urls.push(`${baseUrl}/match/water-polo/?mid=${matchId}`);
  
  // Format 2: With team slugs and IDs (if we have them)
  if (homeTeamId && awayTeamId) {
    const homeSlug = homeTeam
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 30);
    const awaySlug = awayTeam
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 30);
    
    urls.push(`${baseUrl}/match/water-polo/${homeSlug}-${homeTeamId}/${awaySlug}-${awayTeamId}/?mid=${matchId}`);
  }
  
  // Format 3: With team slugs but no IDs
  const homeSlug = homeTeam
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 30);
  const awaySlug = awayTeam
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 30);
  
  urls.push(`${baseUrl}/match/water-polo/${homeSlug}/${awaySlug}/?mid=${matchId}`);
  
  return urls;
}

/**
 * Extracts match links from a Flashscore league page
 * Uses both HTML link extraction and data feed extraction
 * @param {string} html - HTML content of the league page
 * @returns {string[]} Array of match URLs
 */
function extractMatchLinks(html) {
  const matchLinks = [];
  const seenIds = new Set();

  // Method 1: Extract from HTML links with class "eventRowLink"
  // These are the match links on the league page
  // Pattern: <a href="...match/water-polo/..." class="eventRowLink" ...>
  const linkRegex = /<a[^>]*class=["'][^"']*eventRowLink[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    // Only include water polo match URLs
    if (url && url.includes("/match/water-polo/") && !matchLinks.includes(url)) {
      let absoluteUrl = url;
      if (!url.startsWith("http")) {
        // Determine domain - prefer .es if URL contains it, otherwise .com
        const domain = html.includes("flashscore.es") ? "flashscore.es" : "flashscore.com";
        absoluteUrl = `https://www.${domain}${url.startsWith("/") ? url : `/${url}`}`;
      }
      matchLinks.push(absoluteUrl);
    }
  }
  
  // Also try reverse order (href before class)
  const linkRegex2 = /<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*eventRowLink[^"']*["'][^>]*>/gi;
  while ((match = linkRegex2.exec(html)) !== null) {
    const url = match[1];
    if (url && url.includes("/match/water-polo/") && !matchLinks.includes(url)) {
      let absoluteUrl = url;
      if (!url.startsWith("http")) {
        const domain = html.includes("flashscore.es") ? "flashscore.es" : "flashscore.com";
        absoluteUrl = `https://www.${domain}${url.startsWith("/") ? url : `/${url}`}`;
      }
      if (!matchLinks.includes(absoluteUrl)) {
        matchLinks.push(absoluteUrl);
      }
    }
  }

  // Method 2: Extract match IDs from data feed and construct URLs
  // First, we need to parse the raw data feed to get team IDs
  const DATA_REGEX = /data:\s*`([^`]+)`/g;
  const blocks = [...html.matchAll(DATA_REGEX)];
  const domain = html.includes("flashscore.es") ? "flashscore.es" : "flashscore.com";
  
  // Store events with their URLs for later use
  const eventUrlMap = new Map();
  const waterPoloEvents = [];
  
  // Parse data feed blocks to extract water polo matches with team IDs
  for (const match of blocks) {
    const block = match[1];
    if (!block) continue;
    const chunks = block.split("¬~").filter(Boolean);

    for (const chunk of chunks) {
      if (!chunk.includes("AA÷")) continue;

      const fields = chunk.split("¬");
      const map = {};
      for (const field of fields) {
        const [key, ...rest] = field.split("÷");
        if (!key || rest.length === 0) continue;
        map[key] = rest.join("÷");
      }

      const matchId = map["AA"];
      const homeTeam = map["AE"] || map["FH"];
      const awayTeam = map["AF"] || map["FK"];
      
      // Check if this is a water polo match
      // Since we're on a water polo page, most matches should be water polo
      // But we can also check sport indicators if available
      const sportIndicator = map["MA"] || map["sport"] || "";
      const isWaterPolo = 
        html.includes("water-polo") || 
        html.includes("waterpolo") ||
        sportIndicator.toLowerCase().includes("water") ||
        true; // Assume water polo if we're on a water polo page
      
      if (matchId && homeTeam && awayTeam && isWaterPolo) {
        // Try to extract team IDs from various possible fields
        // Team IDs might be embedded in FH/FK or in separate fields
        // Sometimes the ID is part of a longer string, we need to extract it
        const homeTeamId = map["FH_ID"] || extractIdFromField(map["FH"]) || null;
        const awayTeamId = map["FK_ID"] || extractIdFromField(map["FK"]) || null;
        
        waterPoloEvents.push({
          id: matchId,
          home: homeTeam,
          away: awayTeam,
          homeTeamId,
          awayTeamId,
          map // Store full map for debugging
        });
      }
    }
  }
  
  // If we didn't find water polo events in data feed, try using extractFlashscoreEvents
  // but filter by checking if URL contains water-polo
  if (waterPoloEvents.length === 0) {
    const allEvents = extractFlashscoreEvents(html);
    for (const event of allEvents) {
      // We'll construct URLs and check if they're water polo when fetching
      waterPoloEvents.push({
        id: event.id,
        home: event.home,
        away: event.away,
        homeTeamId: null,
        awayTeamId: null
      });
    }
  }
  
  // Construct URLs for water polo events
  for (const event of waterPoloEvents) {
    if (event.id && !seenIds.has(event.id)) {
      seenIds.add(event.id);
      const possibleUrls = constructMatchUrls(
        event.id,
        event.home,
        event.away,
        event.homeTeamId,
        event.awayTeamId,
        domain
      );
      // Use the first URL as primary
      const matchUrl = possibleUrls[0];
      if (!matchLinks.includes(matchUrl)) {
        matchLinks.push(matchUrl);
        eventUrlMap.set(matchUrl, {
          primary: matchUrl,
          alternatives: possibleUrls.slice(1),
          event: event
        });
      }
    }
  }
  
  // Store eventUrlMap for later use in fetchLogosFromMatchPage
  extractMatchLinks.eventUrlMap = eventUrlMap;
  
  // Helper function to extract ID from a field (if it contains ID-like pattern)
  function extractIdFromField(fieldValue) {
    if (!fieldValue) return null;
    // Look for patterns like "teamname-ABC123" or just extract alphanumeric ID
    const idMatch = fieldValue.match(/-([A-Za-z0-9]{8,})$/);
    return idMatch ? idMatch[1] : null;
  }

  return matchLinks;
}

/**
 * Normalizes a team name from Flashscore to match database team names
 * @param {string} flashscoreTeamName - Team name from Flashscore
 * @returns {string|null} Normalized team name or original if normalization fails
 */
function normalizeTeamNameForLogo(flashscoreTeamName) {
  if (!flashscoreTeamName) return null;
  
  const matcher = getTeamMatcher();
  if (!matcher) {
    // Team matcher not available, return original name
    return flashscoreTeamName;
  }
  
  try {
    // Try to normalize using team matcher
    // This will throw if team map is not loaded, which we catch below
    const normalized = matcher.matchTeamNameSync(flashscoreTeamName, false);
    // matchTeamNameSync returns the matched team name from database, or null if not found
    return normalized || flashscoreTeamName; // Fallback to original if not matched
  } catch (error) {
    // If team map not loaded or any other error, return original name
    // This allows the function to work even without Supabase configured
    return flashscoreTeamName;
  }
}

/**
 * Extracts team logos from a Flashscore match detail page
 * Since content loads dynamically, tries multiple extraction methods
 * @param {string} html - HTML content of the match page
 * @returns {Map<string, string>} Map of team name to logo URL (normalized team names)
 */
function extractLogosFromMatchPage(html) {
  const logos = new Map();
  
  // Method 1: Look for <img class="participant__image" or "participant_image" ...> elements
  // Note: Flashscore uses both participant__image (double underscore) and participant_image (single underscore)
  // Also check for srcset which might contain larger versions
  const imgRegex = /<img[^>]*class=["'][^"']*participant_+image[^"']*["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const imgTag = match[0];
    const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
    const srcMatch = imgTag.match(/(?:src|data-src)=["']([^"']+)["']/i);
    const srcsetMatch = imgTag.match(/srcset=["']([^"']+)["']/i);
    
    if (altMatch && srcMatch) {
      const teamName = altMatch[1].trim();
      let logoUrl = srcMatch[1].trim();
      
      // Check srcset for larger versions (e.g., "url1 1x, url2 2x" or "url1 30w, url2 100w")
      if (srcsetMatch) {
        const srcset = srcsetMatch[1];
        // Try to find the largest version in srcset
        // Format: "url1 30w, url2 100w" or "url1 1x, url2 2x"
        const srcsetUrls = srcset.split(',').map(s => {
          const parts = s.trim().split(/\s+/);
          const url = parts[0];
          const size = parts[1] ? parseInt(parts[1]) : 0;
          return { url, size };
        }).sort((a, b) => b.size - a.size);
        
        if (srcsetUrls.length > 0 && srcsetUrls[0].size > 0) {
          logoUrl = srcsetUrls[0].url; // Use largest version
        }
      }
      
      if (logoUrl.startsWith("//")) {
        logoUrl = "https:" + logoUrl;
      } else if (logoUrl.startsWith("/")) {
        logoUrl = "https://www.flashscore.com" + logoUrl;
      }
      
      if (isValidLogoUrl(logoUrl)) {
        const normalizedName = normalizeTeamNameForLogo(teamName);
        if (normalizedName) {
          logos.set(normalizedName, logoUrl);
        }
      }
    }
  }
  
  // Method 2: Extract from script tags (JSON data)
  // Flashscore often embeds data in script tags
  const scriptRegex = /<script[^>]*>(.*?)<\/script>/gis;
  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1];
    
    // Look for JSON with team/participant data
    try {
      // Try to find JSON objects with team/logo data
      const jsonMatches = scriptContent.match(/\{[^{}]*"(?:team|participant|logo|image)"[^{}]*\}/gi);
      if (jsonMatches) {
        for (const jsonStr of jsonMatches) {
          try {
            const data = JSON.parse(jsonStr);
            if (data.name && data.image) {
              const normalizedName = normalizeTeamNameForLogo(data.name);
              if (normalizedName) {
                logos.set(normalizedName, data.image);
              }
            }
          } catch (e) {
            // Not valid JSON, continue
          }
        }
      }
    } catch (e) {
      // Continue to next script tag
    }
  }
  
  // Method 3: Extract team logos from URL patterns in HTML
  // Find team logo URLs (excluding bookmakers) and try to match with team names
  const logoUrlRegex = /https?:\/\/[^\s"']*static\.flashscore[^\s"']*\/res\/image\/data\/[^\s"']*\.(png|jpg|webp)/gi;
  const allLogoUrls = html.match(logoUrlRegex) || [];
  const logoUrls = [...new Set(allLogoUrls)].filter(url => 
    isValidLogoUrl(url)
  );
  
  // Extract team names from page title or URL
  // Title format: "Team1 v Team2 (date) | Water polo - Flashscore"
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  let teamNames = [];
  
  if (titleMatch) {
    const title = titleMatch[1];
    // Extract "Team1 v Team2" part
    const vsMatch = title.match(/([^|]+)\s+v\s+([^|(]+)/i);
    if (vsMatch) {
      teamNames = [vsMatch[1].trim(), vsMatch[2].trim()];
    }
  }
  
  // Also try extracting from URL if title didn't work
  // URL format: /match/water-polo/team1-id/team2-id/
  if (teamNames.length === 0) {
    // This will be passed from the calling function via URL
    // For now, try to extract from HTML meta tags or other sources
    const metaOgTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (metaOgTitle) {
      const ogTitle = metaOgTitle[1];
      const vsMatch = ogTitle.match(/([^|]+)\s+v\s+([^|(]+)/i);
      if (vsMatch) {
        teamNames = [vsMatch[1].trim(), vsMatch[2].trim()];
      }
    }
  }
  
  // Match logo URLs to team names
  // Filter out bookmaker logos more strictly
  const teamLogosOnly = logoUrls.filter(url => 
    !url.includes("bookmakers") &&
    !url.includes("gambling") &&
    !url.includes("bet") &&
    url.match(/\/res\/image\/data\/[A-Za-z0-9-]+\.(png|jpg|webp)/i) // Should match pattern like GKb9CxzB-b1fSL9Mh-W8yh4wlG.png
  );
  
  // Clean team names (remove dates, extra info)
  const cleanTeamNames = teamNames.map(name => {
    // Remove date patterns like "04/03/2026" or "03/03/2026"
    return name.replace(/\d{2}\/\d{2}\/\d{4}/g, "").trim();
  }).filter(name => name.length > 0);
  
  // Match logos to teams
  if (teamLogosOnly.length > 0 && cleanTeamNames.length >= 1 && logos.size === 0) {
    // Match first logo to first team, second logo to second team if available
    for (let i = 0; i < Math.min(teamLogosOnly.length, cleanTeamNames.length); i++) {
      const normalizedName = normalizeTeamNameForLogo(cleanTeamNames[i]);
      if (normalizedName) {
        logos.set(normalizedName, teamLogosOnly[i]);
      }
    }
  }
  
  return logos;
}

/**
 * Tries to get a larger version of a logo URL by checking match detail pages
 * Flashscore displays logos at different sizes on different pages
 * @param {string} teamName - Team name
 * @param {string} smallLogoUrl - Small logo URL (e.g., 30x30)
 * @param {string} matchUrl - Match URL where we found this logo
 * @returns {Promise<string|null>} Larger URL if found, null otherwise
 */
async function tryGetLargerLogoUrlFromMatchPage(teamName, smallLogoUrl, matchUrl) {
  try {
    // Visit the match detail page and look for larger logo versions
    const html = await fetchHtmlWithPuppeteer(matchUrl, {
      waitForSelector: '.participant__image',
      timeout: 15000,
    });
    
    // Look for all logo URLs in the page
    const allLogoUrls = html.match(/https?:\/\/[^\s"']*static\.flashscore[^\s"']*\/res\/image\/data\/[^\s"']*\.(png|jpg|webp)/gi) || [];
    const uniqueUrls = [...new Set(allLogoUrls)];
    
    // Find URLs that match the team (same base path)
    const urlBase = smallLogoUrl.match(/(.*\/res\/image\/data\/[^-]+-[^-]+)/)?.[1];
    if (urlBase) {
      const relatedUrls = uniqueUrls.filter(url => url.includes(urlBase));
      
      // Try downloading each to check dimensions
      for (const url of relatedUrls) {
        if (url !== smallLogoUrl) {
          try {
            const response = await axios.get(url, {
              responseType: 'arraybuffer',
              timeout: 5000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              },
            });
            const buffer = Buffer.from(response.data);
            const sharp = require('sharp');
            const metadata = await sharp(buffer).metadata();
            
            // If this URL gives us a larger image, use it
            if (metadata.width > 30 || metadata.height > 30) {
              return url;
            }
          } catch (e) {
            // Continue to next URL
          }
        }
      }
    }
  } catch (error) {
    // Failed to fetch match page, return null
  }
  
  return null;
}

/**
 * Checks if a URL is a valid team logo URL
 */
function isValidLogoUrl(url) {
  return (
    url.includes("static.flashscore.com") ||
    url.includes("static.flashscore.es") ||
    (url.includes("flashscore.com/res/image") || url.includes("flashscore.es/res/image")) &&
    !url.includes("bookmakers") &&
    !url.includes("gambling") &&
    !url.includes("favicon")
  );
}

/**
 * Fetches HTML from a URL using Playwright to handle dynamic content
 * @param {string} url - URL to fetch
 * @param {Object} options - Playwright options
 * @returns {Promise<string>} HTML content
 */
async function fetchHtmlWithPuppeteer(url, options = {}) {
  const { timeout = 30000, waitForSelector = null } = options;
  const browser = await chromium.launch({
    headless: true,
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle', timeout });
    
    // Wait for specific selector if provided, or wait for participant images
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 10000 });
      } catch (e) {
        // Selector not found, continue anyway
      }
    } else {
      // Try to wait for participant images
      try {
        await page.waitForSelector('.participant__image', { timeout: 10000 });
      } catch (e) {
        // Images not found, wait a bit more for content to load
        await page.waitForTimeout(2000);
      }
    }
    
    const html = await page.content();
    return html;
  } finally {
    await browser.close();
  }
}

/**
 * Fetches HTML from a URL using PinchTab (fallback option)
 * PinchTab runs as an HTTP server on port 9867
 * @param {string} url - URL to fetch
 * @param {Object} options - Options
 * @returns {Promise<string>} HTML content
 */
async function fetchHtmlWithPinchTab(url, options = {}) {
  const { pinchtabUrl = 'http://localhost:9867', timeout = 30000 } = options;
  
  try {
    // Step 1: Navigate to the URL
    const navigateResponse = await axios.post(
      `${pinchtabUrl}/navigate`,
      { url },
      { timeout }
    );
    
    const tabId = navigateResponse.data.tab;
    
    // Step 2: Wait for content to load (wait for participant images)
    try {
      await axios.post(
        `${pinchtabUrl}/wait`,
        {
          tab: tabId,
          selector: '.participant__image',
          timeout: 10000,
        },
        { timeout: 15000 }
      );
    } catch (e) {
      // Selector not found, wait a bit more
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Step 3: Get the HTML content
    const htmlResponse = await axios.get(`${pinchtabUrl}/html`, {
      params: { tab: tabId },
      timeout,
    });
    
    // Step 4: Close the tab
    try {
      await axios.post(`${pinchtabUrl}/close`, { tab: tabId }, { timeout: 5000 });
    } catch (e) {
      // Ignore close errors
    }
    
    return htmlResponse.data.html || htmlResponse.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('PinchTab server is not running. Start it with: pinchtab');
    }
    throw error;
  }
}

/**
 * Fetches team logos from a Flashscore match detail page
 * Uses Puppeteer to wait for dynamic content to load
 * @param {string} matchUrl - Flashscore match URL
 * @param {string[]} alternativeUrls - Alternative URLs to try if first fails
 * @returns {Promise<Map<string, string>>} Map of team name to logo URL
 */
async function fetchLogosFromMatchPage(matchUrl, alternativeUrls = []) {
  // Skip non-water-polo URLs
  if (!matchUrl.includes("water-polo") && !matchUrl.includes("waterpolo")) {
    return new Map();
  }
  
  const urlsToTry = [matchUrl, ...alternativeUrls];
  
  for (const url of urlsToTry) {
    // Skip non-water-polo URLs
    if (!url.includes("water-polo") && !url.includes("waterpolo")) {
      continue;
    }
    
    try {
      // Try Playwright first (primary method)
      const html = await fetchHtmlWithPuppeteer(url, {
        waitForSelector: '.participant__image',
        timeout: 30000,
      });
      
      // Check if page loaded successfully
      // Note: Flashscore pages often contain "Page not found" text in ads/placeholders
      // So we check for actual 404 indicators more carefully
      if (html.length < 1000) {
        console.log(`    Page too short (${html.length} chars), skipping`);
        continue;
      }
      
      // Only skip if it's clearly a 404 page (has 404 in title or is a very short error page)
      const is404 = (html.includes("<title") && html.match(/<title[^>]*>.*404/i)) ||
                     (html.length < 5000 && html.includes("404") && html.includes("Not Found"));
      
      if (is404) {
        console.log(`    Actual 404 page detected, skipping`);
        continue;
      }
      
      // Extract logos directly (URL already confirms it's water-polo)
      const logos = extractLogosFromMatchPage(html);
      
      // If we found logos, return them
      if (logos.size > 0) {
        return logos;
      }
      
      // Try alternative extraction methods
      const altLogos = extractLogosAlternative(html);
      if (altLogos.size > 0) {
        return altLogos;
      }
    } catch (playwrightError) {
      console.warn(`Playwright fetch failed for ${url}: ${playwrightError.message}`);
      
      // Fallback 1: Try PinchTab if available
      try {
        console.log(`  Trying PinchTab fallback...`);
        const html = await fetchHtmlWithPinchTab(url, {
          timeout: 30000,
        });
        
        if (html && html.length > 1000) {
          const logos = extractLogosFromMatchPage(html);
          if (logos.size > 0) {
            console.log(`  ✅ PinchTab fallback succeeded`);
            return logos;
          }
        }
      } catch (pinchtabError) {
        if (pinchtabError.message.includes('PinchTab server is not running')) {
          console.log(`  ℹ️  PinchTab not available (server not running)`);
        } else {
          console.warn(`  PinchTab fallback failed: ${pinchtabError.message}`);
        }
      }
      
      // Fallback 2: Try regular HTTP fetch
      try {
        console.log(`  Trying regular HTTP fetch fallback...`);
        const html = await fetchHtml(url);
        const logos = extractLogosFromMatchPage(html);
        if (logos.size > 0) {
          console.log(`  ✅ HTTP fallback succeeded`);
          return logos;
        }
      } catch (httpError) {
        console.warn(`  HTTP fallback failed: ${httpError.message}`);
        // Try next URL if all methods fail
        continue;
      }
    }
  }
  
  return new Map();
}

/**
 * Alternative logo extraction methods
 * Tries different patterns and data sources
 */
function extractLogosAlternative(html) {
  const logos = new Map();
  
  // Method 1: Look for any img tags with team-related classes or attributes
  const imgPatterns = [
    /<img[^>]*class=["'][^"']*participant[^"']*["'][^>]*>/gi,
    /<img[^>]*class=["'][^"']*team[^"']*["'][^>]*>/gi,
    /<img[^>]*data-team[^>]*>/gi,
  ];
  
  for (const pattern of imgPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const imgTag = match[0];
      const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      
      if (altMatch && srcMatch) {
        const teamName = altMatch[1].trim();
        const logoUrl = srcMatch[1].trim();
        
        if (
          logoUrl.includes("static.flashscore") ||
          logoUrl.includes("flashscore") && logoUrl.includes("/res/image")
        ) {
          logos.set(teamName, logoUrl);
        }
      }
    }
  }
  
  // Method 2: Extract from data feed blocks (similar to events)
  const DATA_REGEX = /data:\s*`([^`]+)`/g;
  const blocks = [...html.matchAll(DATA_REGEX)];
  
  for (const match of blocks) {
    const block = match[1];
    if (!block) continue;
    
    // Look for logo URLs in the data feed
    // Common patterns: AL÷ (home logo), AM÷ (away logo), or similar
    const logoMatches = block.match(/(https?:\/\/[^\s"']*static\.flashscore[^\s"']*)/gi);
    if (logoMatches) {
      // Try to find team names nearby
      const teamMatches = block.match(/(AE÷|AF÷|FH÷|FK÷)([^¬]+)/g);
      if (teamMatches && logoMatches.length >= 2) {
        for (let i = 0; i < Math.min(teamMatches.length, logoMatches.length); i++) {
          const teamMatch = teamMatches[i].match(/(AE÷|AF÷|FH÷|FK÷)(.+)/);
          if (teamMatch) {
            const teamName = teamMatch[2].trim();
            const logoUrl = logoMatches[i];
            if (teamName && logoUrl) {
              logos.set(teamName, logoUrl);
            }
          }
        }
      }
    }
  }
  
  return logos;
}

/**
 * Extracts team logos directly from the league page HTML
 * Follows similar approach to extractFlashscoreEvents - extracts from rendered HTML
 * @param {string} html - HTML content of the league page
 * @returns {Map<string, string>} Map of team name to logo URL
 */
function extractLogosFromLeaguePage(html) {
  const logos = new Map();
  
  // Method 1: Extract from HTML img tags with participant__image class
  // These appear on match detail pages, but let's check if they're on league page too
  const imgRegex = /<img[^>]*class=["'][^"']*participant__image[^"']*["'][^>]*>/gi;
  let match;
  const foundLogos = [];
  
  while ((match = imgRegex.exec(html)) !== null) {
    const imgTag = match[0];
    const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
    const srcMatch = imgTag.match(/(?:src|data-src)=["']([^"']+)["']/i);
    
    if (altMatch && srcMatch) {
      const teamName = altMatch[1].trim();
      let logoUrl = srcMatch[1].trim();
      
      // Handle relative URLs
      if (logoUrl.startsWith("//")) {
        logoUrl = "https:" + logoUrl;
      } else if (logoUrl.startsWith("/")) {
        logoUrl = "https://www.flashscore.com" + logoUrl;
      }
      
      if (isValidLogoUrl(logoUrl)) {
        foundLogos.push({ teamName, logoUrl });
      }
    }
  }
  
  // Add all found logos to the map
  for (const { teamName, logoUrl } of foundLogos) {
    if (!logos.has(teamName)) {
      logos.set(teamName, logoUrl);
    }
  }
  
  // Method 2: Extract logo URLs and try to match with team names from HTML structure
  // Find all team logo URLs in the HTML
  const logoUrlRegex = /https?:\/\/[^\s"']*static\.flashscore[^\s"']*\/res\/image\/data\/[^\s"']*\.(png|jpg|webp)/gi;
  const allLogoUrls = [...new Set((html.match(logoUrlRegex) || []).filter(url => isValidLogoUrl(url)))];
  
  // Extract team names from various sources in HTML
  // Look for team names near logo URLs or in data attributes
  const teamNames = new Set();
  
  // Extract from data attributes, alt tags, or text content near logos
  // Look for patterns like: data-team="TeamName" or alt="TeamName" near logo URLs
  for (const logoUrl of allLogoUrls) {
    // Find the position of this logo URL in HTML
    const urlIndex = html.indexOf(logoUrl);
    if (urlIndex === -1) continue;
    
    // Look for team name within 500 characters before or after the logo URL
    const contextStart = Math.max(0, urlIndex - 500);
    const contextEnd = Math.min(html.length, urlIndex + 500);
    const context = html.substring(contextStart, contextEnd);
    
    // Try to find team name in various formats
    // Pattern 1: alt="TeamName" near the logo
    const altMatch = context.match(/alt=["']([^"']+)["']/i);
    if (altMatch) {
      const teamName = altMatch[1].trim();
      // Filter out generic names
      if (teamName && teamName.length > 2 && !teamName.match(/^(image|logo|team|participant)$/i)) {
        teamNames.add(teamName);
        if (!logos.has(teamName)) {
          logos.set(teamName, logoUrl);
        }
      }
    }
    
    // Pattern 2: data-team or data-participant attributes
    const dataTeamMatch = context.match(/data-(?:team|participant)=["']([^"']+)["']/i);
    if (dataTeamMatch) {
      const teamName = dataTeamMatch[1].trim();
      if (teamName && teamName.length > 2) {
        teamNames.add(teamName);
        if (!logos.has(teamName)) {
          logos.set(teamName, logoUrl);
        }
      }
    }
  }
  
  // Method 3: Extract team names from match links and try to match with logos
  // Get team names from match URLs: /match/water-polo/team1-id/team2-id/
  const matchLinkRegex = /\/match\/water-polo\/([^\/]+)\/([^\/\?]+)/gi;
  const matchTeams = [];
  while ((match = matchLinkRegex.exec(html)) !== null) {
    // Extract team slug (before the ID part)
    const homeSlug = match[1].split('-').slice(0, -1).join('-'); // Remove ID part
    const awaySlug = match[2].split('-').slice(0, -1).join('-');
    matchTeams.push({ home: homeSlug, away: awaySlug });
  }
  
  // If we have team names from events but not matched to logos, try fuzzy matching
  // This is a fallback - ideally we'd match them more precisely
  
  return logos;
}

/**
 * Fetches team logo URLs from a Flashscore league page
 * Follows the scraperService.js pattern:
 * 1. Fetch league page HTML (like fetchFlashscoreMatches does)
 * 2. Extract match links/IDs from the page
 * 3. Visit match pages to extract logos (like how scraperService processes events)
 * @param {string} leagueUrl - Flashscore league URL (e.g., https://www.flashscore.com/water-polo/spain/)
 * @param {Object} options - Options for fetching
 * @param {number} options.maxMatches - Maximum number of matches to process (default: 50)
 * @param {number} options.concurrency - Number of concurrent requests (default: 5)
 * @returns {Promise<Map<string, string>>} Map of team name to logo URL
 */
async function fetchTeamLogosFromLeague(leagueUrl, options = {}) {
  const { maxMatches = 50, concurrency = 5 } = options;
  const allLogos = new Map();

  // Normalize URL - remove hash fragments (they're client-side routing)
  // e.g., https://www.flashscore.es/waterpolo/europa/champions-league/#/WlczF9Hb/clasificacion/general/
  // becomes https://www.flashscore.es/waterpolo/europa/champions-league/
  const normalizedUrl = leagueUrl.split('#')[0];

  // Try to load team map for name normalization (optional - will use original names if fails)
  // Note: This requires Supabase to be configured. If not, normalization will use original names.
  const matcher = getTeamMatcher();
  if (matcher) {
    try {
      await matcher.fetchTeamMap();
      console.log(`Team map loaded for name normalization`);
    } catch (error) {
      console.warn(`Could not load team map for normalization: ${error.message}. Using original team names.`);
    }
  } else {
    console.log(`Team matcher not available (Supabase may not be configured). Using original team names.`);
  }

  try {
    // Step 1: Fetch league page HTML (similar to fetchFlashscoreMatches in scraperService.js)
    // Use Playwright to get fully rendered HTML with match links
    console.log(`Fetching league page: ${normalizedUrl}`);
    const html = await fetchHtmlWithPuppeteer(normalizedUrl, {
      timeout: 30000,
    });
    
    // Step 1.5: Try to extract logos directly from league page first
    // Some league pages (like Champions League) have logos directly on the page
    // Extract all logo URLs and try to find larger versions for small ones
    const leaguePageLogos = extractLogosFromMatchPage(html);
    if (leaguePageLogos.size > 0) {
      console.log(`Found ${leaguePageLogos.size} logos directly on league page`);
      
      // Check HTML for all logo URLs to find larger versions
      const allLogoUrls = [...new Set((html.match(/https?:\/\/[^\s"']*static\.flashscore[^\s"']*\/res\/image\/data\/[^\s"']*\.(png|jpg|webp)/gi) || []))];
      
      for (const [teamName, logoUrl] of leaguePageLogos.entries()) {
        // Try to find larger version by checking all URLs in HTML
        // Look for URLs with same base but potentially different sizes
        let bestUrl = logoUrl;
        const urlBase = logoUrl.match(/(.*\/res\/image\/data\/[^-]+)/)?.[1];
        if (urlBase) {
          // Find all URLs with same base (might be different sizes)
          const relatedUrls = allLogoUrls.filter(url => url.includes(urlBase));
          // Prefer URLs that don't look like thumbnails (30x30)
          // Flashscore usually serves the same URL, but check anyway
          bestUrl = relatedUrls[0] || logoUrl;
        }
        
        allLogos.set(teamName, bestUrl);
        console.log(`  ✓ ${teamName}`);
      }
    }
    
    // Step 2: Extract match links from the page (similar to extractFlashscoreEvents)
    const matchLinks = extractMatchLinks(html);
    
    if (matchLinks.length === 0) {
      console.warn(`No match links found on ${normalizedUrl}`);
      if (allLogos.size > 0) {
        console.log(`Returning ${allLogos.size} logos found on league page`);
      }
      return allLogos;
    }

    // Limit number of matches to process
    const matchesToProcess = matchLinks.slice(0, maxMatches);
    console.log(`Found ${matchLinks.length} matches, processing ${matchesToProcess.length} to extract logos`);

    // Step 3: Visit match pages to extract logos (process in batches like scraperService does)
    // Also try to find larger versions of small logos found on league page
    const processBatch = async (batch) => {
      const promises = batch.map(async (matchUrl) => {
        try {
          console.log(`    Processing: ${matchUrl.substring(0, 70)}...`);
          const logos = await fetchLogosFromMatchPage(matchUrl);
          
          // For small logos found earlier, try to find larger versions on match pages
          if (logos.size > 0) {
            console.log(`    ✓ Found ${logos.size} logos from ${matchUrl.substring(0, 60)}...`);
            for (const [name, url] of logos.entries()) {
              console.log(`      - ${name}`);
              
              // If we already have this team with a small logo, check if this one is larger
              if (allLogos.has(name)) {
                const existingUrl = allLogos.get(name);
                // We'll let the download script handle size comparison
                // But prefer this URL if it's from a match detail page (might be larger)
                allLogos.set(name, url);
              } else {
                allLogos.set(name, url);
              }
            }
          } else {
            console.log(`    ⚠️  No logos found for ${matchUrl.substring(0, 60)}...`);
          }
          return logos;
        } catch (error) {
          console.warn(`  ✗ Failed to process match ${matchUrl.substring(0, 60)}...: ${error.message}`);
          if (error.stack) {
            console.warn(`    Stack: ${error.stack.split('\n')[1]}`);
          }
          return new Map();
        }
      });

      const results = await Promise.all(promises);
      return results;
    };

    // Process matches in batches (similar to how scraperService processes leagues)
    for (let i = 0; i < matchesToProcess.length; i += concurrency) {
      const batch = matchesToProcess.slice(i, i + concurrency);
      console.log(`  Processing batch ${Math.floor(i / concurrency) + 1} (${batch.length} matches)...`);
      
      const batchResults = await processBatch(batch);
      
      // Merge results
      for (const logos of batchResults) {
        for (const [teamName, logoUrl] of logos.entries()) {
          // Only add if we don't already have this team
          if (!allLogos.has(teamName)) {
            allLogos.set(teamName, logoUrl);
            console.log(`    ✓ ${teamName}`);
          }
        }
      }
    }

    console.log(`\nExtracted logos for ${allLogos.size} unique teams`);
    return allLogos;
  } catch (error) {
    console.error(`Failed to fetch logos from league ${leagueUrl}:`, error.message);
    return allLogos;
  }
}

/**
 * Fetches logo URL for a specific team from Flashscore
 * @param {string} teamName - Team name
 * @param {string} leagueUrl - League URL to search in
 * @returns {Promise<string|null>} Logo URL or null if not found
 */
async function fetchTeamLogo(teamName, leagueUrl) {
  if (!teamName || !leagueUrl) {
    return null;
  }

  const logos = await fetchTeamLogosFromLeague(leagueUrl);
  
  // Try exact match first
  if (logos.has(teamName)) {
    return logos.get(teamName);
  }

  // Try case-insensitive match
  for (const [name, logoUrl] of logos.entries()) {
    if (name.toLowerCase() === teamName.toLowerCase()) {
      return logoUrl;
    }
  }

  // Try partial match
  const teamNameLower = teamName.toLowerCase();
  for (const [name, logoUrl] of logos.entries()) {
    if (
      name.toLowerCase().includes(teamNameLower) ||
      teamNameLower.includes(name.toLowerCase())
    ) {
      return logoUrl;
    }
  }

  return null;
}

/**
 * Fetches logos for multiple teams from a league page
 * @param {string[]} teamNames - Array of team names
 * @param {string} leagueUrl - Flashscore league URL
 * @returns {Promise<Map<string, string>>} Map of team name to logo URL
 */
async function fetchTeamLogos(teamNames, leagueUrl) {
  if (!leagueUrl || !teamNames || teamNames.length === 0) {
    return new Map();
  }

  const allLogos = await fetchTeamLogosFromLeague(leagueUrl);
  const result = new Map();

  for (const teamName of teamNames) {
    // Try exact match
    if (allLogos.has(teamName)) {
      result.set(teamName, allLogos.get(teamName));
      continue;
    }

    // Try case-insensitive match
    let found = false;
    for (const [name, logoUrl] of allLogos.entries()) {
      if (name.toLowerCase() === teamName.toLowerCase()) {
        result.set(teamName, logoUrl);
        found = true;
        break;
      }
    }

    if (!found) {
      // Try partial match
      const teamNameLower = teamName.toLowerCase();
      for (const [name, logoUrl] of allLogos.entries()) {
        if (
          name.toLowerCase().includes(teamNameLower) ||
          teamNameLower.includes(name.toLowerCase())
        ) {
          result.set(teamName, logoUrl);
          break;
        }
      }
    }
  }

  return result;
}

module.exports = {
  fetchTeamLogo,
  fetchTeamLogos,
  fetchLogosFromMatchPage,
  fetchTeamLogosFromLeague,
  fetchHtmlWithPuppeteer,
  fetchHtmlWithPinchTab,
  extractMatchLinks,
  extractLogosFromMatchPage,
};
