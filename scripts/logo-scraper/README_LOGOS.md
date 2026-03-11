# Flashscore Logo Downloader

Service to fetch and download team logos from Flashscore.

## Usage

### Basic Usage

Download logos from the default Spain water polo page:

```bash
npm run download-logos
```

### Custom League URL

Download logos from a specific league page:

```bash
node services/scraper/downloadLogos.js "https://www.flashscore.com/water-polo/spain/"
```

### Limit Number of Matches

Process only the first N matches (useful for testing):

```bash
node services/scraper/downloadLogos.js "https://www.flashscore.com/water-polo/spain/" 20
```

### Overwrite Existing Files

Force download even if logo already exists:

```bash
node services/scraper/downloadLogos.js "https://www.flashscore.com/water-polo/spain/" 50 --overwrite
```

## How It Works

1. **Fetches League Page**: Downloads the Flashscore league page HTML
2. **Extracts Match Links**: Finds all match detail page links
3. **Visits Match Pages**: Fetches each match detail page (with concurrency control)
4. **Extracts Logos**: Finds `<img class="participant__image">` elements
5. **Downloads Images**: Downloads logo images from Flashscore CDN
6. **Saves Files**: Saves logos to `teams_logos/` directory with sanitized filenames

## Output

Logos are saved to: `quinipolo-be/teams_logos/`

Filenames are created by:
- Converting team name to uppercase
- Removing special characters
- Replacing spaces with underscores
- Adding appropriate extension (png, jpg, webp, etc.)

Example:
- Team: "C.N. Sabadell" → `C_N_SABADELL.png`
- Team: "Catalunya" → `CATALUNYA.png`

## Options

- `maxMatches`: Maximum number of matches to process (default: 50)
- `concurrency`: Number of concurrent requests (default: 5)
- `overwrite`: Overwrite existing files (default: false)

## Example Output

```
🔍 Fetching team logos from: https://www.flashscore.com/water-polo/spain/
   Options: maxMatches=50, concurrency=5, overwrite=false

Found 45 matches, processing 45
Extracted logos for 28 teams

📥 Downloading 28 logos...

  ✅ Saved CATALUNYA.png
  ✅ Saved SABADELL.png
  ⏭️  Skipping MATARO.png (already exists)
  ✅ Saved BARCELONETA.png
  ...

✨ Completed! Saved 25 logos to /path/to/teams_logos

📋 Summary:
==================================================
  Catalunya                              → CATALUNYA.png
  Sabadell                               → SABADELL.png
  C.N. Atlètic-Barceloneta              → C_N_ATLETIC_BARCELONETA.png
  ...
==================================================
```

### Fetch Logos by Team List (Flashscore Search)

Fetches logos for a specific list of teams by searching Flashscore:

```bash
npm run fetch-logos-by-list
```

Fetch specific teams only:

```bash
node services/scraper/fetchLogosByTeamList.js "Gran Bretaña F" "Olimpic Roma"
```

Options: `--max=N` (limit teams), `--visible` (show browser)

## Programmatic Usage

```javascript
const { fetchAndDownloadLogos } = require('./services/scraper/downloadLogos');

const savedLogos = await fetchAndDownloadLogos(
  'https://www.flashscore.com/water-polo/spain/',
  {
    maxMatches: 100,
    concurrency: 10,
    overwrite: false
  }
);

// savedLogos is a Map: teamName -> filename
for (const [teamName, filename] of savedLogos.entries()) {
  console.log(`${teamName}: ${filename}`);
}
```
