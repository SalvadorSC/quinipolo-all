const { fetchLogosFromMatchPage, extractLogosFromMatchPage, fetchHtmlWithPuppeteer } = require("./flashscoreLogos");
const { fetchHtml } = require("./http");

const testUrls = [
  "https://www.flashscore.com/match/water-polo/catalunya-dxA3l4Xd/sabadell-0rMBnidh/?mid=8vor9QV6",
  "https://www.flashscore.com/match/water-polo/echeyde-2oDtgx72/mediterrani-xC38Q0uj/?mid=8Q59fRGD",
  "https://www.flashscore.com/match/water-polo/barcelona-jF7CPKfd/terrassa-CIPFoBBb/?mid=vagRC8Ws",
];

async function testLogoExtraction() {
  console.log("Testing logo extraction from example URLs...\n");

  for (const url of testUrls) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`Testing: ${url}`);
    console.log("=".repeat(80));

    try {
      // Use Playwright to fetch HTML with dynamic content
      console.log(`\n📥 Fetching with Playwright (waiting for dynamic content)...`);
      const html = await fetchHtmlWithPuppeteer(url, {
        waitForSelector: '.participant__image',
        timeout: 30000,
      });
      console.log(`\nHTML length: ${html.length} characters`);
      
      // Check if page loaded properly
      if (html.includes("Loading...") && html.length < 5000) {
        console.log("⚠️  Page appears to be loading dynamically (shows 'Loading...')");
      }
      
      // Check for error pages more carefully
      const has404 = html.includes("Page not found") || 
                     html.includes("404") || 
                     html.includes("Not Found") ||
                     html.match(/<title[^>]*>.*404/i);
      
      if (has404) {
        console.log("❌ Page appears to be a 404/not found page");
        // But continue anyway to see what's in the HTML
      }
      
      // Check if it's the main Flashscore page (redirected)
      if (html.includes("Flashscore.com") && html.includes("Water polo Spain scores")) {
        console.log("⚠️  Redirected to main page (might need different headers or cookies)");
      }

      // Check for water polo content
      if (html.includes("water polo") || html.includes("water-polo") || html.includes("Catalunya") || html.includes("Sabadell")) {
        console.log("✅ Page contains water polo content");
      }
      
      // Try extracting logos
      const logos = extractLogosFromMatchPage(html);
      
      if (logos.size > 0) {
        console.log(`\n✅ Found ${logos.size} logos:`);
        for (const [teamName, logoUrl] of logos.entries()) {
          console.log(`  - ${teamName}: ${logoUrl}`);
        }
      } else {
        console.log("\n❌ No logos found");
        
        // Debug: Check for participant__image class
        if (html.includes("participant__image")) {
          console.log("  ℹ️  Found 'participant__image' in HTML, but extraction failed");
        } else {
          console.log("  ℹ️  'participant__image' class not found in HTML");
        }
        
        // Debug: Check for any img tags
        const imgMatches = html.match(/<img[^>]*>/gi);
        if (imgMatches) {
          console.log(`  ℹ️  Found ${imgMatches.length} <img> tags in HTML`);
          
          // Show first few img tags for debugging
          console.log("\n  Sample img tags:");
          imgMatches.slice(0, 5).forEach((img, i) => {
            console.log(`    ${i + 1}. ${img.substring(0, 150)}...`);
          });
        }
        
        // Debug: Check for static.flashscore URLs
        const flashscoreUrlMatches = html.match(/https?:\/\/[^\s"']*static\.flashscore[^\s"']*/gi);
        if (flashscoreUrlMatches) {
          console.log(`\n  ℹ️  Found ${flashscoreUrlMatches.length} static.flashscore.com URLs`);
          
          // Look for logo-like URLs (usually in /res/image/data/ format)
          const logoUrls = flashscoreUrlMatches.filter(url => 
            url.includes("/res/image/data/") && 
            (url.includes(".png") || url.includes(".jpg") || url.includes(".webp"))
          );
          
          if (logoUrls.length > 0) {
            console.log(`  ℹ️  Found ${logoUrls.length} potential logo URLs:`);
            logoUrls.slice(0, 10).forEach((url, i) => {
              console.log(`    ${i + 1}. ${url}`);
            });
          }
        }
        
        // Try to find team names in the HTML
        const teamNamePatterns = [
          /Catalunya|Sabadell|Echeyde|Mediterrani|Barcelona|Terrassa/gi
        ];
        const foundTeams = [];
        for (const pattern of teamNamePatterns) {
          const matches = html.match(pattern);
          if (matches) {
            foundTeams.push(...matches);
          }
        }
        if (foundTeams.length > 0) {
          console.log(`\n  ℹ️  Found team names in HTML: ${[...new Set(foundTeams)].join(", ")}`);
        }
        
        // Try to match logo URLs near team names
        // Look for logo URLs that appear near team names in the HTML
        const logoUrls = flashscoreUrlMatches.filter(url => 
          url.includes("/res/image/data/") && 
          (url.includes(".png") || url.includes(".jpg") || url.includes(".webp")) &&
          !url.includes("bookmakers") // Exclude bookmaker logos
        );
        
        if (logoUrls.length > 0 && foundTeams.length > 0) {
          console.log(`\n  💡 Found ${logoUrls.length} potential team logo URLs (excluding bookmakers):`);
          logoUrls.slice(0, 5).forEach((url, i) => {
            console.log(`    ${i + 1}. ${url}`);
          });
          
          // Try to extract from JSON-LD or script tags
          const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gis);
          if (scriptMatches) {
            console.log(`\n  ℹ️  Found ${scriptMatches.length} script tags, checking for team/logo data...`);
            for (const script of scriptMatches.slice(0, 5)) {
              if (script.includes("participant") || script.includes("team") || script.includes("logo")) {
                const relevantPart = script.substring(0, 500);
                console.log(`    Sample: ${relevantPart}...`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      console.error(error.stack);
    }
  }

  console.log(`\n${"=".repeat(80)}\n`);
}

testLogoExtraction().catch(console.error);
