# Plan: Refactor AnswersForm.tsx into Smaller Components

## Overview

The `AnswersForm.tsx` file is currently 840 lines long and handles multiple concerns. This refactoring plan breaks it down into smaller, focused components and utilities to improve maintainability, testability, and make it easier to add new features (like answer percentages).

---

## Current Structure Analysis

### Main Concerns Identified:

1. **Type Definitions** (lines 33-65)
2. **State Management** (lines 67-109)
3. **Mode Detection** (lines 131-143)
4. **Data Fetching** (lines 147-207)
5. **Answer Validation** (lines 248-284)
6. **Form Submission** (lines 248-406)
7. **Answer Handlers** (lines 408-473)
8. **Auto-fill Logic** (lines 475-548)
9. **UI Rendering** (lines 608-836)
   - Score Summary
   - Auto-fill Button
   - Match Table
   - Match Rows
   - Submit Button

---

## Proposed File Structure

```
quinipolo-fe/src/Routes/AnswersForm/
├── AnswersForm.tsx                    # Main component (orchestrator, ~150 lines)
├── AnswersForm.module.scss            # Existing styles
├── types.ts                           # Type definitions
├── hooks/
│   ├── useAnswersFormModes.ts        # Mode detection logic
│   ├── useQuinipoloData.ts           # Data fetching logic
│   ├── useAnswerHandlers.ts           # Answer change handlers
│   ├── useAnswerValidation.ts         # Validation logic
│   └── useAnswerSubmission.ts         # Submission logic
├── components/
│   ├── MatchRow.tsx                  # Single match row component
│   ├── MatchWinnerButtons.tsx         # Winner selection buttons
│   ├── MatchHeader.tsx                # Match header (match number/game 15)
│   ├── AutoFillButton.tsx             # Auto-fill results button
│   └── SubmitButton.tsx                # Submit button component
├── utils/
│   ├── answerUtils.ts                 # Answer manipulation utilities
│   ├── validationUtils.ts             # Validation utilities
│   └── autoFillUtils.ts               # Auto-fill utilities
├── constants.ts                       # Constants (initialAnswers, etc.)
├── GoalsToggleButtonGroup.tsx         # Existing component
├── ScoreSummary.tsx                   # Existing component
└── ResultsAutoFillModal/              # Existing directory
```

---

## Detailed Refactoring Plan

### 1. Extract Types (`types.ts`)

**File**: `types.ts`

**Content**:

```typescript
import { CorrectAnswer } from "../../types/quinipolo";

export type AnswersType = CorrectAnswer;

export type CorrectionResponseType = {
  message: string;
  results:
    | {
        correctAnswers: { chosenWinner: string; matchNumber: number }[];
        userAnswers: string[];
        points: number;
      }[]
    | any;
  leagueId?: string;
  participantsLeaderboard?: Array<{
    username: string;
    points: number;
    totalPoints?: number;
    nQuinipolosParticipated: number;
    fullCorrectQuinipolos: number;
  }>;
  averagePointsThisQuinipolo?: number;
  mostFailed?: {
    matchNumber: number;
    failedPercentage: number;
    homeTeam?: string;
    awayTeam?: string;
    correctWinner?: string;
    mostWrongWinner?: string;
  } | null;
};

export type AnswerResponseType = {
  message: string;
};

export type AnswersFormModes = {
  correctingModeOn: boolean;
  editCorrectionModeOn: boolean;
  seeUserAnswersModeOn: boolean;
  viewOnlyModeOn: boolean;
  answerModeOn: boolean;
};
```

**Lines extracted**: 33-65

---

### 2. Extract Constants (`constants.ts`)

**File**: `constants.ts`

**Content**:

```typescript
import { AnswersType } from "./types";

export const createInitialAnswers = (): AnswersType[] => [
  ...Array(14)
    .fill(null)
    .map((_, index) => ({
      matchNumber: index + 1,
      chosenWinner: "",
      isGame15: false,
      goalsHomeTeam: "",
      goalsAwayTeam: "",
    })),
  {
    matchNumber: 15,
    chosenWinner: "",
    isGame15: true,
    goalsHomeTeam: "",
    goalsAwayTeam: "",
  },
];
```

**Lines extracted**: 85-102

---

### 3. Extract Mode Detection Hook (`hooks/useAnswersFormModes.ts`)

**File**: `hooks/useAnswersFormModes.ts`

**Content**:

```typescript
import { useMemo } from "react";
import { AnswersFormModes } from "../types";

export const useAnswersFormModes = (): AnswersFormModes => {
  return useMemo(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const correctingModeOn = queryParams.get("correct") !== null;
    const editCorrectionModeOn = queryParams.get("correctionEdit") !== null;
    const seeUserAnswersModeOn = queryParams.get("see") !== null;
    const viewOnlyModeOn = queryParams.get("viewOnly") !== null;
    const answerModeOn =
      !correctingModeOn &&
      !editCorrectionModeOn &&
      !seeUserAnswersModeOn &&
      !viewOnlyModeOn;

    return {
      correctingModeOn,
      editCorrectionModeOn,
      seeUserAnswersModeOn,
      viewOnlyModeOn,
      answerModeOn,
    };
  }, []);
};
```

**Lines extracted**: 131-143

---

### 4. Extract Answer Utilities (`utils/answerUtils.ts`)

**File**: `utils/answerUtils.ts`

**Content**:

```typescript
import { AnswersType } from "../types";

export const mapCorrectAnswersToInitial = (
  correctAnswers: any[],
  initialAnswers: AnswersType[]
): AnswersType[] => {
  return initialAnswers.map((defaultAnswer, index) => {
    const correctAnswer = correctAnswers.find(
      (ca: any) => ca.matchNumber === index + 1
    );
    return correctAnswer
      ? {
          ...defaultAnswer,
          chosenWinner: correctAnswer.chosenWinner || "",
          goalsHomeTeam: correctAnswer.goalsHomeTeam || "",
          goalsAwayTeam: correctAnswer.goalsAwayTeam || "",
        }
      : defaultAnswer;
  });
};

export const prepareAnswersForSubmission = (
  answers: AnswersType[]
): Array<{
  matchNumber: number;
  chosenWinner: string;
  goalsHomeTeam?: string;
  goalsAwayTeam?: string;
}> => {
  return answers.map((answer, index) => {
    const baseAnswer = {
      matchNumber: index + 1,
      chosenWinner: answer.chosenWinner,
    };
    // Only include goals for match 15 (pleno al 15)
    if (index === 14) {
      return {
        ...baseAnswer,
        goalsHomeTeam: answer.goalsHomeTeam,
        goalsAwayTeam: answer.goalsAwayTeam,
      };
    }
    return baseAnswer;
  });
};
```

**Lines extracted**: 112-126, 286-304

---

### 5. Extract Validation Utilities (`utils/validationUtils.ts`)

**File**: `utils/validationUtils.ts`

**Content**:

```typescript
import { AnswersType } from "../types";

export const findMissingAnswers = (answers: AnswersType[]): number[] => {
  const missing: number[] = [];
  answers.forEach((ans, idx) => {
    if (idx === 14) {
      const isWinnerMissing = !ans.chosenWinner;
      const areGoalsMissing = !(ans.goalsHomeTeam && ans.goalsAwayTeam);
      if (isWinnerMissing || (!isWinnerMissing && areGoalsMissing)) {
        missing.push(idx);
      }
    } else {
      if (!ans.chosenWinner) {
        missing.push(idx);
      }
    }
  });
  return missing;
};
```

**Lines extracted**: 248-264 (validation logic)

---

### 6. Extract Data Fetching Hook (`hooks/useQuinipoloData.ts`)

**File**: `hooks/useQuinipoloData.ts`

**Content**:

```typescript
import { useState, useEffect } from "react";
import { apiGet } from "../../utils/apiUtils";
import { QuinipoloType, CorrectAnswer } from "../../types/quinipolo";
import { AnswersType } from "../types";
import { mapCorrectAnswersToInitial } from "../utils/answerUtils";
import { createInitialAnswers } from "../constants";
import { useFeedback } from "../../Context/FeedbackContext/FeedbackContext";
import { useTranslation } from "react-i18next";
import { useUser } from "../../Context/UserContext/UserContext";

export const useQuinipoloData = (
  editCorrectionModeOn: boolean,
  seeUserAnswersModeOn: boolean
) => {
  const { setFeedback } = useFeedback();
  const { t } = useTranslation();
  const user = useUser();
  const [loading, setLoading] = useState<boolean>(false);
  const [quinipolo, setQuinipolo] = useState<QuinipoloType>({
    id: "",
    league_id: "",
    league_name: "",
    quinipolo: [],
    end_date: "",
    has_been_corrected: false,
    creation_date: "",
    is_deleted: false,
    participants_who_answered: [],
    correct_answers: [],
  });
  const [answers, setAnswers] = useState<AnswersType[]>(createInitialAnswers());

  const fetchData = async () => {
    try {
      const queryParams = new URLSearchParams(window.location.search);
      const id = queryParams.get("id");
      let response: any;

      if (!id) {
        console.error("ID is missing in the query string");
        return;
      }

      if (editCorrectionModeOn) {
        response = await apiGet<QuinipoloType>(
          `/api/quinipolos/quinipolo/${id}/correction-see`
        );

        if (response.correct_answers && response.correct_answers.length > 0) {
          setAnswers(
            mapCorrectAnswersToInitial(
              response.correct_answers,
              createInitialAnswers()
            )
          );
        } else {
          setAnswers(createInitialAnswers());
        }
      } else if (seeUserAnswersModeOn) {
        response = await apiGet<{
          quinipolo: QuinipoloType;
          answers: AnswersType[];
        }>(`/api/quinipolos/quinipolo/${id}/answers-see`);
        if (response.answers && response.answers.length === 0) {
          setFeedback({
            message: t("no-answer-available"),
            severity: "error",
            open: true,
          });
        }

        if (response.answers && response.answers.length > 0) {
          setAnswers(response.answers);
        }
        setQuinipolo(response.quinipolo);
        setLoading(false);
        return;
      } else {
        response = await apiGet<QuinipoloType>(
          `/api/quinipolos/quinipolo/${id}`
        );
      }
      setLoading(false);
      setQuinipolo(response);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setFeedback({
        message: error.message,
        severity: "error",
        open: true,
      });
    }
  };

  useEffect(() => {
    if (user.userData.isAuthenticated) {
      setLoading(true);
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.userData.isAuthenticated]);

  return {
    loading,
    quinipolo,
    answers,
    setQuinipolo,
    setAnswers,
    setLoading,
  };
};
```

**Lines extracted**: 147-207, 209-216

---

### 7. Extract Answer Handlers Hook (`hooks/useAnswerHandlers.ts`)

**File**: `hooks/useAnswerHandlers.ts`

**Content**:

```typescript
import { useState } from "react";
import { AnswersType } from "../types";

export const useAnswerHandlers = (
  answers: AnswersType[],
  setAnswers: React.Dispatch<React.SetStateAction<AnswersType[]>>,
  seeUserAnswersModeOn: boolean | null,
  viewOnlyModeOn: string | null,
  missingAnswerIndices: number[],
  setMissingAnswerIndices: React.Dispatch<React.SetStateAction<number[]>>
) => {
  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: string
  ) => {
    if (newValue === null || seeUserAnswersModeOn || viewOnlyModeOn) return;

    const index = parseInt(newValue.split("__")[1]);
    if (index !== 14) {
      setMissingAnswerIndices((prev) => prev.filter((i) => i !== index));
    } else {
      const match15 = answers[14];
      const bothGoalsSelected = !!(
        match15?.goalsHomeTeam && match15?.goalsAwayTeam
      );
      if (bothGoalsSelected) {
        setMissingAnswerIndices((prev) => prev.filter((i) => i !== 14));
      }
    }

    setAnswers((prevAnswers) => {
      const parts = newValue.split("__");
      const teamName = parts[0];
      const index = parseInt(parts[1]);
      const updatedData = [...prevAnswers];
      updatedData[index] = {
        ...updatedData[index],
        matchNumber: index + 1,
        chosenWinner: teamName,
      };
      return updatedData;
    });
  };

  const handleGame15Change = (
    event: React.MouseEvent<HTMLElement>,
    newValue: string
  ) => {
    if (newValue === null || seeUserAnswersModeOn || viewOnlyModeOn) return;

    setAnswers((prevAnswers) => {
      const parts = newValue.split("__");
      const goalValue = parts[0];
      const team = parts[1];
      const updatedData = [...prevAnswers];
      if (team === "home") {
        updatedData[14] = {
          ...updatedData[14],
          matchNumber: 15,
          goalsHomeTeam: goalValue,
        };
      } else {
        updatedData[14] = {
          ...updatedData[14],
          matchNumber: 15,
          goalsAwayTeam: goalValue,
        };
      }

      const bothGoalsSelected = !!(
        updatedData[14].goalsHomeTeam && updatedData[14].goalsAwayTeam
      );
      if (bothGoalsSelected) {
        setMissingAnswerIndices((prev) => prev.filter((i) => i !== 14));
      }
      return updatedData;
    });
  };

  return {
    handleChange,
    handleGame15Change,
  };
};
```

**Lines extracted**: 408-473

---

### 8. Extract Auto-fill Utilities (`utils/autoFillUtils.ts`)

**File**: `utils/autoFillUtils.ts`

**Content**:

```typescript
import { MatchResult } from "../../services/scraper/types";
import { AnswersType } from "../types";
import { QuinipoloType } from "../../types/quinipolo";

/**
 * Converts a score to goal range for waterpolo
 * Returns: "-" for <11, "11/12" for 11-12, "+" for >12
 */
export const scoreToGoalRange = (score: number): string => {
  if (score < 11) return "-";
  if (score >= 11 && score <= 12) return "11/12";
  return "+";
};

/**
 * Handles auto-fill from results modal
 */
export const applyAutoFillResults = (
  matches: MatchResult[],
  currentAnswers: AnswersType[],
  quinipolo: QuinipoloType
): AnswersType[] => {
  const updatedAnswers = [...currentAnswers];

  matches.forEach((result) => {
    const matchIndex = result.matchNumber - 1;
    if (matchIndex < 0 || matchIndex >= 15) return;

    // Set winner
    let chosenWinner = "";
    if (result.outcome === "Tie" || result.outcome === "Tie (PEN)") {
      chosenWinner = "empat";
    } else {
      const quinipoloMatch = quinipolo.quinipolo[matchIndex];
      if (quinipoloMatch) {
        if (result.outcome === quinipoloMatch.homeTeam) {
          chosenWinner = quinipoloMatch.homeTeam;
        } else if (result.outcome === quinipoloMatch.awayTeam) {
          chosenWinner = quinipoloMatch.awayTeam;
        }
      }
    }

    updatedAnswers[matchIndex] = {
      ...updatedAnswers[matchIndex],
      matchNumber: result.matchNumber,
      chosenWinner,
      isGame15: matchIndex === 14,
    };

    // For game 15, also set goals
    if (matchIndex === 14) {
      let homeScore = result.homeScore;
      let awayScore = result.awayScore;

      if (
        result.outcome === "Tie (PEN)" &&
        result.homeRegulationScore !== undefined &&
        result.awayRegulationScore !== undefined
      ) {
        homeScore = result.homeRegulationScore;
        awayScore = result.awayRegulationScore;
      }

      updatedAnswers[14] = {
        ...updatedAnswers[14],
        goalsHomeTeam: scoreToGoalRange(homeScore),
        goalsAwayTeam: scoreToGoalRange(awayScore),
      };
    }
  });

  return updatedAnswers;
};
```

**Lines extracted**: 475-548

---

### 9. Extract Submission Hook (`hooks/useAnswerSubmission.ts`)

**File**: `hooks/useAnswerSubmission.ts`

**Content**:

```typescript
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useFeedback } from "../../Context/FeedbackContext/FeedbackContext";
import { apiPost } from "../../utils/apiUtils";
import { isSystemModerator, isUserModerator } from "../../utils/moderatorUtils";
import { useTranslation } from "react-i18next";
import {
  AnswersType,
  CorrectionResponseType,
  AnswerResponseType,
} from "../types";
import { QuinipoloType } from "../../types/quinipolo";
import { prepareAnswersForSubmission } from "../utils/answerUtils";
import { findMissingAnswers } from "../utils/validationUtils";

export const useAnswerSubmission = (
  answers: AnswersType[],
  quinipolo: QuinipoloType,
  correctingModeOn: boolean,
  editCorrectionModeOn: boolean,
  user: any,
  setMissingAnswerIndices: React.Dispatch<React.SetStateAction<number[]>>,
  setHasAttemptedSubmit: React.Dispatch<React.SetStateAction<boolean>>,
  rowRefs: React.MutableRefObject<(HTMLTableRowElement | null)[]>
) => {
  const navigate = useNavigate();
  const { setFeedback } = useFeedback();
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);

  const submitQuinipolo = async () => {
    const missing = findMissingAnswers(answers);

    if (missing.length > 0) {
      setHasAttemptedSubmit(true);
      setMissingAnswerIndices(missing);
      setFeedback({
        message: t("missingAnswersForMatches", {
          matches: missing.map((i) => i + 1).join(", "),
        }),
        severity: "warning",
        open: true,
      });

      const firstMissing = missing[0];
      const rowEl = rowRefs.current[firstMissing];
      if (rowEl && typeof rowEl.scrollIntoView === "function") {
        rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const answerToSubmit = {
      username: localStorage.getItem("username") ?? user.userData.username,
      quinipoloId: quinipolo.id,
      answers: prepareAnswersForSubmission(answers),
    };

    setLoading(true);

    try {
      if (
        correctingModeOn &&
        quinipolo.league_id &&
        (isUserModerator(user.userData.userLeagues, quinipolo.league_id) ||
          isSystemModerator(user.userData.role))
      ) {
        const response = await apiPost<CorrectionResponseType>(
          `/api/quinipolos/quinipolo/${quinipolo.id}/submit-correction`,
          answerToSubmit
        );
        navigate("/correction-success", {
          state: {
            results: response.results,
            leagueId: response.leagueId || quinipolo.league_id,
            participantsLeaderboard:
              response.participantsLeaderboard || undefined,
            averagePointsThisQuinipolo: response.averagePointsThisQuinipolo,
            mostFailed: response.mostFailed,
          },
        });
        setFeedback({
          message: response.message,
          severity: "success",
          open: true,
        });
      } else if (
        editCorrectionModeOn &&
        quinipolo.league_id &&
        (isUserModerator(user.userData.userLeagues, quinipolo.league_id) ||
          isSystemModerator(user.userData.role))
      ) {
        const response = await apiPost<CorrectionResponseType>(
          `/api/quinipolos/quinipolo/${quinipolo.id}/submit-correction-edit`,
          answerToSubmit
        );
        navigate("/correction-success", {
          state: {
            results: response.results,
            leagueId: response.leagueId || quinipolo.league_id,
            participantsLeaderboard:
              response.participantsLeaderboard || undefined,
            averagePointsThisQuinipolo: response.averagePointsThisQuinipolo,
            mostFailed: response.mostFailed,
          },
        });
        setFeedback({
          message: response.message,
          severity: "success",
          open: true,
        });
      } else {
        const response = await apiPost<AnswerResponseType>(
          `/api/quinipolos/quinipolo/answers`,
          answerToSubmit
        );
        setFeedback({
          message: response.message,
          severity: "success",
          open: true,
        });
        navigate("/");
      }
    } catch (error: unknown) {
      console.error("Error submitting Quinipolo:", error);
      setLoading(false);

      if (axios.isAxiosError(error)) {
        if (error.response && error.response.status === 409) {
          setFeedback({
            message: error.response.data,
            severity: "error",
            open: true,
          });
        } else {
          setFeedback({
            message:
              error.response?.data?.message ||
              "An error occurred while submitting",
            severity: "error",
            open: true,
          });
        }
      } else {
        setFeedback({
          message: "An unexpected error occurred",
          severity: "error",
          open: true,
        });
      }
      return;
    }

    setLoading(false);
  };

  return {
    submitQuinipolo,
    loading,
  };
};
```

**Lines extracted**: 248-406

---

### 10. Extract Match Header Component (`components/MatchHeader.tsx`)

**File**: `components/MatchHeader.tsx`

**Content**:

```typescript
import React from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "antd";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import style from "../AnswersForm.module.scss";

interface MatchHeaderProps {
  matchNumber: number;
  isGame15: boolean;
  answerModeOn: boolean;
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({
  matchNumber,
  isGame15,
  answerModeOn,
}) => {
  const { t } = useTranslation();

  if (isGame15 && answerModeOn) {
    return (
      <div className={style.matchNameContainer}>
        <p>{t("game15")}</p>
        <Tooltip title={t("game15help")}>
          <HelpOutlineRoundedIcon style={{ cursor: "pointer" }} />
        </Tooltip>
      </div>
    );
  }

  return (
    <p className={style.matchName}>
      {t("match")} {matchNumber}
    </p>
  );
};
```

**Lines extracted**: 696-709

---

### 11. Extract Match Winner Buttons Component (`components/MatchWinnerButtons.tsx`)

**File**: `components/MatchWinnerButtons.tsx`

**Content**:

```typescript
import React from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { QuinipoloType } from "../../../types/quinipolo";
import { AnswersType } from "../types";
import style from "../AnswersForm.module.scss";

interface MatchWinnerButtonsProps {
  match: {
    homeTeam: string;
    awayTeam: string;
  };
  matchIndex: number;
  currentAnswer: AnswersType;
  answers: AnswersType[];
  quinipolo: QuinipoloType;
  seeUserAnswersModeOn: boolean | null;
  viewOnlyModeOn: string | null;
  loading: boolean;
  onChange: (event: React.MouseEvent<HTMLElement>, newValue: string) => void;
  matchOption: (value: string, index: number) => React.ReactNode;
}

export const MatchWinnerButtons: React.FC<MatchWinnerButtonsProps> = ({
  match,
  matchIndex,
  currentAnswer,
  loading,
  onChange,
  matchOption,
}) => {
  return (
    <ToggleButtonGroup
      color="primary"
      className={style.teamAnswerButtonContainer}
      value={
        currentAnswer.chosenWinner
          ? `${currentAnswer.chosenWinner}__${matchIndex}`
          : ""
      }
      exclusive
      onChange={onChange}
      aria-label="Match winner"
      disabled={loading}
    >
      <ToggleButton
        className={`${style.teamAnswerButton}`}
        value={`${match.homeTeam}__${matchIndex}`}
        disabled={loading}
      >
        {matchOption(match.homeTeam, matchIndex)}
      </ToggleButton>
      <ToggleButton value={`empat__${matchIndex}`} disabled={loading}>
        {matchOption("empat", matchIndex)}
      </ToggleButton>
      <ToggleButton
        className={`${style.teamAnswerButton}`}
        value={`${match.awayTeam}__${matchIndex}`}
        disabled={loading}
      >
        {matchOption(match.awayTeam, matchIndex)}
      </ToggleButton>
    </ToggleButtonGroup>
  );
};
```

**Lines extracted**: 710-743

---

### 12. Extract Match Row Component (`components/MatchRow.tsx`)

**File**: `components/MatchRow.tsx`

**Content**:

```typescript
import React from "react";
import { TableRow, TableCell } from "@mui/material";
import { QuinipoloType } from "../../../types/quinipolo";
import { AnswersType } from "../types";
import { MatchHeader } from "./MatchHeader";
import { MatchWinnerButtons } from "./MatchWinnerButtons";
import GoalsToggleButtonGroup from "../GoalsToggleButtonGroup";

interface MatchRowProps {
  match: {
    homeTeam: string;
    awayTeam: string;
    gameType: "waterpolo" | "football";
  };
  matchIndex: number;
  answers: AnswersType[];
  quinipolo: QuinipoloType;
  currentAnswer: AnswersType;
  seeUserAnswersModeOn: boolean | null;
  viewOnlyModeOn: string | null;
  answerModeOn: boolean;
  loading: boolean;
  hasAttemptedSubmit: boolean;
  missingAnswerIndices: number[];
  rowRef: (el: HTMLTableRowElement | null) => void;
  onChange: (event: React.MouseEvent<HTMLElement>, newValue: string) => void;
  handleGame15Change: (
    event: React.MouseEvent<HTMLElement>,
    newValue: string
  ) => void;
  matchOption: (value: string, index: number) => React.ReactNode;
}

export const MatchRow: React.FC<MatchRowProps> = ({
  match,
  matchIndex,
  answers,
  quinipolo,
  currentAnswer,
  seeUserAnswersModeOn,
  viewOnlyModeOn,
  answerModeOn,
  loading,
  hasAttemptedSubmit,
  missingAnswerIndices,
  rowRef,
  onChange,
  handleGame15Change,
  matchOption,
}) => {
  const isMissing =
    hasAttemptedSubmit && missingAnswerIndices.includes(matchIndex);
  const isGame15 = matchIndex === 14;

  return (
    <TableRow
      key={`${match.homeTeam}${match.awayTeam}__${matchIndex}`}
      ref={rowRef}
      sx={{
        "&:last-child td, &:last-child th": { border: 0 },
        backgroundColor: isMissing ? "rgba(255, 99, 71, 0.05)" : undefined,
        outline: isMissing ? "2px solid rgba(255, 99, 71, 0.6)" : undefined,
        outlineOffset: isMissing ? "-2px" : undefined,
        transition: "background-color 0.2s ease",
        borderRadius: 2,
      }}
    >
      <TableCell align="center" component="th" scope="row">
        <MatchHeader
          matchNumber={matchIndex + 1}
          isGame15={isGame15}
          answerModeOn={answerModeOn}
        />
        <MatchWinnerButtons
          match={match}
          matchIndex={matchIndex}
          currentAnswer={currentAnswer}
          answers={answers}
          quinipolo={quinipolo}
          seeUserAnswersModeOn={seeUserAnswersModeOn}
          viewOnlyModeOn={viewOnlyModeOn}
          loading={loading}
          onChange={onChange}
          matchOption={matchOption}
        />
        {isGame15 && (
          <div className={style.goalsContainer}>
            <GoalsToggleButtonGroup
              teamType="home"
              teamName={quinipolo.quinipolo[14].homeTeam}
              goals={currentAnswer.goalsHomeTeam}
              correctGoals={
                quinipolo.correct_answers?.[matchIndex]?.goalsHomeTeam || ""
              }
              matchType={match.gameType}
              onChange={handleGame15Change}
              seeUserAnswersModeOn={seeUserAnswersModeOn}
              viewOnlyModeOn={viewOnlyModeOn}
              quinipoloHasBeenCorrected={quinipolo.has_been_corrected}
              disabled={loading}
              isMissing={
                hasAttemptedSubmit &&
                !!answers[14]?.chosenWinner &&
                !currentAnswer.goalsHomeTeam
              }
            />
            <GoalsToggleButtonGroup
              teamType="away"
              teamName={quinipolo.quinipolo[14].awayTeam}
              goals={currentAnswer.goalsAwayTeam}
              correctGoals={
                quinipolo.correct_answers?.[matchIndex]?.goalsAwayTeam || ""
              }
              matchType={match.gameType}
              onChange={handleGame15Change}
              seeUserAnswersModeOn={seeUserAnswersModeOn}
              viewOnlyModeOn={viewOnlyModeOn}
              quinipoloHasBeenCorrected={quinipolo.has_been_corrected}
              disabled={loading}
              isMissing={
                hasAttemptedSubmit &&
                !!answers[14]?.chosenWinner &&
                !currentAnswer.goalsAwayTeam
              }
            />
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};
```

**Lines extracted**: 665-804

---

### 13. Extract Auto-fill Button Component (`components/AutoFillButton.tsx`)

**File**: `components/AutoFillButton.tsx`

**Content**:

```typescript
import React from "react";
import { Button } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useTranslation } from "react-i18next";

interface AutoFillButtonProps {
  onClick: () => void;
  disabled: boolean;
}

export const AutoFillButton: React.FC<AutoFillButtonProps> = ({
  onClick,
  disabled,
}) => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: 20,
      }}
    >
      <Button
        variant="contained"
        startIcon={<AutoAwesomeIcon />}
        onClick={onClick}
        disabled={disabled}
        sx={{
          width: { xs: "100%", sm: "auto" },
          background: "linear-gradient(135deg, #b8860b, #ffd54f)",
          color: "#3e2723",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          "&:hover": {
            background: "linear-gradient(135deg, #a07007, #ffca28)",
            color: "#3e2723",
          },
          "&.Mui-disabled": {
            background:
              "linear-gradient(135deg, rgba(184,134,11,0.4), rgba(255,213,79,0.4))",
            color: "rgba(62,39,35,0.6)",
          },
        }}
      >
        {t("resultsAutoFill.button") || "Auto-fill Results"}
      </Button>
    </div>
  );
};
```

**Lines extracted**: 617-652

---

### 14. Extract Submit Button Component (`components/SubmitButton.tsx`)

**File**: `components/SubmitButton.tsx`

**Content**:

```typescript
import React from "react";
import { Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import style from "../AnswersForm.module.scss";

interface SubmitButtonProps {
  onClick: () => void;
  loading: boolean;
  editCorrectionModeOn: boolean;
  isModerator: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  onClick,
  loading,
  editCorrectionModeOn,
  isModerator,
}) => {
  const { t } = useTranslation();

  return (
    <Button
      variant="contained"
      onClick={onClick}
      className={style.submitButton}
      type="submit"
      disabled={loading}
      startIcon={loading ? <div className={style.spinner} /> : undefined}
    >
      {editCorrectionModeOn && isModerator ? t("edit") : t("submit")}
    </Button>
  );
};
```

**Lines extracted**: 807-824

---

### 15. Extract Header Text Utility (`utils/headerUtils.ts`)

**File**: `utils/headerUtils.ts`

**Content**:

```typescript
import { AnswersFormModes } from "../types";

export const getHeaderText = (
  modes: AnswersFormModes,
  t: (key: string) => string
): string => {
  if (modes.correctingModeOn) {
    return t("correct");
  } else if (modes.seeUserAnswersModeOn) {
    return t("yourAnswersWithResults");
  } else if (modes.viewOnlyModeOn) {
    return t("viewQuinipoloResults");
  } else {
    return t("selectTheResultForEachMatch");
  }
};
```

**Lines extracted**: 595-606

---

### 16. Extract Match Option Rendering Logic (`utils/matchOptionUtils.tsx`)

**File**: `utils/matchOptionUtils.tsx`

**Content**:

```typescript
import { QuinipoloType } from "../../../types/quinipolo";
import { AnswersType } from "../types";
import style from "../AnswersForm.module.scss";

export const createMatchOptionRenderer = (
  answers: AnswersType[],
  quinipolo: QuinipoloType,
  seeUserAnswersModeOn: boolean | null,
  viewOnlyModeOn: string | null,
  t: (key: string) => string
) => {
  return (value: string, index: number) => {
    const text = value === "empat" ? t("draw") : value;
    if (!quinipolo.has_been_corrected) {
      return <span>{text}</span>;
    }

    const userAnswer = answers[index]?.chosenWinner;
    const correctAnswer = quinipolo.correct_answers?.[index]?.chosenWinner;

    let className = "";
    if (
      (seeUserAnswersModeOn || viewOnlyModeOn) &&
      quinipolo.has_been_corrected
    ) {
      const correctAnswerTeam = correctAnswer?.split("__")[0] || "";

      if (correctAnswerTeam === value) {
        className = style.correctAnswer;
      } else if (userAnswer === value && userAnswer !== correctAnswerTeam) {
        className = style.answerIsWrong;
      }
    }

    return <span className={className}>{text}</span>;
  };
};
```

**Lines extracted**: 555-584

---

### 17. Refactored Main Component (`AnswersForm.tsx`)

**File**: `AnswersForm.tsx` (refactored, ~150 lines)

**Content**: See next section for complete refactored component

---

## Refactored AnswersForm.tsx Structure

```typescript
import React, { useEffect, useState, useRef } from "react";
import {
  FormControl,
  Paper,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useFeedback } from "../../Context/FeedbackContext/FeedbackContext";
import { useTranslation } from "react-i18next";
import { useUser } from "../../Context/UserContext/UserContext";
import { isUserModerator } from "../../utils/moderatorUtils";
import ScoreSummary from "./ScoreSummary";
import { ResultsAutoFillModal } from "./ResultsAutoFillModal/index";
import { MatchRow } from "./components/MatchRow";
import { AutoFillButton } from "./components/AutoFillButton";
import { SubmitButton } from "./components/SubmitButton";
import { useAnswersFormModes } from "./hooks/useAnswersFormModes";
import { useQuinipoloData } from "./hooks/useQuinipoloData";
import { useAnswerHandlers } from "./hooks/useAnswerHandlers";
import { useAnswerSubmission } from "./hooks/useAnswerSubmission";
import { useAnswerValidation } from "./hooks/useAnswerValidation";
import { applyAutoFillResults } from "./utils/autoFillUtils";
import { getHeaderText } from "./utils/headerUtils";
import { createMatchOptionRenderer } from "./utils/matchOptionUtils";
import { QuinipoloType } from "../../types/quinipolo";
import style from "./AnswersForm.module.scss";

const AnswersForm = () => {
  const user = useUser();
  const navigate = useNavigate();
  const { setFeedback } = useFeedback();
  const { t } = useTranslation();
  const modes = useAnswersFormModes();

  const [missingAnswerIndices, setMissingAnswerIndices] = useState<number[]>(
    []
  );
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);
  const [resultsModalOpen, setResultsModalOpen] = useState<boolean>(false);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const {
    loading: dataLoading,
    quinipolo,
    answers,
    setAnswers,
    setLoading: setDataLoading,
  } = useQuinipoloData(modes.editCorrectionModeOn, modes.seeUserAnswersModeOn);

  const { handleChange, handleGame15Change } = useAnswerHandlers(
    answers,
    setAnswers,
    modes.seeUserAnswersModeOn,
    modes.viewOnlyModeOn,
    missingAnswerIndices,
    setMissingAnswerIndices
  );

  const { submitQuinipolo, loading: submitLoading } = useAnswerSubmission(
    answers,
    quinipolo,
    modes.correctingModeOn,
    modes.editCorrectionModeOn,
    user,
    setMissingAnswerIndices,
    setHasAttemptedSubmit,
    rowRefs
  );

  useAnswerValidation(
    answers,
    quinipolo,
    modes.seeUserAnswersModeOn,
    modes.viewOnlyModeOn,
    hasAttemptedSubmit,
    setMissingAnswerIndices
  );

  const loading = dataLoading || submitLoading;
  const isModerator =
    quinipolo.league_id &&
    isUserModerator(user.userData.userLeagues, quinipolo.league_id);

  const handleResultsAutoFill = (matches: any[]) => {
    const updatedAnswers = applyAutoFillResults(matches, answers, quinipolo);
    setAnswers(updatedAnswers);
    setFeedback({
      message:
        t("resultsAutoFill.success") || "Correction form filled successfully!",
      severity: "success",
      open: true,
    });
  };

  const matchOption = createMatchOptionRenderer(
    answers,
    quinipolo,
    modes.seeUserAnswersModeOn,
    modes.viewOnlyModeOn,
    t
  );

  if (!quinipolo.quinipolo) {
    setFeedback({
      message: "Error cargando Quinipolo",
      severity: "error",
      open: true,
    });
    navigate("/");
    return null;
  }

  return (
    <FormControl>
      {modes.seeUserAnswersModeOn && (
        <ScoreSummary
          userAnswers={answers}
          correctAnswers={quinipolo.correct_answers || []}
          hasBeenCorrected={quinipolo.has_been_corrected}
        />
      )}
      {(modes.correctingModeOn || modes.editCorrectionModeOn) &&
        isModerator && (
          <AutoFillButton
            onClick={() => setResultsModalOpen(true)}
            disabled={loading || !quinipolo.id}
          />
        )}
      <TableContainer sx={{ mb: 8, borderRadius: 4 }} component={Paper}>
        <Table aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ marginBottom: 16 }}>
                {getHeaderText(modes, t)}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quinipolo.quinipolo.map((match, index) => {
              const currentAnswer = answers[index] || {
                matchNumber: index + 1,
                chosenWinner: "",
                isGame15: index === 14,
                goalsHomeTeam: "",
                goalsAwayTeam: "",
              };
              return (
                <MatchRow
                  key={`${match.homeTeam}${match.awayTeam}__${index}`}
                  match={match}
                  matchIndex={index}
                  answers={answers}
                  quinipolo={quinipolo}
                  currentAnswer={currentAnswer}
                  seeUserAnswersModeOn={modes.seeUserAnswersModeOn}
                  viewOnlyModeOn={modes.viewOnlyModeOn}
                  answerModeOn={modes.answerModeOn}
                  loading={loading}
                  hasAttemptedSubmit={hasAttemptedSubmit}
                  missingAnswerIndices={missingAnswerIndices}
                  rowRef={(el) => (rowRefs.current[index] = el)}
                  onChange={handleChange}
                  handleGame15Change={handleGame15Change}
                  matchOption={matchOption}
                />
              );
            })}
          </TableBody>
          {!modes.seeUserAnswersModeOn && !modes.viewOnlyModeOn && (
            <SubmitButton
              onClick={submitQuinipolo}
              loading={loading}
              editCorrectionModeOn={modes.editCorrectionModeOn}
              isModerator={isModerator}
            />
          )}
        </Table>
      </TableContainer>
      {quinipolo.id && (
        <ResultsAutoFillModal
          open={resultsModalOpen}
          onClose={() => setResultsModalOpen(false)}
          onConfirm={handleResultsAutoFill}
          quinipoloId={quinipolo.id}
        />
      )}
    </FormControl>
  );
};

export default AnswersForm;
```

---

## Additional Hook: useAnswerValidation

**File**: `hooks/useAnswerValidation.ts`

**Content**:

```typescript
import { useEffect } from "react";
import { AnswersType } from "../types";
import { QuinipoloType } from "../../../types/quinipolo";
import { findMissingAnswers } from "../utils/validationUtils";

export const useAnswerValidation = (
  answers: AnswersType[],
  quinipolo: QuinipoloType,
  seeUserAnswersModeOn: boolean | null,
  viewOnlyModeOn: string | null,
  hasAttemptedSubmit: boolean,
  setMissingAnswerIndices: React.Dispatch<React.SetStateAction<number[]>>
) => {
  useEffect(() => {
    if (seeUserAnswersModeOn) return;
    if (viewOnlyModeOn) return;
    if (!hasAttemptedSubmit) return;
    const matches = quinipolo?.quinipolo || [];
    if (!matches.length) return;

    const missing = findMissingAnswers(answers);
    setMissingAnswerIndices(missing);
  }, [
    answers,
    quinipolo?.quinipolo,
    seeUserAnswersModeOn,
    viewOnlyModeOn,
    hasAttemptedSubmit,
    setMissingAnswerIndices,
  ]);
};
```

**Lines extracted**: 218-246

---

## Implementation Order

### Phase 1: Extract Utilities and Types (Low Risk)

1. Create `types.ts`
2. Create `constants.ts`
3. Create `utils/answerUtils.ts`
4. Create `utils/validationUtils.ts`
5. Create `utils/autoFillUtils.ts`
6. Create `utils/headerUtils.ts`
7. Create `utils/matchOptionUtils.tsx`

### Phase 2: Extract Hooks (Medium Risk)

8. Create `hooks/useAnswersFormModes.ts`
9. Create `hooks/useAnswerValidation.ts`
10. Create `hooks/useAnswerHandlers.ts`
11. Create `hooks/useAnswerSubmission.ts`
12. Create `hooks/useQuinipoloData.ts`

### Phase 3: Extract Components (Medium Risk)

13. Create `components/MatchHeader.tsx`
14. Create `components/MatchWinnerButtons.tsx`
15. Create `components/AutoFillButton.tsx`
16. Create `components/SubmitButton.tsx`
17. Create `components/MatchRow.tsx`

### Phase 4: Refactor Main Component (High Risk)

18. Refactor `AnswersForm.tsx` to use all extracted pieces
19. Test thoroughly
20. Remove unused code

---

## Testing Strategy

1. **Unit Tests**: Test each utility function independently
2. **Hook Tests**: Test each custom hook with React Testing Library
3. **Component Tests**: Test each component in isolation
4. **Integration Tests**: Test the full AnswersForm flow
5. **E2E Tests**: Test all modes (answer, correct, edit, view)

---

## Benefits of This Refactoring

1. **Maintainability**: Each file has a single responsibility
2. **Testability**: Smaller units are easier to test
3. **Reusability**: Components and hooks can be reused
4. **Readability**: Main component is much shorter and easier to understand
5. **Extensibility**: Easy to add new features (like answer percentages)
6. **Performance**: Better code splitting opportunities

---

## Migration Notes

- All existing functionality must be preserved
- No breaking changes to the API
- Styles remain in `AnswersForm.module.scss`
- Existing components (ScoreSummary, GoalsToggleButtonGroup) remain unchanged

---

## Next Steps After Refactoring

Once this refactoring is complete, implementing the answer percentages feature will be much easier:

- Add percentage display logic to `MatchWinnerButtons.tsx`
- Add percentage display logic to `GoalsToggleButtonGroup.tsx`
- Add statistics fetching to `useQuinipoloData.ts`
- Update types to include `answer_statistics`
