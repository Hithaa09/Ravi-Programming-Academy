export type Difficulty = "Easy" | "Medium" | "Hard";

export type InsightsRange = "This Week" | "This Month" | "All Time";

export type QuestionStatus = "Draft" | "Published" | "Archived";

export type QuestionAvailability = "Locked" | "Available";

// Independent of QuestionStatus/QuestionAvailability — a problem's
// Draft/Published lifecycle and Locked/Available visibility say nothing
// about whether it requires purchased access.
export type AccessType = "FREE" | "PREMIUM";

export type ProblemStatus = "Solved" | "Attempted" | "Not Solved";

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface StarterCode {
  python: string;
  javascript: string;
  java: string;
  cpp: string;
  c: string;
  vb: string;
  perl: string;
}

export interface TestCase {
  input: string;
  expected: string;
}

export interface Problem {
  id: number;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  companies: string[];
  acceptance: number;
  status: ProblemStatus;
  description?: string;
  inputFormat?: string;
  outputFormat?: string;
  examples?: ProblemExample[];
  constraints?: string[];
  starterCode?: StarterCode;
  testCases?: TestCase[];
  hiddenTestCases?: TestCase[];
  importedFileName?: string;
  starterCodeByLanguage?: Record<string, string>;
  officialSolutions?: Record<string, string>;
}

export type DbEngine = "MySQL" | "PostgreSQL" | "SQLite";

export interface SqlColumn {
  name: string;
  type: string;
}

export interface SqlSchemaTable {
  name: string;
  columns: SqlColumn[];
}

export interface SqlResultTable {
  columns: string[];
  rows: (string | number)[][];
}

export interface SqlHiddenDataset {
  schemaSql?: string;
  dataSql: string;
  expectedColumns: string[];
  expectedRows: string[][];
}

export interface SqlProblem {
  id: number;
  title: string;
  category: string;
  difficulty: Difficulty;
  status: ProblemStatus;
  description?: string;
  explanation?: string;
  schema?: string;
  schemaSql?: string;
  sampleDataSql?: string;
  starterQuery?: string;
  expectedOutput?: string;
  dbEngine?: DbEngine;
  schemaTables?: SqlSchemaTable[];
  sampleData?: SqlResultTable[];
  expectedResult?: SqlResultTable;
  solutionQuery?: string;
  hiddenDatasets?: SqlHiddenDataset[];
  ignoreRowOrder?: boolean;
  ignoreColumnOrder?: boolean;
  importedFileName?: string;
}

export type SubmissionStatus =
  | "Accepted"
  | "Wrong Answer"
  | "Time Limit Exceeded"
  | "Compilation Error"
  | "Runtime Error"
  | "Memory Limit Exceeded"
  | "Error";

export type SubmissionType = "Programming" | "SQL";

export interface Submission {
  id: number;
  problemTitle: string;
  difficulty: Difficulty;
  status: SubmissionStatus;
  language: string;
  time: string;
  memory: string;
  submittedOn: string;
  type?: SubmissionType;
  studentId?: number;
  studentName?: string;
  studentInitials?: string;
}

export interface Bookmark {
  problemTitle: string;
  difficulty: Difficulty;
  status: ProblemStatus;
  language: string;
  bookmarkedOn: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  initials: string;
  problemsSolved: number;
  totalPoints: number;
  isCurrentUser?: boolean;
  id?: number;
  username?: string;
  programmingSolved?: number;
  sqlSolved?: number;
  successRate?: number;
  score?: number;
  trend?: number | null;
}

export interface ProgressBucket {
  solved: number;
  total: number;
}

export interface CurrentUser {
  name: string;
  fullName: string;
  username: string;
  email: string;
  initials: string;
  streakDays: number;
  stats: {
    totalSolved: number;
    totalSolvedDelta: string;
    totalAttempts: number;
    totalAttemptsDelta: string;
    successRate: number;
    successRateDelta: string;
    hoursPracticed: number;
    hoursPracticedDelta: string;
  };
  programmingProgress: Record<Difficulty, ProgressBucket>;
  sqlProgress: Record<Difficulty, ProgressBucket>;
}

export type StudentStatus = "Active" | "Suspended";

export interface Student {
  id: number;
  name: string;
  username: string;
  email: string;
  initials: string;
  problemsSolved: number;
  programmingSolved: number;
  sqlSolved: number;
  successRate: number;
  joinedOn: string;
  lastActive: string;
  status: StudentStatus;
}

export interface AdminUser {
  name: string;
  username: string;
  email: string;
  phone: string;
  initials: string;
  role: string;
  joinedOn: string;
}

export interface RecentActivityItem {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
}

export interface NotificationItem {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
  unread: boolean;
}

export interface CartItem {
  id: number;
  name: string;
  description: string;
  price: string;
}

export interface ProblemSolvedRecord {
  problemTitle: string;
  type: SubmissionType;
  difficulty: Difficulty;
  language: string;
  solvedOn: string;
  timeTaken: string;
  status: SubmissionStatus;
}

export interface SubscriptionReceipt {
  date: string;
  plan: string;
  amount: string;
}

export interface StudentSubscription {
  planName: string;
  purchaseDate: string;
  receipts: SubscriptionReceipt[];
}
