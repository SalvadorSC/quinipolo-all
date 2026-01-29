# Champions League Results Implementation Plan

## Overview
This document outlines the implementation of Champions League results support in the ResultsAutoFillModal feature. Previously, only domestic league results (DHM, DHF, PDM, PDF, SDM) were fetched and displayed. Now Champions League (CL) and Champions League Women (CLF) results are also included.

## Implementation Summary

### 1. Scrapper (`quinipolo-scrapper`)

**File: `src/clients/championsLeague.ts`**
- ✅ Added `fetchChampionsLeagueResults()` function
- Fetches completed Champions League matches with scores from Flashscore results pages (`/resultados/`)
- Supports both Men's (CL) and Women's (CLF) Champions League
- Uses the same parsing logic as `fetchFlashscoreResults()` to extract:
  - Match scores (homeScore, awayScore)
  - Regulation scores (for penalty shootouts)
  - Match status (FT, AET, PEN)
  - Penalty shootout detection

**Key Features:**
- Fetches from both Champions League Flashscore URLs:
  - Men's: `https://www.flashscore.es/waterpolo/europa/champions-league/resultados/`
  - Women's: `https://www.flashscore.es/waterpolo/europa/champions-league-women/resultados/`
- Only includes completed matches (past matches or explicitly marked as finished)
- Returns matches in the same format as domestic league results

### 2. Backend (`quinipolo-be`)

**File: `services/scraper/championsLeague.js`**
- ✅ Added `fetchChampionsLeagueResults()` function
- Mirrors the scrapper implementation in JavaScript
- Exports both `fetchChampionsLeagueMatches()` (upcoming) and `fetchChampionsLeagueResults()` (completed)

**File: `services/scraper/resultsService.js`**
- ✅ Updated `fetchLastWeekResults()` to fetch Champions League results
- Now fetches results from both Flashscore (domestic leagues) and Champions League concurrently
- Merges both result sets before filtering and matching
- Updated team name matching to pass `isChampionsLeague` flag for proper team name matching

**Key Changes:**
```javascript
// Before: Only Flashscore results
const allResults = await fetchFlashscoreResults();

// After: Both Flashscore and Champions League results
const [flashscoreResults, championsLeagueResults] = await Promise.all([
  fetchFlashscoreResults().catch(...),
  fetchChampionsLeagueResults().catch(...),
]);
const allResults = [...flashscoreResults, ...championsLeagueResults];
```

### 3. Frontend (`quinipolo-fe`)

**File: `src/utils/leagueChipStyles.ts`**
- ✅ Added CLF (Champions League Women) styling support
- CL (Men's) was already supported
- CLF uses a golden gradient similar to CL but slightly lighter

**No other changes needed:**
- The frontend already supports CL and CLF league IDs in types
- `ResultsAutoFillModal` automatically displays any leagues returned by the backend
- `LeagueLegend` component uses `LeagueChip` which now supports both CL and CLF
- `ResultsTable` displays matches with league chips that support Champions League

## Data Flow

1. **User opens ResultsAutoFillModal** → Frontend calls `/api/scraper/results?quinipoloId=...&days=7`

2. **Backend `resultsService.js`**:
   - Fetches quinipolo from database
   - Fetches Flashscore results (domestic leagues)
   - Fetches Champions League results (CL + CLF)
   - Merges all results
   - Filters to last 7 days
   - Maps team names to database team names (with Champions League flag)
   - Matches results to quinipolo questions using confidence scoring
   - Returns matched results with confidence scores

3. **Frontend `ResultsAutoFillModal`**:
   - Displays all matched results grouped by league
   - Shows league chips for CL and CLF
   - Allows filtering by league
   - Allows selecting/deselecting matches
   - Applies selected results to the answers form

## Testing Checklist

- [ ] Verify Champions League results appear in ResultsAutoFillModal
- [ ] Verify CL and CLF league chips display correctly
- [ ] Verify Champions League matches can be selected/deselected
- [ ] Verify Champions League results are correctly matched to quinipolo questions
- [ ] Verify team name matching works correctly for Champions League teams
- [ ] Verify results are filtered correctly by date window
- [ ] Test with quinipolos that include Champions League matches

## Future Enhancements

- Consider adding Champions League results to the scrapper CLI (`--last-week` flag)
- Consider caching Champions League results to reduce API calls
- Consider adding Champions League-specific team name aliases if matching issues occur

## Files Modified

1. `quinipolo-scrapper/src/clients/championsLeague.ts` - Added `fetchChampionsLeagueResults()`
2. `quinipolo-be/services/scraper/championsLeague.js` - Added `fetchChampionsLeagueResults()`
3. `quinipolo-be/services/scraper/resultsService.js` - Integrated Champions League results fetching
4. `quinipolo-fe/src/utils/leagueChipStyles.ts` - Added CLF styling support

## Notes

- Champions League results use the same Flashscore parsing logic as domestic leagues
- Team name matching uses the `isChampionsLeague` flag to apply appropriate confidence thresholds
- Champions League matches are included in the same result set as domestic league matches
- The frontend automatically handles any new leagues returned by the backend (no hardcoded league lists)






