import clsx from "clsx";
import type { Difficulty, ProblemStatus, QuestionStatus, QuestionAvailability, SubmissionStatus } from "@/lib/types";

const difficultyDot: Record<Difficulty, string> = {
  Easy: "bg-emerald-500",
  Medium: "bg-amber-500",
  Hard: "bg-rose-500",
};
const difficultyText: Record<Difficulty, string> = {
  Easy: "text-emerald-600",
  Medium: "text-amber-600",
  Hard: "text-rose-600",
};

export function DifficultyDot({ difficulty }: { difficulty: Difficulty }) {
  return <span className={clsx("inline-block w-2 h-2 rounded-full", difficultyDot[difficulty])} />;
}

export function DifficultyLabel({ difficulty }: { difficulty: Difficulty }) {
  return <span className={clsx("font-label-md text-label-md font-medium", difficultyText[difficulty])}>{difficulty}</span>;
}

const difficultyPillBg: Record<Difficulty, string> = {
  Easy: "bg-emerald-100",
  Medium: "bg-amber-100",
  Hard: "bg-rose-100",
};

export function DifficultyPill({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", difficultyPillBg[difficulty], difficultyText[difficulty])}>
      {difficulty}
    </span>
  );
}

const statusStyles: Record<ProblemStatus | SubmissionStatus, string> = {
  Solved: "bg-status-solved-bg text-status-solved-text",
  "Not Solved": "bg-status-notsolved-bg text-status-notsolved-text",
  Attempted: "bg-status-attempted-bg text-status-attempted-text",
  Accepted: "bg-status-accepted-bg text-status-accepted-text",
  "Wrong Answer": "bg-status-wrong-bg text-status-wrong-text",
  "Time Limit Exceeded": "bg-status-tle-bg text-status-tle-text",
  Error: "bg-amber-100 text-amber-700",
};

export function StatusBadge({ status }: { status: ProblemStatus | SubmissionStatus }) {
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", statusStyles[status])}>
      {status}
    </span>
  );
}

const questionStatusStyles: Record<QuestionStatus, string> = {
  Draft: "bg-gray-100 text-gray-600",
  Published: "bg-emerald-100 text-emerald-700",
  Archived: "bg-amber-100 text-amber-700",
};

export function QuestionStatusPill({ status }: { status: QuestionStatus }) {
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", questionStatusStyles[status])}>
      {status}
    </span>
  );
}

const availabilityStyles: Record<QuestionAvailability, string> = {
  Available: "bg-sky-100 text-sky-700",
  Locked: "bg-slate-100 text-slate-500",
};

export function AvailabilityPill({ availability }: { availability: QuestionAvailability }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", availabilityStyles[availability])}>
      <span className="material-symbols-outlined text-[12px]">{availability === "Locked" ? "lock" : "lock_open"}</span>
      {availability}
    </span>
  );
}
