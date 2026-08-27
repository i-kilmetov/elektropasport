export type GradeId = 1 | 2 | 3 | 4;

export type DiagramId =
  | "water-analogy"
  | "units-trio"
  | "power-kettle"
  | "three-wires"
  | "socket-wiring"
  | "switch-wiring"
  | "overload"
  | "panel-anatomy"
  | "breaker-cutaway"
  | "rcd-leak"
  | "diff-vs-rcd"
  | "cable-amp"
  | "curve-bcd"
  | "read-panel"
  | "din-modules"
  | "n-pe-bus"
  | "apt-scheme"
  | "selectivity"
  | "comb-bar"
  | "assemble-steps"
  | "common-mistakes"
  | "test-panel";

export type LessonBlock =
  | { type: "text"; text: string }
  | {
      type: "callout";
      tone: "tip" | "warn" | "story";
      title: string;
      text: string;
    }
  | { type: "diagram"; id: DiagramId; caption: string }
  | { type: "example"; title: string; text: string }
  | { type: "steps"; title?: string; items: string[] }
  | { type: "formula"; formula: string; explain: string }
  | { type: "compare"; title?: string; items: { label: string; value: string }[] };

export type QuizOption = {
  id: string;
  text: string;
};

export type ChoiceQuestion = {
  id: string;
  kind: "single" | "multi";
  prompt: string;
  options: [QuizOption, QuizOption, QuizOption, QuizOption];
  correct: string[];
  explain: string;
};

export type WrittenQuestion = {
  id: string;
  kind: "written";
  prompt: string;
  /** Normalized accepted answers (lowercase, ё→е, comma→dot). */
  accepted: string[];
  unit?: string;
  hint?: string;
  explain: string;
};

export type SchoolQuestion = ChoiceQuestion | WrittenQuestion;

export type Topic = {
  id: string;
  title: string;
  teaser: string;
  minutes: number;
  blocks: LessonBlock[];
  quiz: SchoolQuestion[];
};

export type SchoolGrade = {
  id: GradeId;
  title: string;
  shortTitle: string;
  subtitle: string;
  promise: string;
  accent: string;
  topics: Topic[];
  exam: SchoolQuestion[];
  /** 10 question ids from this exam, used as placement into the next grade. */
  placementForNext: string[];
};

export type ExamGrade = 2 | 3 | 4 | 5;

export type ExamRecord = {
  score: number;
  total: number;
  grade: ExamGrade;
  at: number;
};

export type GradeProgress = {
  topicPassed: Record<string, boolean>;
  examBest?: ExamRecord;
  examAttempts: number;
  examFailedAt?: number;
  placementPassedAt?: number;
  placementFailedAt?: number;
};

export type SchoolProgress = {
  version: 1;
  grades: Record<GradeId, GradeProgress>;
};
