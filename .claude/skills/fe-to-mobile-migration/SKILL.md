---
name: fe-to-mobile-migration
description: Execute FE-to-Mobile migration tasks from MIGRATION_FE_TO_MOBILE.md. Use when migrating quinipolo-fe features to quinipolo-mobile, updating migration status, or syncing with RELEASE_READINESS_REPORT.md.
---

# FE-to-Mobile Migration

## Instructions

1. Read `MIGRATION_FE_TO_MOBILE.md` and `RELEASE_READINESS_REPORT.md` in quinipolo-all
2. Pick the next unchecked task from the lowest incomplete phase
3. Implement the migration (port component/screen/flow from quinipolo-fe to quinipolo-mobile)
4. Run `npm run type-check` and tests in quinipolo-mobile
5. Mark the task complete in MIGRATION_FE_TO_MOBILE.md
6. Update RELEASE_READINESS_REPORT.md if types, mobile status, or untracked files changed

## Examples

**Input:** Continue the FE-to-Mobile migration  
**Output:** Pick next task, implement it, update migration doc and release report

**Input:** Update migration plan status  
**Output:** Re-scan codebase, update MIGRATION_FE_TO_MOBILE.md checkboxes and status

## Best Practices

- Complete Phase 1 (types, i18n, feature flags) before Phase 2+
- Reference FE source files when porting; preserve logic, adapt UI to React Native
- Use React Native Paper for mobile UI (per quinipolo-mobile README)
- Do not migrate dev-only tools (Graphics Generator, Logo Mapper, Teams Curator)
- Keep RELEASE_READINESS_REPORT Section 3.2 Type Consistency updated when aligning types
