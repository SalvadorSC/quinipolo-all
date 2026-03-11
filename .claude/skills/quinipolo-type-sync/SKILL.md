---
name: quinipolo-type-sync
description: Align TypeScript types between quinipolo-fe and quinipolo-mobile. Use when syncing CorrectAnswer, QuinipoloData, or other shared types across repos.
---

# Quinipolo Type Sync

## Instructions

1. Compare quinipolo-fe types (AnswersForm, correction, survey) with quinipolo-mobile (`types/quinipolo.ts`, `hooks/answers/types.ts`)
2. Add missing fields to mobile: `goalsHomeTeamExact`, `goalsAwayTeamExact`, `regularGoalsHomeTeam`, `regularGoalsAwayTeam`
3. Ensure AnswerType, CorrectAnswer, QuinipoloData match FE structure
4. Run `npm run type-check` in quinipolo-mobile
5. Update RELEASE_READINESS_REPORT.md Section 3.2 Type Consistency

## Examples

**Input:** Align mobile CorrectAnswer with FE  
**Output:** Add goalsHomeTeamExact, goalsAwayTeamExact, regularGoalsHomeTeam, regularGoalsAwayTeam to CorrectAnswer in types/quinipolo.ts and hooks/answers/types.ts

## Best Practices

- Match FE field names and optionality
- Update both types/quinipolo.ts and hooks/answers/types.ts if both define answer shapes
- Verify BE API response shape matches
- Mark type consistency table in RELEASE_READINESS_REPORT as updated
