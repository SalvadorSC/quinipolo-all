# Backend Copilot Code Review – Fix Plan

Plan to address Copilot AI code review issues in the quinipolo-be backend. Includes updates to comments where needed.

---

## Issue 1: Duplicate ROW_HEIGHT in matchResultsTheme

**File:** [quinipolo-be/graphics/constants/theme.js](quinipolo-be/graphics/constants/theme.js)

**Problem:** `ROW_HEIGHT` is defined twice in `matchResultsTheme`: `120` on line 55 and `115` on line 70. The first value is never used.

**Fix:** Remove the duplicate on line 55. Keep `ROW_HEIGHT: 115` on line 70 (the one actually used).

**Comment:** No comment change needed; the remaining definition is clear.

---

## Issue 2: Scraper – closeness in backfill

**File:** [quinipolo-be/services/scraper/scraperService.js](quinipolo-be/services/scraper/scraperService.js)

**Problem:** Copilot noted that `allMatches` must have a `closeness` field for the backfill sort to work.

**Status:** Already correct. `normalizedMatches` passed to `buildPresetSelections` comes from `matchesInWindow`, where each match has `closeness` (lines 59–70). No code change required.

**Action:** Add a short comment above the backfill block to document the dependency:

```javascript
// Backfill uses closeness from allMatches (set in matchesInWindow) for strategy sort
```

---

## Issue 3: TeamsController – Performance

**File:** [quinipolo-be/controllers/TeamsController.js](quinipolo-be/controllers/TeamsController.js)

**Problem:** `getQuinipoloCountForTeam` loads all quinipolos and counts in memory, which is expensive for large tables.

**Fix:** Supabase does not support `LIKE` on JSONB directly. Options:

1. **PostgreSQL RPC:** Create a function that uses `jsonb_array_elements` and filters by team name.
2. **Keep current logic:** Acceptable if quinipolo count stays low; add a comment about the tradeoff.

**Recommended:** Implement an RPC for `getQuinipoloCountForTeam` that filters in the database. If deferred, add a comment:

```javascript
// TODO: For large quinipolos tables, consider a DB-level filter (RPC) instead of in-memory iteration.
```

---

## Issue 4: teamLogoResolver – Repeated readdirSync

**File:** [quinipolo-be/graphics/utils/teamLogoResolver.js](quinipolo-be/graphics/utils/teamLogoResolver.js)

**Problem:** `findLogoFileInDirs` calls `fs.readdirSync(dir)` for every team in every match when resolving hex variants, causing many synchronous directory scans.

**Fix:** Extend `buildLogoIndex` to include hex variants (e.g. `baseName_XXXXXX`). Use the index in `findLogoFileInDirs` instead of `readdirSync` when looking for hex variants.

**Steps:**
1. In `buildLogoIndex`, when scanning files, also index hex variants (e.g. `TEAM_123456` → `TEAM`).
2. In `findLogoFileInDirs`, replace the `readdirSync` + `find` block with a lookup against the index.
3. Add a comment explaining that hex variant resolution uses the logo index to avoid repeated filesystem scans.

---

## Issue 5: logoMapper – Auth for filesystem mutations

**File:** [quinipolo-be/routes/logoMapper.js](quinipolo-be/routes/logoMapper.js)

**Problem:** `/logos/rename`, `DELETE /logos/:filename`, and `/clear-cache` change the filesystem without auth.

**Fix:** Add `authenticateToken` to these routes. Optionally add a curator/admin check if only certain roles should manage logos.

**Changes:**
```javascript
const { authenticateToken } = require("../middleware/auth");

router.post("/clear-cache", authenticateToken, (req, res) => { ... });
router.post("/logos/rename", authenticateToken, async (req, res) => { ... });
router.delete("/logos/:filename", authenticateToken, (req, res) => { ... });
```

**Comment:** Add a short header comment to the file:

```javascript
// Logo management routes. Mutating endpoints require authentication.
```

---

## Issue 6: teams – Auth for destructive operations

**File:** [quinipolo-be/routes/teams.js](quinipolo-be/routes/teams.js)

**Problem:** `POST /merge` and `PATCH /:id` perform destructive operations without auth.

**Fix:** Add `authenticateToken` to both routes. Add curator-level authorization if needed (e.g. `user_leagues` with curator role).

**Changes:**
```javascript
const { authenticateToken } = require("../middleware/auth");

router.get("/waterpolo/duplicates", authenticateToken, TeamsController.getDuplicateGroups);
router.post("/merge", authenticateToken, TeamsController.mergeTeams);
router.patch("/:id", authenticateToken, TeamsController.updateTeam);
```

**Comment:** Update the existing comment to mention auth:

```javascript
// Duplicate detection and merge (curator-only) – requires auth. Must be before /:id.
```

---

## Issue 7: QuinipolosController – mockCorrectionLastAnswers race condition

**File:** [quinipolo-be/controllers/QuinipolosController.js](quinipolo-be/controllers/QuinipolosController.js)

**Problem:** `mockCorrectionLastAnswers` is a module-level mutable variable shared across requests. In multi-user dev, concurrent requests can overwrite each other’s data.

**Fix:** Use a Map keyed by session or user ID. For dev-only mock, a simple approach is a Map keyed by a request identifier (e.g. IP + timestamp, or a generated request ID). Alternatively, accept the limitation and document it:

```javascript
/** Dev-only: in-memory store for last mock correction. Single-user dev only; concurrent requests may overwrite. */
```

**Recommended:** Use `Map<requestId, answers>` with a short TTL or clear-on-next-write. Requires passing a request ID through the mock correction flow. If scope is limited, document the limitation instead.

---

## Issue 8: renderMatchResults – null score display

**File:** [quinipolo-be/graphics/renderers/renderMatchResults.js](quinipolo-be/graphics/renderers/renderMatchResults.js)

**Problem:** When `match.homeScore` or `match.awayScore` is `null`, `String(null)` becomes `"null"` instead of `"-"`.

**Fix:** Use nullish coalescing:

```javascript
const homeStr = String(match.homeScore ?? "-");
const awayStr = String(match.awayScore ?? "-");
```

**Comment:** No comment change needed.

---

## Implementation order

| # | Issue | Effort | Priority |
|---|-------|--------|----------|
| 1 | theme.js ROW_HEIGHT | Trivial | High |
| 8 | renderMatchResults null scores | Trivial | High |
| 5 | logoMapper auth | Low | High (security) |
| 6 | teams auth | Low | High (security) |
| 4 | teamLogoResolver readdirSync | Medium | Medium |
| 7 | mockCorrectionLastAnswers race | Medium | Low (dev-only) |
| 3 | TeamsController performance | Medium–High | Medium |
| 2 | scraper closeness comment | Trivial | Low |

---

## Comment consistency

- Use JSDoc `/** ... */` for module-level and function-level comments.
- Keep comments short and focused on intent or non-obvious behavior.
- For security-related changes, mention auth/authorization in comments.
- For performance-related changes, briefly explain the optimization.
