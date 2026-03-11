# FE-to-Mobile Migration – Agent Prompt

Use this prompt to instruct Claude (or another agent) to autonomously execute the quinipolo-fe to quinipolo-mobile migration.

---

## Prompt (copy below)

```
You are an autonomous agent executing the migration from quinipolo-fe (React web) to quinipolo-mobile (React Native/Expo). The goal is to make mobile the primary client; the web app will eventually be deprecated. Dev-only tools (Graphics Generator, Logo Mapper, Teams Curator) must NOT be migrated.

## Context

- **quinipolo-fe**: React web app (React Router, Ant Design, MUI) at `quinipolo-fe/`
- **quinipolo-mobile**: React Native/Expo app at `quinipolo-mobile/` (React Navigation, React Native Paper)
- **quinipolo-be**: Shared backend; both apps use the same API
- **quinipolo-shared**: Shared package (mobile uses `file:../quinipolo-shared`)

## Key Documents

1. **RELEASE_READINESS_REPORT.md** (root) – Cross-repo state, type consistency, branch alignment, untracked files
2. **MIGRATION_FE_TO_MOBILE.md** (root) – Phased migration tasks with checkboxes; create this file if it does not exist, using the structure below
3. **Skills** – Use these when relevant:
   - `fe-to-mobile-migration` – Orchestration, updating docs
   - `react-web-to-react-native` – Porting components/screens
   - `expo-deep-linking` – Join league, reset password links
   - `quinipolo-type-sync` – Aligning types between FE and mobile

## Workflow

1. Read RELEASE_READINESS_REPORT.md and MIGRATION_FE_TO_MOBILE.md
2. Pick the next unchecked task from the lowest incomplete phase (Phase 1 first)
3. Implement the migration:
   - Reference the FE source file(s)
   - Port to mobile following React Native patterns
   - Preserve business logic; adapt UI to React Native Paper / React Native Reusables
4. Run `npm run type-check` in quinipolo-mobile
5. Mark the task complete in MIGRATION_FE_TO_MOBILE.md
6. Update RELEASE_READINESS_REPORT.md if types, mobile status, or untracked files changed
7. Repeat until the phase is complete or blocked

## Migration Phases (in order)

**Phase 1 – Foundation**
- [ ] 1.1 Align CorrectAnswer types (goalsHomeTeamExact, goalsAwayTeamExact, regularGoalsHomeTeam, regularGoalsAwayTeam) in mobile
- [ ] 1.2 Sync translation keys from quinipolo-fe locales to quinipolo-mobile locales
- [ ] 1.3 Mirror feature flags (multiSport, etc.) in mobile featureFlags.ts
- [ ] 1.4 Verify quinipolo-shared alignment between FE and mobile

**Phase 2 – Auth + Legal**
- [ ] 2.1 Reset password screen (handle deep link, enter new password)
- [ ] 2.2 Email confirmation screen
- [ ] 2.3 OAuth profile completion (username + birthday for new Google users)
- [ ] 2.4 Join league deep link (Expo Linking, pendingShareToken)
- [ ] 2.5 About / Terms / Privacy screens (or WebView)

**Phase 3 – Core Flows**
- [ ] 3.1 SurveyForm (create quinipolo) – 15 matches, reorder, date picker, Match 15 lock, league selection
- [ ] 3.2 QuinipoloSuccess screen
- [ ] 3.3 Correction mode in AnswerQuinipoloScreen
- [ ] 3.4 Edit correction mode
- [ ] 3.5 CorrectionSuccess screen
- [ ] 3.6 Goals inputs (Match 15) – GoalsInputs, validation
- [ ] 3.7 Results auto-fill modal

**Phase 4 – Leagues + Profile**
- [ ] 4.1 Create league (Stripe, icon, colors) – replace placeholder
- [ ] 4.2 LeagueSuccess screen
- [ ] 4.3 Profile enhancements (theme toggle, language picker, stats)

**Phase 5 – Polish**
- [ ] 5.1 View user answers mode
- [ ] 5.2 Answer statistics (admin)
- [ ] 5.3 Documentation updates

## Rules

- Do NOT migrate dev-only tools (Graphics Generator, Logo Mapper, Teams Curator)
- Complete phases in order; do not skip Phase 1
- Keep RELEASE_READINESS_REPORT Section 3.2 Type Consistency updated when aligning types
- Use React Native Paper and React Native Reusables per project .cursorrules
- Run type-check before marking tasks complete
- If blocked, document the blocker in MIGRATION_FE_TO_MOBILE.md and continue with the next task when possible

## Start

Begin by reading the documents, then execute Phase 1.1 (align CorrectAnswer types). Continue until all Phase 1 tasks are complete, then proceed to Phase 2.
```

---

## Usage

1. Copy the content between the triple backticks above
2. Paste into a new chat with Claude (or your agent)
3. Optionally attach: `RELEASE_READINESS_REPORT.md`, `MIGRATION_FE_TO_MOBILE.md` (if it exists)
4. The agent will create `MIGRATION_FE_TO_MOBILE.md` at the root if it does not exist

## Customization

- **Scope**: To limit a run, add: "Only execute Phase 1" or "Only execute tasks 2.1 through 2.4"
- **Verification**: Add: "Run tests with `npm test` in quinipolo-mobile after each task"
- **Stopping**: Add: "Stop after completing 3 tasks and report status"
