# Quinipolo Monorepo – Release Readiness Report

**Generated:** 2025-03-11  
**Scope:** quinipolo-all, quinipolo-be, quinipolo-fe, quinipolo-mobile

---

## 1. Changes Grouped by Feature/Theme

### 1.1 Graphics Generator & Team Logos (BE + FE)

| Repo | Files | Description |
|------|-------|-------------|
| **quinipolo-be** | `graphics/*`, `GraphicsController`, `routes/graphics.js`, `team-shields-curated/`, `team-shields-pending/`, `teams_logos/` | Canvas-based graphics (ranking, match results, statistics), team logo resolver, curated/pending shield folders |
| **quinipolo-fe** | `GraphicsGeneratorPage`, `GraphicsTeamsPage`, `Dashboard` (dev links) | UI for generating graphics, managing teams, dev-only dashboard links |

**Details:**
- BE: `teamLogoResolver.js`, `teamComponent.js`, `renderMatchResults`, `renderRanking`, `renderStatistics`, theme constants
- FE: Lazy-loaded pages, config-gated dev routes
- Logo migration: `teams_logos/` → `team-shields-curated/` + `team-shields-pending/`

---

### 1.2 Logo Mapper & Teams Curator (BE + FE)

| Repo | Files | Description |
|------|-------|-------------|
| **quinipolo-be** | `routes/logoMapper.js`, `routes/teams.js`, `TeamsController.js` | Logo list/upload/cache-clear API, teams CRUD with image_name |
| **quinipolo-fe** | `LogoMapperPage`, `TeamsCuratorPage` | Logo mapping UI, teams curation UI |

**Details:**
- BE: Logo mapper endpoints (`/logos`, `/upload`, `/clear-cache`), teams `image_name` support
- FE: New routes for logo mapping and team curation

---

### 1.3 Goals Inputs & Match 15 (FE + BE graphics)

| Repo | Files | Description |
|------|-------|-------------|
| **quinipolo-fe** | `GoalsInputs.tsx`, `GoalsToggleButtonGroup.tsx`, `MatchRow.tsx`, `goalsValidationUtils.ts`, `goalDisplayConfig.ts`, `answerUtils`, `useAnswerHandlers`, `useAnswerSubmission`, `useAnswerValidation`, `validationUtils`, `autoFillUtils` | Numeric goals inputs, tie/regular-time goals, validation |
| **quinipolo-be** | `matchResultsTransformer.js`, `renderMatchResults.js` | Uses `goalsHomeTeamExact`, `regularGoalsHomeTeam/Away` for graphics |

**Details:**
- FE: `CorrectAnswer` extended with `goalsHomeTeamExact`, `goalsAwayTeamExact`, `regularGoalsHomeTeam`, `regularGoalsAwayTeam`
- BE graphics: Consumes these fields for match results images
- BE QuinipolosController: Still uses `goalsHomeTeam`/`goalsAwayTeam` for scoring; no explicit handling of `goalsHomeTeamExact` in correction logic

---

### 1.4 Match Reordering (SurveyForm)

| Repo | Files | Description |
|------|-------|-------------|
| **quinipolo-fe** | `SurveyForm.tsx`, `ReorderableMatchList.tsx`, `SortableMatchItem.tsx`, `leagueOrder.ts` (utils) | Drag-and-drop reordering, Match 15 lock, league-based sort |
| **quinipolo-all** | `MATCH_REORDERING_*.md` | Docs for implementation, testing, guide |

**Details:**
- Uses `@dnd-kit/core`, `@dnd-kit/sortable`
- Match 15 lock, keyboard/touch support
- `leagueOrder.ts`: Sort matches by league (DHM, DHF, PDM, etc.)

---

### 1.5 Correction Success & Graphics Config

| Repo | Files | Description |
|------|-------|-------------|
| **quinipolo-fe** | `CorrectionSuccess.tsx`, `apiUtils.ts`, `config` (leaguesWithImageShare) | Post-correction screen with graphics config, optional matchday, image share |

---

### 1.6 Backend Infrastructure (BE)

| Area | Files | Description |
|------|-------|-------------|
| **Migrations** | `20250225_add_teams_team_type.sql`, `20250227_add_teams_image_name.sql` | Teams schema: `team_type`, `image_name` |
| **Quinipolos** | `QuinipolosController.js`, `models/Quinipolo.js` | Matchday optimization, corrected quinipolos logic |
| **Scraper** | `downloadLogos.js`, `findLargerLogosViaSearch.js`, `flashscoreLogos.js`, `testLogoExtraction.js`, `README_LOGOS.md` | Logo scraping from Flashscore, Pinchtab setup |
| **Scripts** | `analyze-quinipolos.js`, `checkTeamLogos.js`, `exportWaterpoloTeams.js`, `renameTeamLogos.js`, `reorganize-team-shields.js` | One-off tooling for logos/quinipolos |
| **Services** | `teamDuplicateDetector.js` | Duplicate team detection |

---

### 1.7 i18n & Feature Flags

| Repo | Files | Description |
|------|-------|-------------|
| **quinipolo-fe** | `locales/*/translation.json`, `featureFlags.ts` | New keys (graphics, goals, etc.), `multiSport` flag |
| **quinipolo-mobile** | `locales/*/translation.json` | Translation sync |

---

### 1.8 Mobile Changes

| Repo | Files | Description |
|------|-------|-------------|
| **quinipolo-mobile** | `MatchWinnerButtons.tsx`, `types/quinipolo.ts`, `hooks/answers/types.ts`, `eas.json`, `package-lock.json` | Minor UI/types, EAS config, deps |
| **quinipolo-mobile** | `src/config/featureFlags.ts` | Feature flags (static `multiSport: false`), now tracked |

---

### 1.9 App Mapper (quinipolo-all)

| Repo | Files | Description |
|------|-------|-------------|
| **quinipolo-all** | `app-mapper/` | Standalone app for web flow mapping, screenshots, Puppeteer/Playwright |

---

### 1.10 Documentation (quinipolo-all)

| Repo | Files | Description |
|------|-------|-------------|
| **quinipolo-all** | `CODE_REVIEW_RANKING_IMAGES.md`, `MATCH_REORDERING_*.md`, `SETUP.md`, `TRANSLATIONS_ADDED.md`, `PAST PLANS/` | Docs and past plans |

---

## 2. Release Readiness by Feature Group

| Feature | Status | Notes |
|---------|--------|-------|
| **Graphics Generator & Team Logos** | **NEEDS WORK** | BE/FE on `feature/graphics-generator`; many untracked BE files (`test-tie-graphics.js`, `fetchLogosByTeamList.js`, new `team-shields-pending/*_600x106.png`). Migrations need to be run. |
| **Logo Mapper & Teams Curator** | **NEEDS WORK** | Depends on BE migrations (`image_name`). FE routes gated by `config.isDevelopment`. |
| **Goals Inputs & Match 15** | **NEEDS WORK** | FE collects `goalsHomeTeamExact`, `regularGoalsHomeTeam/Away`; BE graphics use them. BE correction/scoring still uses `goalsHomeTeam`/`goalsAwayTeam` only. DB schema (Supabase) may need new columns. |
| **Match Reordering** | **READY TO RELEASE** | Implemented, documented. FE-only, no BE changes. |
| **Correction Success** | **READY TO RELEASE** | FE-only, config-driven. |
| **Backend Migrations** | **NEEDS WORK** | SQL files present; must be applied to Supabase. |
| **Scraper & Scripts** | **WIP / NOT READY** | Tooling for logos; not production runtime. |
| **i18n** | **READY TO RELEASE** | Translation keys added across FE and mobile. |
| **Mobile** | **NEEDS WORK** | On `main`; `featureFlags.ts` now tracked. Types/locales in sync with FE goals types only partially (mobile `CorrectAnswer` lacks `goalsHomeTeamExact`, etc.). |
| **App Mapper** | **WIP / NOT READY** | Standalone tool, not part of Quinipolo product. |
| **Documentation** | **READY TO RELEASE** | Can be committed as-is. |

---

## 3. Cross-Repo Dependencies

### 3.1 Branch Alignment

| Repo | Branch | vs main |
|------|--------|---------|
| quinipolo-all | main | — |
| quinipolo-be | feature/graphics-generator | ahead 1 |
| quinipolo-fe | feature/graphics-generator | ahead 1 |
| quinipolo-mobile | main | — |

**Risk:** Mobile is on `main` while BE/FE are on `feature/graphics-generator`. Types and APIs may diverge.

### 3.2 Type Consistency

| Type/Field | quinipolo-fe | quinipolo-mobile | quinipolo-be |
|------------|--------------|------------------|--------------|
| `goalsHomeTeamExact` | ✅ | ❌ | Used in graphics only |
| `goalsAwayTeamExact` | ✅ | ❌ | Used in graphics only |
| `regularGoalsHomeTeam` | ✅ | ❌ | Used in graphics only |
| `regularGoalsAwayTeam` | ✅ | ❌ | Used in graphics only |
| `goalsHomeTeam` / `goalsAwayTeam` | ✅ | ✅ | ✅ (scoring + graphics) |

**Action:** Align mobile `CorrectAnswer` with FE if goals inputs will be used on mobile.

### 3.3 API Dependencies

- **Graphics:** FE calls BE `/api/graphics/*` (ranking, match-results, statistics).
- **Logo Mapper:** FE calls BE `/api/logo-mapper/*` (logos, upload, clear-cache).
- **Teams:** FE calls BE `/api/teams/*` with `image_name` support.
- **Correction:** FE submits answers; BE stores and scores. Goals exact/regular fields used by graphics, not by correction logic.

---

## 4. Untracked / Unstaged Files

### 4.1 Should Be Committed

| Repo | Path | Reason |
|------|------|--------|
| quinipolo-be | `scripts/generate-statistics-image.js` | Statistics image generation script (staged) |
| quinipolo-be | `quinipolo-statistics-J18.png` | Generated statistics image (staged) |
| quinipolo-be | `scripts/test-tie-graphics.js` | Tie graphics test (optional) |
| quinipolo-be | `services/scraper/fetchLogosByTeamList.js` | Scraper helper (optional) |

*Note: GoalsInputs, GraphicsPreview, goalsValidationUtils, leagueOrder (FE) and featureFlags.ts (mobile) are now tracked.*

### 4.2 Consider Excluding (.gitignore)

| Repo | Path | Reason |
|------|------|--------|
| quinipolo-be | `team-shields-pending/*_600x106.png` (new) | Pending assets; may be temporary |
| quinipolo-be | `team-shields-curated/ASKARTZA_B_100x100_ffffff.png` | New curated asset |
| quinipolo-be | `.DS_Store` | OS artifact |

### 4.3 Binary Assets

- `team-shields-curated/`, `team-shields-pending/`: Many images. Consider LFS or separate asset repo if size is an issue.

---

## 5. Suggested Commit Organization

### quinipolo-all

1. **docs:** Add MATCH_REORDERING_*, CODE_REVIEW_*, SETUP, TRANSLATIONS docs  
2. **docs:** Add PAST PLANS and waterpolo_teams.csv  
3. **feat:** Add app-mapper (standalone tool)

### quinipolo-be

1. **feat(database):** Add teams migrations (team_type, image_name)  
2. **feat(graphics):** Add team logo resolver and curated/pending structure  
3. **feat(graphics):** Update renderers (match results, ranking, statistics) for logos and tie/exact goals  
4. **feat(api):** Add logo mapper routes  
5. **feat(api):** Extend teams controller for image_name  
6. **refactor:** QuinipolosController matchday optimization  
7. **chore:** Add scraper services and logo scripts (optional, separate commits)  
8. **chore:** Reorganize team shields (curated, pending)

### quinipolo-fe

1. **feat(answers):** Add GoalsInputs and goals validation  
2. **feat(answers):** Integrate goals in MatchRow, handlers, submission, validation  
3. **feat(survey):** Add match reordering (ReorderableMatchList, SortableMatchItem, leagueOrder)  
4. **feat(graphics):** Add GraphicsGenerator, GraphicsTeams, LogoMapper, TeamsCurator pages  
5. **feat(dashboard):** Add dev links for graphics tools  
6. **feat(correction):** Update CorrectionSuccess with graphics config  
7. **feat(config):** Add feature flags  
8. **chore(i18n):** Add translation keys  
9. **refactor:** Update quinipolo types (goals exact, regular)

### quinipolo-mobile

1. **feat(config):** Add feature flags  
2. **chore(i18n):** Sync translation keys  
3. **refactor:** Update quinipolo types (if aligning with FE goals)  
4. **chore:** Update eas.json and package-lock.json

---

## 6. Pre-Release Checklist

- [ ] Run BE migrations on target Supabase
- [ ] Verify BE graphics endpoints with real payloads
- [ ] Confirm FE goals submission includes exact/regular when applicable
- [ ] Decide if BE correction logic should use `goalsHomeTeamExact` for Match 15 pleno
- [ ] Align mobile types with FE if goals will be used on mobile
- [ ] Commit staged changes (featureFlags.ts in mobile, generate-statistics-image.js in BE)
- [ ] Merge `feature/graphics-generator` into `main` for BE and FE when ready
- [ ] Test graphics generation end-to-end (FE → BE → image)

---

*Report generated by analyzing git status and diffs across quinipolo-all, quinipolo-be, quinipolo-fe, quinipolo-mobile.*
