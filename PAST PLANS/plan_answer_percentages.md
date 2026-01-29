# Plan: Answer Percentage Statistics Feature

## Overview

Add functionality to display percentage statistics showing how many people chose each option (home team, away team, draw) for each match when users view their own answers. This should only be shown after the quinipolo deadline has passed, and statistics should be pre-computed and stored in the database to avoid expensive computations on each request.

---

## Database Changes

### 1. Add New Column to `quinipolos` Table

**Column Name**: `answer_statistics`  
**Type**: `JSONB`  
**Default**: `NULL`  
**Description**: Stores pre-computed answer statistics for all matches

**Structure**:

```json
{
  "computed_at": "2024-01-15T10:30:00Z",
  "total_responses": 42,
  "matches": [
    {
      "matchNumber": 1,
      "homeTeam": "Team A",
      "awayTeam": "Team B",
      "statistics": {
        "homeTeam": {
          "count": 15,
          "percentage": 35.71
        },
        "awayTeam": {
          "count": 20,
          "percentage": 47.62
        },
        "empat": {
          "count": 7,
          "percentage": 16.67
        }
      }
    },
    {
      "matchNumber": 15,
      "homeTeam": "Team X",
      "awayTeam": "Team Y",
      "statistics": {
        "homeTeam": {
          "count": 12,
          "percentage": 28.57
        },
        "awayTeam": {
          "count": 18,
          "percentage": 42.86
        },
        "empat": {
          "count": 12,
          "percentage": 28.57
        },
        "goals": {
          "homeTeam": {
            "-": { "count": 5, "percentage": 11.9 },
            "11/12": { "count": 20, "percentage": 47.62 },
            "+": { "count": 17, "percentage": 40.48 }
          },
          "awayTeam": {
            "-": { "count": 8, "percentage": 19.05 },
            "11/12": { "count": 22, "percentage": 52.38 },
            "+": { "count": 12, "percentage": 28.57 }
          }
        }
      }
    }
  ]
}
```

**Migration SQL** (Supabase):

```sql
ALTER TABLE quinipolos
ADD COLUMN answer_statistics JSONB DEFAULT NULL;

-- Add index for efficient queries (optional, but helpful)
CREATE INDEX idx_quinipolos_answer_statistics ON quinipolos USING GIN (answer_statistics);
```

---

## Backend Implementation

### 2. Create Statistics Computation Service

**File**: `quinipolo-be/services/stats/computeAnswerStatistics.js`

**Function**: `computeAnswerStatistics(quinipoloId)`

**Logic**:

1. Fetch all answers for the quinipolo from `answers` table
2. Fetch quinipolo details to get match information
3. For each match (1-15):
   - Count occurrences of each `chosenWinner` (homeTeam, awayTeam, "empat")
   - Calculate percentages
   - For match 15, also count goal ranges for homeTeam and awayTeam
4. Return structured statistics object
5. Store in `quinipolos.answer_statistics` column

**Key Considerations**:

- Handle edge cases: no answers, single answer, etc.
- Round percentages to 2 decimal places
- Use team names from quinipolo data (not from answers, as they might differ)
- For match 15, goal statistics are separate from winner statistics

**Pseudocode**:

```javascript
async function computeAnswerStatistics(quinipoloId) {
  // 1. Get all answers for this quinipolo
  const { data: allAnswers } = await supabase
    .from("answers")
    .select("answers")
    .eq("quinipolo_id", quinipoloId);

  // 2. Get quinipolo to get match details
  const { data: quinipolo } = await supabase
    .from("quinipolos")
    .select("quinipolo")
    .eq("id", quinipoloId)
    .single();

  const totalResponses = allAnswers.length;
  if (totalResponses === 0) {
    return null; // No statistics if no answers
  }

  // 3. Initialize statistics structure
  const statistics = {
    computed_at: new Date().toISOString(),
    total_responses: totalResponses,
    matches: [],
  };

  // 4. Process each match (1-15)
  for (let matchNum = 1; matchNum <= 15; matchNum++) {
    const matchIndex = matchNum - 1;
    const match = quinipolo.quinipolo[matchIndex];

    const matchStats = {
      matchNumber: matchNum,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      statistics: {
        homeTeam: { count: 0, percentage: 0 },
        awayTeam: { count: 0, percentage: 0 },
        empat: { count: 0, percentage: 0 },
      },
    };

    // Count winner choices
    allAnswers.forEach((answerDoc) => {
      const answer = answerDoc.answers.find((a) => a.matchNumber === matchNum);
      if (!answer || !answer.chosenWinner) return;

      const winner = answer.chosenWinner;
      if (winner === match.homeTeam) {
        matchStats.statistics.homeTeam.count++;
      } else if (winner === match.awayTeam) {
        matchStats.statistics.awayTeam.count++;
      } else if (winner === "empat") {
        matchStats.statistics.empat.count++;
      }
    });

    // Calculate percentages
    Object.keys(matchStats.statistics).forEach((key) => {
      matchStats.statistics[key].percentage =
        totalResponses > 0
          ? Math.round(
              (matchStats.statistics[key].count / totalResponses) * 10000
            ) / 100
          : 0;
    });

    // For match 15, also compute goal statistics
    if (matchNum === 15) {
      matchStats.statistics.goals = {
        homeTeam: {
          "-": { count: 0, percentage: 0 },
          "11/12": { count: 0, percentage: 0 },
          "+": { count: 0, percentage: 0 },
        },
        awayTeam: {
          "-": { count: 0, percentage: 0 },
          "11/12": { count: 0, percentage: 0 },
          "+": { count: 0, percentage: 0 },
        },
      };

      allAnswers.forEach((answerDoc) => {
        const answer = answerDoc.answers.find((a) => a.matchNumber === 15);
        if (!answer) return;

        if (answer.goalsHomeTeam) {
          const goalKey = answer.goalsHomeTeam;
          if (matchStats.statistics.goals.homeTeam[goalKey]) {
            matchStats.statistics.goals.homeTeam[goalKey].count++;
          }
        }

        if (answer.goalsAwayTeam) {
          const goalKey = answer.goalsAwayTeam;
          if (matchStats.statistics.goals.awayTeam[goalKey]) {
            matchStats.statistics.goals.awayTeam[goalKey].count++;
          }
        }
      });

      // Calculate goal percentages
      Object.keys(matchStats.statistics.goals).forEach((team) => {
        Object.keys(matchStats.statistics.goals[team]).forEach((goalKey) => {
          matchStats.statistics.goals[team][goalKey].percentage =
            totalResponses > 0
              ? Math.round(
                  (matchStats.statistics.goals[team][goalKey].count /
                    totalResponses) *
                    10000
                ) / 100
              : 0;
        });
      });
    }

    statistics.matches.push(matchStats);
  }

  return statistics;
}
```

### 3. Add Statistics Computation Trigger/Endpoint

**Option A: Automatic Computation (Recommended)**

- Create a database function/trigger that computes statistics when:
  - Deadline passes (via scheduled job/cron)
  - Or: Compute on-demand when first requested after deadline

**Option B: Manual Computation Endpoint**

- Create admin endpoint: `POST /api/quinipolos/quinipolo/:id/compute-statistics`
- Call this manually or via cron job after deadline

**Option C: Lazy Computation (Best Performance)**

- Check if `answer_statistics` is NULL when fetching quinipolo
- If NULL and deadline has passed, compute on-the-fly and store
- Subsequent requests use cached statistics

**Recommended: Option C (Lazy Computation)**

**Implementation**:

- Modify `getQuinipoloAnswersAndCorrections` in `QuinipolosController.js`
- Before returning response, check:
  1. Is `end_date` in the past?
  2. Is `answer_statistics` NULL?
  3. If both true, compute statistics and store them
  4. Include statistics in response

**Code Location**: `quinipolo-be/controllers/QuinipolosController.js`

**Modification to `getQuinipoloAnswersAndCorrections`**:

```javascript
const getQuinipoloAnswersAndCorrections = async (req, res) => {
  // ... existing code ...

  // After fetching quinipolo, check if we need to compute statistics
  const deadlinePassed = new Date(quinipolo.end_date) < new Date();
  const needsStatistics = deadlinePassed && !quinipolo.answer_statistics;

  if (needsStatistics) {
    try {
      const statistics = await computeAnswerStatistics(id);
      if (statistics) {
        // Store statistics in database
        await supabase
          .from("quinipolos")
          .update({ answer_statistics: statistics })
          .eq("id", id);

        quinipolo.answer_statistics = statistics;
      }
    } catch (error) {
      console.warn("Failed to compute answer statistics:", error);
      // Don't fail the request, just continue without statistics
    }
  }

  // Include statistics in response if available and deadline passed
  if (deadlinePassed && quinipolo.answer_statistics) {
    transformedQuinipolo.answer_statistics = quinipolo.answer_statistics;
  }

  // ... rest of existing code ...
};
```

### 4. Update API Response Types

**File**: `quinipolo-be/types/quinipolo.js`

Add documentation for `answer_statistics` field in the API response.

---

## Frontend Implementation

**Note**: This implementation assumes the AnswersForm refactoring has been completed. See `plan_answersform_refactor.md` for details.

### 5. Update TypeScript Types

**File**: `quinipolo-fe/src/types/quinipolo.ts`

Add `answer_statistics` to `QuinipoloType` interface:

```typescript
export interface AnswerStatistics {
  computed_at: string;
  total_responses: number;
  matches: Array<{
    matchNumber: number;
    homeTeam: string;
    awayTeam: string;
    statistics: {
      homeTeam: { count: number; percentage: number };
      awayTeam: { count: number; percentage: number };
      empat: { count: number; percentage: number };
      goals?: {
        homeTeam: {
          "-": { count: number; percentage: number };
          "11/12": { count: number; percentage: number };
          "+": { count: number; percentage: number };
        };
        awayTeam: {
          "-": { count: number; percentage: number };
          "11/12": { count: number; percentage: number };
          "+": { count: number; percentage: number };
        };
      };
    };
  }>;
}

export interface QuinipoloType {
  // ... existing fields ...
  answer_statistics?: AnswerStatistics;
}
```

### 6. Update AnswersForm Components (After Refactoring)

**Note**: After refactoring, the following files will need updates:

#### 6a. Create AnswerStatistics Component

**File**: `quinipolo-fe/src/Routes/AnswersForm/components/AnswerStatistics.tsx`

**Purpose**: Display answer percentage statistics with a visual segmented bar and detailed breakdown

**Features**:

- Segmented horizontal bar showing percentages visually (length = percentage)
- Three segments: Home Team (blue), Draw (orange), Away Team (green)
- Percentage values displayed below the bar
- Count and total responses shown
- Only displays when:
  - Deadline has passed
  - User is viewing their answers (`seeUserAnswersModeOn`)
  - Statistics are available

**Visual Design**:

- Top: Segmented bar (24px height) with colors:
  - Home Team: `#1976d2` (blue)
  - Draw: `#ed6c02` (orange)
  - Away Team: `#2e7d32` (green)
- Bottom: Three columns showing:
  - Team name / "Draw"
  - Percentage (colored to match bar)
  - Count/Total (e.g., "15/42")

**Implementation**: ✅ Already created - see `AnswerStatistics.tsx`

#### 6b. Update MatchRow Component

**File**: `quinipolo-fe/src/Routes/AnswersForm/components/MatchRow.tsx`

**Changes**:

- Import `AnswerStatistics` component
- Add logic to check if statistics should be displayed:
  - Deadline passed
  - `seeUserAnswersModeOn` is true
  - Statistics exist for this match
- Render `AnswerStatistics` component below `MatchWinnerButtons` and above goals (for match 15)

**Implementation**: ✅ Already integrated - see `MatchRow.tsx`

#### 6c. Update Data Fetching Hook

**File**: `quinipolo-fe/src/Routes/AnswersForm/hooks/useQuinipoloData.ts`

**Changes**:

- Statistics will be automatically included in API response (backend handles computation)
- No changes needed if backend properly includes `answer_statistics` in response

### 7. Update GoalsToggleButtonGroup Component

**File**: `quinipolo-fe/src/Routes/AnswersForm/GoalsToggleButtonGroup.tsx`

**Changes**:

- Accept `answerStatistics` prop
- Accept `endDate` and `seeUserAnswersModeOn` props to determine if percentages should show
- Display percentages next to each goal option for match 15
- Only show when deadline passed and statistics available

**Props Addition**:

```typescript
interface GoalsToggleButtonGroupProps {
  // ... existing props ...
  answerStatistics?: AnswerStatistics;
  endDate?: string;
  seeUserAnswersModeOn?: boolean | null;
}

// Helper function to get goal statistics
const getGoalStatistics = (
  teamType: "home" | "away",
  goalValue: string,
  answerStatistics?: AnswerStatistics,
  endDate?: string,
  seeUserAnswersModeOn?: boolean | null
) => {
  if (!answerStatistics || !seeUserAnswersModeOn) {
    return null;
  }

  const deadlinePassed = endDate ? new Date(endDate) < new Date() : false;
  if (!deadlinePassed) {
    return null;
  }

  const match15Stats = answerStatistics.matches.find(
    (m) => m.matchNumber === 15
  );
  if (!match15Stats?.statistics.goals) {
    return null;
  }

  const teamKey = teamType === "home" ? "homeTeam" : "awayTeam";
  return match15Stats.statistics.goals[teamKey]?.[goalValue] || null;
};

// In component, display percentage:
{
  getGoalStatistics(
    teamType,
    goalValue,
    answerStatistics,
    endDate,
    seeUserAnswersModeOn
  )?.percentage && (
    <span style={{ fontSize: "0.75em", opacity: 0.7, marginLeft: "4px" }}>
      (
      {
        getGoalStatistics(
          teamType,
          goalValue,
          answerStatistics,
          endDate,
          seeUserAnswersModeOn
        )?.percentage
      }
      %)
    </span>
  );
}
```

#### 7a. Update MatchRow Component

**File**: `quinipolo-fe/src/Routes/AnswersForm/components/MatchRow.tsx`

**Changes**:

- Pass `answer_statistics` and `end_date` to `GoalsToggleButtonGroup` components
- These props are already available from `quinipolo` prop

### 8. Add Translations

**Files**: All locale files in `quinipolo-fe/src/locales/*/translation.json`

Add translation keys (if needed):

```json
{
  "answerStatistics": {
    "totalResponses": "Total responses: {{count}}",
    "percentage": "{{percentage}}%"
  }
}
```

---

## Performance Considerations

### 9. Optimization Strategies

1. **Lazy Computation**: Only compute statistics when first requested after deadline
2. **Caching**: Once computed, statistics are stored in database (no re-computation)
3. **Indexing**: JSONB column can be indexed for faster queries (already included in migration)
4. **Batch Processing**: If computing for multiple quinipolos, use batch operations

### 10. Edge Cases Handling

1. **No Answers**: Return `null` or empty statistics structure
2. **Deadline Not Passed**: Don't compute or show statistics
3. **Statistics Already Computed**: Use cached version
4. **Team Name Mismatches**: Use team names from quinipolo data, not from answers
5. **Missing Data**: Handle gracefully, don't break the UI

---

## Testing Plan

### 11. Backend Tests

1. **Unit Tests**:

   - Test `computeAnswerStatistics` with various scenarios:
     - No answers
     - Single answer
     - Multiple answers
     - Match 15 with goals
     - Edge cases (missing data, etc.)

2. **Integration Tests**:
   - Test `getQuinipoloAnswersAndCorrections` endpoint:
     - Before deadline (no statistics)
     - After deadline, first request (computes statistics)
     - After deadline, subsequent requests (uses cached statistics)

### 12. Frontend Tests

1. **Component Tests**:

   - Test AnswersForm with statistics
   - Test display logic (show/hide based on deadline)
   - Test percentage formatting

2. **UI Tests**:
   - Verify percentages display correctly
   - Verify styling is appropriate
   - Verify match 15 goal percentages display

---

## Migration Strategy

### 13. Deployment Steps

1. **Phase 1: Database Migration**

   - Add `answer_statistics` column to `quinipolos` table
   - Deploy backend code with statistics computation
   - Deploy frontend code (will show empty until statistics computed)

2. **Phase 2: Backfill (Optional)**

   - Create script to compute statistics for existing quinipolos with passed deadlines
   - Run script manually or via cron job
   - Or: Let lazy computation handle it naturally

3. **Phase 3: Monitoring**
   - Monitor performance of statistics computation
   - Check database size impact
   - Verify statistics accuracy

---

## Rollback Plan

### 14. If Issues Arise

1. **Database Rollback**:

   ```sql
   ALTER TABLE quinipolos DROP COLUMN answer_statistics;
   ```

2. **Code Rollback**:
   - Revert backend changes (remove statistics computation)
   - Revert frontend changes (remove percentage display)
   - Deploy previous version

---

## Future Enhancements

### 15. Potential Improvements

1. **Real-time Updates**: Update statistics when new answers are submitted (before deadline)
2. **Historical Statistics**: Track statistics changes over time
3. **Comparison View**: Show how user's answers compare to popular choices
4. **Admin Dashboard**: View statistics for all quinipolos
5. **Export Statistics**: Allow exporting statistics as CSV/JSON

---

## Summary

This plan implements answer percentage statistics with the following key features:

✅ **Efficient**: Statistics computed once and cached in database  
✅ **Performance**: Lazy computation only when needed  
✅ **User-Friendly**: Only shown after deadline, when viewing own answers  
✅ **Visual Design**: Segmented bar with detailed percentage breakdown  
✅ **Complete**: Includes both winner and goal statistics for match 15 (goals: future enhancement)  
✅ **Maintainable**: Clear separation of concerns, well-documented  
✅ **Refactored Structure**: Works with the refactored AnswersForm components

## Implementation Order

1. ✅ **Completed**: AnswersForm refactoring (see `plan_answersform_refactor.md`)
2. ✅ **Completed**: Frontend component created (`AnswerStatistics.tsx`)
3. ✅ **Completed**: Component integrated into `MatchRow.tsx`
4. **Next**: Implement backend statistics computation
5. **Finally**: Test end-to-end flow

## Component Design

The `AnswerStatistics` component displays:

- **Visual Bar**: Segmented horizontal bar where each segment's width represents the percentage
  - Home Team: Blue (`#1976d2`)
  - Draw: Orange (`#ed6c02`)
  - Away Team: Green (`#2e7d32`)
- **Detailed Breakdown**: Three columns showing:
  - Team name / "Draw"
  - Percentage value (colored)
  - Count/Total responses

The component only renders when:

- Deadline has passed (`end_date < now`)
- User is viewing their answers (`seeUserAnswersModeOn === true`)
- Statistics are available (`answer_statistics` exists)

The implementation follows best practices for database design, API design, and frontend UX. The refactored component structure makes it easier to add this feature without cluttering the main component.
