# Code Review: Ranking Images Share Feature

## Summary

Review of the ranking images share feature in CorrectionSuccess (FE) and graphics module (BE). The feature allows users in beta leagues (Global, Sant Feliu, TEST) to share quinipolo and general league ranking images via the Web Share API after correcting a quinipolo.

---

## Critical Issues

### 1. Hardcoded String (i18n Violation) — Line 383

**File:** `quinipolo-fe/src/Routes/CorrectionSuccess/CorrectionSuccess.tsx`

```javascript
const shareData: ShareData = {
  files: [file3, file4],
  text: messageToShare,
  title: "Quinipolo Resultados",  // Hardcoded
};
```

**Fix:** Add `shareTitle` (or similar) to translation files and use `t("shareTitle") ?? "Quinipolo Resultados"`.

---

### 2. BE graphics/index.js Depends on Uncommitted Files

**File:** `quinipolo-be/graphics/index.js`

The current index.js requires `buildMatchResultsFromCorrectionSee` from `./utils/matchResultsTransformer`, and the full graphics module loads `teamComponent`, `drawBranding`, `teamNameToImage.json`. For a **ranking-only** release, the plan must either:

- Use a **simplified** graphics index that only handles `image3_quinipoloRanking` and `image4_generalLeagueRanking` (no matchResultsTransformer, no correctionSee), **or**
- Include the full graphics module from 21ea411 and apply only the output key patch (image4→image3, image5→image4), accepting that renderMatchResults/renderStatistics will be loaded but unused when FE sends only image3+image4.

**Recommendation:** Cherry-pick 21ea411 (no matchResultsTransformer), then patch only the two ranking blocks to output `results.image3` and `results.image4`. The 21ea411 index does not require matchResultsTransformer.

---

## Important Issues

### 3. Type Safety — `(p as any)` Usage

**File:** `quinipolo-fe/src/Routes/CorrectionSuccess/CorrectionSuccess.tsx` (lines ~158, ~168, ~305, ~315)

```javascript
nQuinipolosParticipated: (p as any).nQuinipolosParticipated,
fullCorrectQuinipolos: (p as any).fullCorrectQuinipolos,
```

**Fix:** Extend the `Result` type or define a `LeaderboardParticipant` interface with `nQuinipolosParticipated?: number` and `fullCorrectQuinipolos?: number`, and use that for `generalSource` / `generalParticipants`.

---

### 4. DRY Violation — Duplicated Payload Logic

`buildRankingPayload` and the `useEffect` that fetches share images both construct `quinipoloParticipants` and `generalParticipants` with identical logic. Extract to a shared helper:

```javascript
const getRankingPayload = useCallback(() => { ... }, [results, participantsLeaderboardRaw, mergedLeaderboard, matchday, leagueId]);
```

Use it in both the useEffect and `shareWithImages`.

---

### 5. Inconsistent Fallback in copyImageToClipboard

**File:** `quinipolo-fe/src/Routes/CorrectionSuccess/CorrectionSuccess.tsx` (lines 437–438)

Success case: `t("imageCopied") ?? "Image copied to clipboard"`  
Error case: `t("errorCopyingMessage")` (no fallback)

**Fix:** Use `t("errorCopyingMessage") ?? "Could not copy image"` for consistency.

---

## Suggestions

### 6. Accessibility — Image Alt Text

Current: `alt="Quinipolo ranking"` and `alt="General ranking"` — acceptable. Consider translating: `alt={t("quinipoloRankingImageAlt")}` and `alt={t("generalRankingImageAlt")}` for full i18n.

### 7. Beta Label

The "(beta)" suffix on the share button could be a translation key (e.g. `shareOnWhatsAppWithImagesBeta`) for consistency.

### 8. Error Handling in shareWithImages

If `navigator.canShare` is false, the user gets a warning. Consider also offering a fallback (e.g. copy images to clipboard) when Web Share is unavailable.

---

## Positive Aspects

- Clear beta gate via `LEAGUES_WITH_IMAGE_SHARE_BETA`
- Proper loading state (`shareImagesLoading`, `sharingWithImages`)
- Error feedback via `setFeedback`
- Translation keys used for most user-facing strings
- `canShareImages` guard prevents unnecessary API calls
- Correct use of `navigator.canShare` before sharing

---

## Comparison with Main

- Main has no share images; this adds the feature behind a league allowlist.
- `matchday` and `participantsLeaderboard` are already passed from `useAnswerSubmission`; no backend changes needed for that flow.
- Translation files on feature branch include match reordering keys; for the release branch, include only the share-related keys: `copyImage`, `imageCopied`, `shareImagesTitle`, `shareOnWhatsAppWithImages`, `shareNotSupported`.
