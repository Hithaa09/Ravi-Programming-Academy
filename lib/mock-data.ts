import type {
  AdminUser,
  Bookmark,
  CartItem,
  CurrentUser,
  Difficulty,
  InsightsRange,
  LeaderboardEntry,
  NotificationItem,
  Problem,
  ProblemSolvedRecord,
  RecentActivityItem,
  SqlProblem,
  Student,
  StudentSubscription,
  Submission,
  SubmissionStatus,
  SubmissionType,
} from "./types";

export type { InsightsRange };

export const CURRENT_USER: CurrentUser = {
  name: "Srihitha",
  fullName: "Srihitha",
  username: "srihitha_25",
  email: "srihitha@example.com",
  initials: "S",
  streakDays: 12,
  stats: {
    totalSolved: 187,
    totalSolvedDelta: "+12 this week",
    totalAttempts: 243,
    totalAttemptsDelta: "+18 this week",
    successRate: 76,
    successRateDelta: "+6% this week",
    hoursPracticed: 41,
    hoursPracticedDelta: "+5 this week",
  },
  programmingProgress: {
    Easy: { solved: 45, total: 60 },
    Medium: { solved: 52, total: 80 },
    Hard: { solved: 27, total: 50 },
  },
  sqlProgress: {
    Easy: { solved: 16, total: 22 },
    Medium: { solved: 9, total: 25 },
    Hard: { solved: 3, total: 18 },
  },
};

export const STUDENT_NOTIFICATIONS: NotificationItem[] = [
  { icon: "check_circle", iconBg: "#E8F5E9", iconColor: "#4CAF50", title: "Submission Accepted", subtitle: "Your solution for \"Two Sum\" passed all test cases.", time: "10 min ago", unread: true },
  { icon: "emoji_events", iconBg: "#FFF3E0", iconColor: "#FF9800", title: "New Rank Achieved", subtitle: "You moved up to #5 on the leaderboard.", time: "2 hours ago", unread: true },
  { icon: "code", iconBg: "#E3F2FD", iconColor: "#2196F3", title: "New Problem Added", subtitle: "\"Binary Tree Zigzag Traversal\" is now available.", time: "1 day ago", unread: false },
  { icon: "local_fire_department", iconBg: "#FFEBEE", iconColor: "#F44336", title: "Streak Reminder", subtitle: "Solve a problem today to keep your 12-day streak alive.", time: "1 day ago", unread: false },
];

export const STUDENT_CART_ITEMS: CartItem[] = [
  { id: 1, name: "Premium Plan", description: "Unlock all premium problems and contests — one-time payment", price: "₹2,000" },
];

export const ADMIN_NOTIFICATIONS: NotificationItem[] = [
  { icon: "person_add", iconBg: "#E3F2FD", iconColor: "#2196F3", title: "New Student Registered", subtitle: "Rahul Verma just joined the academy.", time: "15 min ago", unread: true },
  { icon: "description", iconBg: "#E8F5E9", iconColor: "#4CAF50", title: "New Submission", subtitle: "Priya Singh submitted a solution for \"Two Sum\".", time: "1 hour ago", unread: true },
  { icon: "report", iconBg: "#FFEBEE", iconColor: "#F44336", title: "Spike in Wrong Answers", subtitle: "\"Binary Search\" has an unusually high failure rate today.", time: "3 hours ago", unread: false },
  { icon: "cloud_upload", iconBg: "#FFF3E0", iconColor: "#FF9800", title: "Bulk Upload Completed", subtitle: "15 problems were added from \"Arrays - Easy Set\".", time: "Yesterday", unread: false },
];

export const ADMIN_USER: AdminUser = {
  name: "Ravi Sir",
  username: "ravi_sir",
  email: "ravi.sir@raviprogramming.com",
  phone: "+91 98765 43210",
  initials: "R",
  role: "Admin & Instructor",
  joinedOn: "Jan 10, 2024",
};

const HAND_WRITTEN_PROBLEMS: Problem[] = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    topics: ["Array", "Hash Table"],
    companies: ["Amazon", "Google"],
    acceptance: 92.1,
    status: "Solved",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
      { input: "nums = [3,3], target = 6", output: "[0,1]" },
    ],
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "Only one valid answer exists."],
    starterCode: {
      python:
        "class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for i, num in enumerate(nums):\n            complement = target - num\n            if complement in seen:\n                return [seen[complement], i]\n            seen[num] = i\n",
      javascript:
        "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (seen.has(complement)) return [seen.get(complement), i];\n    seen.set(nums[i], i);\n  }\n}\n",
      java:
        "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (seen.containsKey(complement)) return new int[]{seen.get(complement), i};\n            seen.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}\n",
      cpp:
        "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int,int> seen;\n        for (int i = 0; i < nums.size(); i++) {\n            int complement = target - nums[i];\n            if (seen.count(complement)) return {seen[complement], i};\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};\n",
      c:
        "int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    for (int i = 0; i < numsSize; i++) {\n        for (int j = i + 1; j < numsSize; j++) {\n            if (nums[i] + nums[j] == target) {\n                int* result = malloc(2 * sizeof(int));\n                result[0] = i;\n                result[1] = j;\n                *returnSize = 2;\n                return result;\n            }\n        }\n    }\n    *returnSize = 0;\n    return NULL;\n}\n",
      vb:
        "Public Class Solution\n    Public Function TwoSum(nums As Integer(), target As Integer) As Integer()\n        Dim seen As New Dictionary(Of Integer, Integer)\n        For i As Integer = 0 To nums.Length - 1\n            Dim complement As Integer = target - nums(i)\n            If seen.ContainsKey(complement) Then\n                Return New Integer() {seen(complement), i}\n            End If\n            seen(nums(i)) = i\n        Next\n        Return New Integer() {}\n    End Function\nEnd Class\n",
      perl:
        "sub two_sum {\n    my (@nums, $target) = @_;\n    my %seen;\n    for my $i (0 .. $#nums) {\n        my $complement = $target - $nums[$i];\n        if (exists $seen{$complement}) {\n            return ($seen{$complement}, $i);\n        }\n        $seen{$nums[$i]} = $i;\n    }\n    return ();\n}\n",
    },
    testCases: [
      { input: "nums = [2,7,11,15], target = 9", expected: "[0,1]" },
      { input: "nums = [3,2,4], target = 6", expected: "[1,2]" },
      { input: "nums = [3,3], target = 6", expected: "[0,1]" },
    ],
  },
  { id: 2, title: "Best Time to Buy and Sell Stock", difficulty: "Easy", topics: ["Array", "Dynamic Programming"], companies: ["Facebook"], acceptance: 88.4, status: "Solved" },
  { id: 3, title: "Contains Duplicate", difficulty: "Easy", topics: ["Array", "Hash Table"], companies: ["Amazon"], acceptance: 85.2, status: "Attempted" },
  { id: 4, title: "Valid Anagram", difficulty: "Easy", topics: ["String", "Hash Table"], companies: ["Google"], acceptance: 90.0, status: "Solved" },
  { id: 5, title: "Merge Two Sorted Lists", difficulty: "Easy", topics: ["Linked List"], companies: ["Microsoft"], acceptance: 87.6, status: "Not Solved" },
  { id: 6, title: "Binary Search", difficulty: "Easy", topics: ["Array", "Binary Search"], companies: ["Apple"], acceptance: 91.3, status: "Solved" },
  { id: 7, title: "Reverse Linked List", difficulty: "Easy", topics: ["Linked List"], companies: ["Amazon"], acceptance: 89.7, status: "Solved" },
  { id: 8, title: "Maximum Subarray", difficulty: "Easy", topics: ["Array", "Dynamic Programming"], companies: ["LinkedIn"], acceptance: 79.5, status: "Attempted" },
  { id: 9, title: "Move Zeroes", difficulty: "Easy", topics: ["Array", "Two Pointers"], companies: ["Facebook"], acceptance: 82.1, status: "Not Solved" },
  { id: 10, title: "Climbing Stairs", difficulty: "Easy", topics: ["Dynamic Programming"], companies: ["Adobe"], acceptance: 86.0, status: "Not Solved" },
  { id: 11, title: "Add Two Numbers", difficulty: "Medium", topics: ["Linked List", "Math"], companies: ["Microsoft"], acceptance: 68.2, status: "Not Solved" },
  { id: 12, title: "Merge Intervals", difficulty: "Medium", topics: ["Array", "Sorting"], companies: ["Google"], acceptance: 65.4, status: "Not Solved" },
  { id: 13, title: "Kth Largest Element in an Array", difficulty: "Medium", topics: ["Heap", "Sorting"], companies: ["Amazon"], acceptance: 70.8, status: "Not Solved" },
  { id: 14, title: "Longest Substring Without Repeating Characters", difficulty: "Medium", topics: ["String", "Sliding Window"], companies: ["Amazon", "Bloomberg"], acceptance: 67.3, status: "Not Solved" },
  { id: 15, title: "3Sum", difficulty: "Medium", topics: ["Array", "Two Pointers"], companies: ["Facebook"], acceptance: 60.1, status: "Not Solved" },
  { id: 16, title: "Word Break", difficulty: "Medium", topics: ["Dynamic Programming"], companies: ["Google"], acceptance: 63.5, status: "Not Solved" },
  { id: 17, title: "Course Schedule", difficulty: "Medium", topics: ["Graph", "Topological Sort"], companies: ["Microsoft"], acceptance: 62.0, status: "Not Solved" },
  { id: 18, title: "Trapping Rain Water", difficulty: "Hard", topics: ["Array", "Two Pointers"], companies: ["Amazon"], acceptance: 58.9, status: "Not Solved" },
  { id: 19, title: "Merge k Sorted Lists", difficulty: "Hard", topics: ["Linked List", "Heap"], companies: ["Google"], acceptance: 55.2, status: "Not Solved" },
  { id: 20, title: "Burst Balloons", difficulty: "Hard", topics: ["Dynamic Programming"], companies: ["Goldman Sachs"], acceptance: 52.7, status: "Attempted" },
  { id: 21, title: "Median of Two Sorted Arrays", difficulty: "Hard", topics: ["Array", "Binary Search"], companies: ["Google"], acceptance: 41.3, status: "Not Solved" },
  { id: 22, title: "N-Queens", difficulty: "Hard", topics: ["Backtracking"], companies: ["Apple"], acceptance: 60.4, status: "Not Solved" },
  { id: 23, title: "Word Ladder", difficulty: "Hard", topics: ["Graph", "BFS"], companies: ["Amazon"], acceptance: 45.9, status: "Not Solved" },
  { id: 24, title: "Single Number", difficulty: "Easy", topics: ["Array", "Bit Manipulation"], companies: ["Airbnb"], acceptance: 93.4, status: "Not Solved" },
];

const FILLER_TOPICS: string[][] = [
  ["Array", "Sorting"], ["String", "Two Pointers"], ["Tree", "DFS"], ["Graph", "BFS"],
  ["Dynamic Programming"], ["Stack", "Queue"], ["Hash Table"], ["Linked List"],
  ["Binary Search"], ["Greedy"], ["Heap", "Sorting"], ["Backtracking"],
];
const FILLER_DIFFICULTIES: Difficulty[] = ["Easy", "Easy", "Medium", "Medium", "Hard"];

function generateFillerProblems(count: number, startId: number): Problem[] {
  const out: Problem[] = [];
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const difficulty = FILLER_DIFFICULTIES[i % FILLER_DIFFICULTIES.length];
    out.push({
      id,
      title: `Practice Problem ${id}`,
      difficulty,
      topics: FILLER_TOPICS[i % FILLER_TOPICS.length],
      companies: ["Various"],
      acceptance: Math.round((40 + ((i * 7) % 55)) * 10) / 10,
      status: i % 5 === 0 ? "Solved" : i % 5 === 1 ? "Attempted" : "Not Solved",
    });
  }
  return out;
}

export const PROBLEMS: Problem[] = [
  ...HAND_WRITTEN_PROBLEMS,
  ...generateFillerProblems(120 - HAND_WRITTEN_PROBLEMS.length, HAND_WRITTEN_PROBLEMS.length + 1),
];

function genericProblemDetail(p: Problem): Required<Pick<Problem, "description" | "examples" | "constraints" | "starterCode" | "testCases">> {
  return {
    description: `Solve "${p.title}". Read the problem statement carefully, consider the constraints, and write an efficient solution.`,
    examples: [{ input: "Sample input", output: "Sample output", explanation: "Explanation of the sample case." }],
    constraints: ["1 <= input size <= 10^4", "Time limit: 2s", "Memory limit: 256MB"],
    starterCode: {
      python: "class Solution:\n    def solve(self, *args):\n        pass\n",
      javascript: "function solve(...args) {\n  // write your solution\n}\n",
      java: "class Solution {\n    public void solve() {\n        // write your solution\n    }\n}\n",
      cpp: "class Solution {\npublic:\n    void solve() {\n        // write your solution\n    }\n};\n",
      c: "void solve(void) {\n    // write your solution\n}\n",
      vb: "Public Class Solution\n    Public Sub Solve()\n        ' write your solution\n    End Sub\nEnd Class\n",
      perl: "sub solve {\n    # write your solution\n}\n",
    },
    testCases: [
      { input: "Case 1 input", expected: "Case 1 expected output" },
      { input: "Case 2 input", expected: "Case 2 expected output" },
    ],
  };
}

export function getProblemById(id: number): Problem | null {
  const p = PROBLEMS.find((p) => p.id === id);
  if (!p) return null;
  if (!p.description) Object.assign(p, genericProblemDetail(p));
  return p;
}

const HAND_WRITTEN_SQL_PROBLEMS: SqlProblem[] = [
  {
    id: 1, title: "Select All Employees", category: "Basic Queries", difficulty: "Easy", status: "Solved",
    description: "Write a query to select all columns for every row in the Employees table.",
    schema: "Employees(id INT, name VARCHAR, department VARCHAR, salary INT)",
    starterQuery: "SELECT *\nFROM Employees;",
    expectedOutput: "All rows from Employees",
    dbEngine: "MySQL",
    schemaTables: [
      {
        name: "Employees",
        columns: [
          { name: "id", type: "INT" },
          { name: "name", type: "VARCHAR(100)" },
          { name: "department", type: "VARCHAR(50)" },
          { name: "salary", type: "INT" },
        ],
      },
    ],
    sampleData: [
      {
        columns: ["id", "name", "department", "salary"],
        rows: [
          [1, "Alice Johnson", "Engineering", 85000],
          [2, "Brian Lee", "Marketing", 62000],
          [3, "Carla Mendes", "Engineering", 91000],
          [4, "David Kim", "Sales", 58000],
        ],
      },
    ],
    expectedResult: {
      columns: ["id", "name", "department", "salary"],
      rows: [
        [1, "Alice Johnson", "Engineering", 85000],
        [2, "Brian Lee", "Marketing", 62000],
        [3, "Carla Mendes", "Engineering", 91000],
        [4, "David Kim", "Sales", 58000],
      ],
    },
    solutionQuery: "SELECT *\nFROM Employees;",
  },
  { id: 2, title: "Filter Customers by Country", category: "Basic Queries", difficulty: "Easy", status: "Solved" },
  { id: 3, title: "Employees Earning Above Average", category: "Basic Queries", difficulty: "Medium", status: "Not Solved" },
  { id: 4, title: "Customers with Orders", category: "Joins", difficulty: "Easy", status: "Solved" },
  { id: 5, title: "Department Salary", category: "Joins", difficulty: "Medium", status: "Attempted" },
  { id: 6, title: "Find Managers and Their Reports", category: "Joins", difficulty: "Medium", status: "Not Solved" },
  { id: 7, title: "Top Paid Employee per Department", category: "Subqueries", difficulty: "Medium", status: "Not Solved" },
  { id: 8, title: "Products Never Ordered", category: "Subqueries", difficulty: "Easy", status: "Solved" },
  { id: 9, title: "Customers with No Orders", category: "Subqueries", difficulty: "Medium", status: "Not Solved" },
  { id: 10, title: "Rank Employees by Salary", category: "Window Functions", difficulty: "Medium", status: "Not Solved" },
  { id: 11, title: "Running Total of Sales", category: "Window Functions", difficulty: "Hard", status: "Not Solved" },
  { id: 12, title: "Year-over-Year Growth", category: "Window Functions", difficulty: "Hard", status: "Not Solved" },
  { id: 13, title: "Employee Salary Query", category: "Basic Queries", difficulty: "Easy", status: "Solved" },
];

const SQL_FILLER_CATEGORIES: SqlProblem["category"][] = ["Basic Queries", "Joins", "Subqueries", "Window Functions"];

function generateFillerSqlProblems(count: number, startId: number): SqlProblem[] {
  const out: SqlProblem[] = [];
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    out.push({
      id,
      title: `SQL Practice Problem ${id}`,
      category: SQL_FILLER_CATEGORIES[i % SQL_FILLER_CATEGORIES.length],
      difficulty: FILLER_DIFFICULTIES[i % FILLER_DIFFICULTIES.length],
      status: i % 5 === 0 ? "Solved" : i % 5 === 1 ? "Attempted" : "Not Solved",
    });
  }
  return out;
}

export const SQL_PROBLEMS: SqlProblem[] = [
  ...HAND_WRITTEN_SQL_PROBLEMS,
  ...generateFillerSqlProblems(65 - HAND_WRITTEN_SQL_PROBLEMS.length, HAND_WRITTEN_SQL_PROBLEMS.length + 1),
];

export function getSqlProblemById(id: number): SqlProblem | null {
  const p = SQL_PROBLEMS.find((p) => p.id === id);
  if (!p) return null;
  if (!p.description) {
    Object.assign(p, {
      description: `Write a SQL query to solve "${p.title}".`,
      schema: "Table schema relevant to this problem (mock).",
      starterQuery: "SELECT\nFROM Orders;",
      expectedOutput: "Expected result set (mock).",
      dbEngine: "MySQL",
      schemaTables: [
        {
          name: "Orders",
          columns: [
            { name: "id", type: "INT" },
            { name: "customer_name", type: "VARCHAR(100)" },
            { name: "amount", type: "DECIMAL(10,2)" },
            { name: "order_date", type: "DATE" },
          ],
        },
      ],
      sampleData: [
        {
          columns: ["id", "customer_name", "amount", "order_date"],
          rows: [
            [101, "Ananya Rao", 250.0, "2026-01-12"],
            [102, "Vikram Shah", 89.5, "2026-01-14"],
            [103, "Meera Iyer", 412.75, "2026-01-15"],
          ],
        },
      ],
      expectedResult: {
        columns: ["id", "customer_name", "amount"],
        rows: [
          [101, "Ananya Rao", 250.0],
          [102, "Vikram Shah", 89.5],
          [103, "Meera Iyer", 412.75],
        ],
      },
      solutionQuery: "SELECT id, customer_name, amount\nFROM Orders;",
    });
  }
  return p;
}

const LANGUAGES = ["Python 3", "C++", "Java", "JavaScript"];

function generateSubmissions(): Submission[] {
  const pool = PROBLEMS.slice(0, 12);
  const statuses: SubmissionStatus[] = ["Accepted", "Accepted", "Accepted", "Wrong Answer", "Accepted", "Accepted", "Time Limit Exceeded"];
  const rows: Submission[] = [];
  let day = 21, hour = 10, minute = 45;
  for (let i = 0; i < 24; i++) {
    const problem = pool[i % pool.length];
    const status = statuses[i % statuses.length];
    const language = LANGUAGES[i % LANGUAGES.length];
    const time = status === "Time Limit Exceeded" ? "2000 ms" : `${30 + (i * 7) % 150} ms`;
    const memory = status === "Time Limit Exceeded" ? "—" : `${(6 + (i % 8)).toFixed(1)} MB`;
    minute -= 13;
    if (minute < 0) { minute += 60; hour -= 1; }
    if (hour < 0) { hour = 23; day -= 1; }
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = ((hour + 11) % 12) + 1;
    rows.push({
      id: i + 1,
      problemTitle: problem.title,
      difficulty: problem.difficulty,
      status,
      language,
      time,
      memory,
      submittedOn: `${day < 10 ? "0" + day : day} May 2025, ${hour12}:${minute < 10 ? "0" + minute : minute} ${ampm}`,
    });
  }
  return rows;
}
export const SUBMISSIONS: Submission[] = generateSubmissions();

export const BOOKMARKS: Bookmark[] = [
  { problemTitle: "Two Sum", difficulty: "Easy", status: "Solved", language: "C++", bookmarkedOn: "21 May 2025, 10:45 AM" },
  { problemTitle: "Best Time to Buy and Sell Stock", difficulty: "Easy", status: "Solved", language: "Python 3", bookmarkedOn: "21 May 2025, 10:32 AM" },
  { problemTitle: "Trapping Rain Water", difficulty: "Hard", status: "Not Solved", language: "Java", bookmarkedOn: "20 May 2025, 09:15 PM" },
  { problemTitle: "Merge Intervals", difficulty: "Medium", status: "Not Solved", language: "Python 3", bookmarkedOn: "20 May 2025, 08:50 PM" },
  { problemTitle: "Maximum Subarray", difficulty: "Easy", status: "Attempted", language: "Python 3", bookmarkedOn: "20 May 2025, 07:45 PM" },
  { problemTitle: "Merge k Sorted Lists", difficulty: "Hard", status: "Not Solved", language: "C++", bookmarkedOn: "19 May 2025, 11:20 PM" },
  { problemTitle: "Valid Anagram", difficulty: "Easy", status: "Solved", language: "Python 3", bookmarkedOn: "19 May 2025, 09:10 PM" },
  { problemTitle: "Kth Largest Element in an Array", difficulty: "Medium", status: "Not Solved", language: "Java", bookmarkedOn: "18 May 2025, 06:30 PM" },
  { problemTitle: "Binary Search", difficulty: "Easy", status: "Solved", language: "C++", bookmarkedOn: "18 May 2025, 05:22 PM" },
  { problemTitle: "Burst Balloons", difficulty: "Hard", status: "Attempted", language: "Python 3", bookmarkedOn: "17 May 2025, 11:05 PM" },
  { problemTitle: "3Sum", difficulty: "Medium", status: "Not Solved", language: "JavaScript", bookmarkedOn: "16 May 2025, 08:40 PM" },
  { problemTitle: "Word Break", difficulty: "Medium", status: "Not Solved", language: "Python 3", bookmarkedOn: "15 May 2025, 06:12 PM" },
  { problemTitle: "N-Queens", difficulty: "Hard", status: "Not Solved", language: "C++", bookmarkedOn: "14 May 2025, 09:02 PM" },
  { problemTitle: "Single Number", difficulty: "Easy", status: "Solved", language: "Java", bookmarkedOn: "13 May 2025, 04:18 PM" },
];

// Student-facing leaderboard. Kept independent of the admin roster below —
// CURRENT_USER ("Srihitha" / displayed here as "Sree Krishna") must stay in
// this list so the "isCurrentUser" highlight on /leaderboard keeps working.
function generateLeaderboard(): LeaderboardEntry[] {
  const top = [
    { name: "Arjun Reddy", initials: "AR", problemsSolved: 286, totalPoints: 12450 },
    { name: "Sree Krishna", initials: "SK", problemsSolved: 243, totalPoints: 10920 },
    { name: "Vamsi Prasad", initials: "VP", problemsSolved: 219, totalPoints: 9560 },
    { name: "Pooja S", initials: "PS", problemsSolved: 198, totalPoints: 8430 },
    { name: "Nikhil Kumar", initials: "NK", problemsSolved: 176, totalPoints: 7650 },
    { name: "Sahithi A", initials: "SA", problemsSolved: 167, totalPoints: 7120 },
    { name: "Rahul Manu", initials: "RM", problemsSolved: 153, totalPoints: 6480 },
    { name: "Devi Gowda", initials: "DG", problemsSolved: 142, totalPoints: 5980 },
    { name: "Ankit Kumar", initials: "AK", problemsSolved: 128, totalPoints: 5320 },
    { name: "Manoj Ch", initials: "MC", problemsSolved: 114, totalPoints: 4780 },
  ];
  const fillerFirst = ["Vikram", "Anitha", "Suresh", "Lakshmi", "Karthik", "Divya", "Rohit", "Meena", "Sandeep", "Priyanka"];
  const fillerLast = ["Rao", "Iyer", "Naidu", "Pillai", "Verma", "Shetty", "Bhat", "Menon", "Chowdary", "Patil"];
  const rest = [];
  for (let i = 0; i < 30; i++) {
    const name = `${fillerFirst[i % fillerFirst.length]} ${fillerLast[i % fillerLast.length]}`;
    const initials = name.split(" ").map((w) => w[0]).join("");
    rest.push({ name, initials, problemsSolved: Math.max(10, 110 - i * 3), totalPoints: Math.max(500, 4700 - i * 130) });
  }
  return [...top, ...rest].map((row, i) => ({ rank: i + 1, ...row, isCurrentUser: row.name === "Sree Krishna" }));
}
export const LEADERBOARD: LeaderboardEntry[] = generateLeaderboard();

// --- Admin roster -----------------------------------------------------
// Seed list matches the names/numbers shown in the admin panel design.
const STUDENT_SEED: Omit<Student, "id" | "initials" | "email" | "username" | "lastActive">[] = [
  { name: "Rahul Verma", programmingSolved: 182, sqlSolved: 54, problemsSolved: 236, successRate: 78.45, joinedOn: "May 20, 2025", status: "Active" },
  { name: "Priya Singh", programmingSolved: 164, sqlSolved: 48, problemsSolved: 212, successRate: 75.47, joinedOn: "May 11, 2025", status: "Active" },
  { name: "Akash Sharma", programmingSolved: 140, sqlSolved: 36, problemsSolved: 176, successRate: 72.41, joinedOn: "May 12, 2025", status: "Active" },
  { name: "Neha Gupta", programmingSolved: 128, sqlSolved: 32, problemsSolved: 160, successRate: 70.80, joinedOn: "May 14, 2025", status: "Active" },
  { name: "Vikram Patel", programmingSolved: 110, sqlSolved: 28, problemsSolved: 138, successRate: 71.05, joinedOn: "May 15, 2025", status: "Active" },
  { name: "Siddharth Kumar", programmingSolved: 102, sqlSolved: 26, problemsSolved: 128, successRate: 69.53, joinedOn: "May 16, 2025", status: "Active" },
  { name: "Meera Patel", programmingSolved: 96, sqlSolved: 24, problemsSolved: 120, successRate: 68.97, joinedOn: "May 17, 2025", status: "Active" },
  { name: "Arjun Agarwal", programmingSolved: 88, sqlSolved: 20, problemsSolved: 108, successRate: 67.65, joinedOn: "May 18, 2025", status: "Suspended" },
  { name: "Rohan Kapoor", programmingSolved: 84, sqlSolved: 18, problemsSolved: 102, successRate: 66.67, joinedOn: "May 19, 2025", status: "Active" },
  { name: "Tanvi Sharma", programmingSolved: 80, sqlSolved: 16, problemsSolved: 96, successRate: 65.75, joinedOn: "May 20, 2025", status: "Active" },
];

const FILLER_FIRST_NAMES = ["Aditya", "Sanya", "Kabir", "Riya", "Aryan", "Ishaan", "Diya", "Yash", "Tara", "Vivaan", "Ananya", "Kunal", "Sneha", "Manav", "Pallavi"];
const FILLER_LAST_NAMES = ["Joshi", "Bose", "Khanna", "Malhotra", "Chatterjee", "Reddy", "Nair", "Saxena", "Trivedi", "Bhatt"];

function generateStudents(): Student[] {
  const seeded = STUDENT_SEED.map((s, i) => ({
    id: i + 1,
    ...s,
    username: `${s.name.toLowerCase().split(" ")[0]}_${(i + 1) * 7 + 18}`,
    email: `${s.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    initials: s.name.split(" ").map((w) => w[0]).join(""),
    lastActive: i === 0 ? "May 19, 2025, 10:45 AM" : `May ${19 - (i % 10)}, 2025, ${9 + (i % 8)}:${(i * 7) % 60 < 10 ? "0" : ""}${(i * 7) % 60} AM`,
  }));

  const filler: Student[] = [];
  const total = 245;
  for (let i = seeded.length; i < total; i++) {
    const first = FILLER_FIRST_NAMES[i % FILLER_FIRST_NAMES.length];
    const last = FILLER_LAST_NAMES[i % FILLER_LAST_NAMES.length];
    const name = `${first} ${last}`;
    const programmingSolved = Math.max(2, 78 - (i % 60));
    const sqlSolved = Math.max(1, 16 - (i % 14));
    filler.push({
      id: i + 1,
      name,
      username: `${first.toLowerCase()}_${(i * 3 + 11) % 99}`,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      initials: name.split(" ").map((w) => w[0]).join(""),
      programmingSolved,
      sqlSolved,
      problemsSolved: programmingSolved + sqlSolved,
      successRate: Math.round((50 + ((i * 11) % 35)) * 100) / 100,
      joinedOn: `${(i % 27) + 1} ${["Jan", "Feb", "Mar", "Apr"][i % 4]} 2025`,
      lastActive: `May ${(i % 18) + 1}, 2025, ${(i % 11) + 1}:${(i * 3) % 60 < 10 ? "0" : ""}${(i * 3) % 60} ${i % 2 === 0 ? "AM" : "PM"}`,
      status: i % 17 === 0 ? "Suspended" : "Active",
    });
  }
  return [...seeded, ...filler];
}
export const STUDENTS: Student[] = generateStudents();

export function getStudentById(id: number): Student | null {
  return STUDENTS.find((s) => s.id === id) ?? null;
}

function deterministicTrend(i: number): number | null {
  const pattern = [2, 1, -2, null, 3, -1, null, 2, -1, null];
  if (i < pattern.length) return pattern[i];
  const v = ((i * 5) % 7) - 3;
  return v === 0 ? null : v;
}

export function getAdminLeaderboard(): LeaderboardEntry[] {
  return STUDENTS.map((s, i) => ({
    rank: i + 1,
    id: s.id,
    name: s.name,
    username: s.username,
    initials: s.initials,
    problemsSolved: s.problemsSolved,
    programmingSolved: s.programmingSolved,
    sqlSolved: s.sqlSolved,
    successRate: s.successRate,
    totalPoints: s.problemsSolved * 10,
    score: s.problemsSolved * 10,
    trend: deterministicTrend(i),
  }));
}
export const ADMIN_LEADERBOARD: LeaderboardEntry[] = getAdminLeaderboard();

const LEADERBOARD_RANGE_FACTOR: Record<InsightsRange, number> = {
  "This Week": 0.22,
  "This Month": 1,
  "All Time": 4.5,
};

export function getAdminLeaderboardByRange(range: InsightsRange): LeaderboardEntry[] {
  const factor = LEADERBOARD_RANGE_FACTOR[range];
  return ADMIN_LEADERBOARD
    .map((e) => {
      const programmingSolved = Math.max(0, Math.round((e.programmingSolved ?? 0) * factor));
      const sqlSolved = Math.max(0, Math.round((e.sqlSolved ?? 0) * factor));
      const problemsSolved = programmingSolved + sqlSolved;
      return { ...e, programmingSolved, sqlSolved, problemsSolved, score: problemsSolved * 10 };
    })
    .sort((a, b) => b.problemsSolved - a.problemsSolved)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

const PROBLEM_POOL_FOR_SUBMISSIONS: { title: string; difficulty: Difficulty; type: SubmissionType }[] = [
  ...PROBLEMS.slice(0, 20).map((p) => ({ title: p.title, difficulty: p.difficulty, type: "Programming" as SubmissionType })),
  ...SQL_PROBLEMS.slice(0, 10).map((p) => ({ title: p.title, difficulty: p.difficulty, type: "SQL" as SubmissionType })),
];

function buildSubmissionsForStudent(student: Student, accepted: number, wrong: number, tle: number): Submission[] {
  const total = accepted + wrong + tle;
  const rows: Submission[] = [];
  let day = 19, hour = 10, minute = 30;
  const wrongEvery = wrong > 0 ? Math.max(1, Math.round(total / wrong)) : Infinity;
  const tleEvery = tle > 0 ? Math.max(1, Math.round(total / tle)) : Infinity;
  let wrongUsed = 0, tleUsed = 0;
  for (let i = 0; i < total; i++) {
    let status: SubmissionStatus = "Accepted";
    if (tleUsed < tle && (i + 1) % tleEvery === 0) { status = "Time Limit Exceeded"; tleUsed++; }
    else if (wrongUsed < wrong && (i + 1) % wrongEvery === 0) { status = "Wrong Answer"; wrongUsed++; }
    const entry = PROBLEM_POOL_FOR_SUBMISSIONS[(i + student.id) % PROBLEM_POOL_FOR_SUBMISSIONS.length];
    const language = entry.type === "SQL" ? "MySQL" : LANGUAGES[i % LANGUAGES.length];
    const time = status === "Wrong Answer" ? "—" : status === "Time Limit Exceeded" ? "2000 ms" : `${40 + (i * 11) % 280} ms`;
    const memory = status === "Wrong Answer" || entry.type === "SQL" ? "—" : `${(14 + (i % 12)).toFixed(1)} MB`;
    minute -= 15;
    if (minute < 0) { minute += 60; hour -= 1; }
    if (hour < 0) { hour = 23; day -= 1; }
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = ((hour + 11) % 12) + 1;
    rows.push({
      id: i + 1,
      problemTitle: entry.title,
      difficulty: entry.difficulty,
      status,
      language,
      time,
      memory,
      submittedOn: `May ${day < 10 ? "0" + day : day}, 2025, ${hour12}:${minute < 10 ? "0" + minute : minute} ${ampm}`,
      type: entry.type,
      studentId: student.id,
      studentName: student.name,
      studentInitials: student.initials,
    });
  }
  return rows;
}

const studentSubmissionsCache = new Map<number, Submission[]>();
export function getStudentSubmissions(studentId: number): Submission[] {
  if (studentSubmissionsCache.has(studentId)) return studentSubmissionsCache.get(studentId)!;
  const student = getStudentById(studentId);
  if (!student) return [];
  let accepted: number, wrong: number, tle: number;
  if (studentId === 1) {
    accepted = 236; wrong = 58; tle = 4;
  } else {
    accepted = student.problemsSolved;
    const totalFromRate = student.successRate > 0 ? Math.round((accepted / student.successRate) * 100) : accepted;
    const remainder = Math.max(0, totalFromRate - accepted);
    wrong = Math.round(remainder * 0.9);
    tle = Math.max(0, remainder - wrong);
  }
  const rows = buildSubmissionsForStudent(student, accepted, wrong, tle);
  studentSubmissionsCache.set(studentId, rows);
  return rows;
}

export function getStudentProblemsSolved(studentId: number): ProblemSolvedRecord[] {
  return getStudentSubmissions(studentId)
    .filter((s) => s.status === "Accepted")
    .map((s) => ({
      problemTitle: s.problemTitle,
      type: s.type ?? "Programming",
      difficulty: s.difficulty,
      language: s.language,
      solvedOn: s.submittedOn,
      timeTaken: s.time,
      status: s.status,
    }));
}

export function getStudentActivity(studentId: number): RecentActivityItem[] {
  const subs = getStudentSubmissions(studentId).slice(0, 6);
  return subs.map((s, i) => ({
    icon: s.status === "Accepted" ? "check_circle" : s.status === "Wrong Answer" ? "cancel" : "schedule",
    iconBg: s.status === "Accepted" ? "#E8F5E9" : s.status === "Wrong Answer" ? "#FFEBEE" : "#FFF3E0",
    iconColor: s.status === "Accepted" ? "#4CAF50" : s.status === "Wrong Answer" ? "#F44336" : "#FF9800",
    title: `${s.status} — ${s.problemTitle}`,
    subtitle: `${s.type ?? "Programming"} · ${s.language}`,
    time: i === 0 ? "2 hours ago" : `${i + 1} days ago`,
  }));
}

// There is only a single plan, bought as a one-time payment (no recurring
// billing, no tiers) — every student has exactly one receipt for it.
const SUBSCRIPTION_PLAN_NAME = "Premium Plan";
const SUBSCRIPTION_PLAN_PRICE = "₹2,000";

export function getStudentSubscription(): StudentSubscription {
  return {
    planName: SUBSCRIPTION_PLAN_NAME,
    purchaseDate: "May 19, 2025",
    receipts: [{ date: "May 19, 2025", plan: SUBSCRIPTION_PLAN_NAME, amount: SUBSCRIPTION_PLAN_PRICE }],
  };
}

// All-platform submissions table (admin > Submissions). Independent of any
// single student's generated list above; this is its own deterministic feed.
function generateGlobalSubmissions(count: number): Submission[] {
  const rows: Submission[] = [];
  let day = 19, hour = 10, minute = 30;
  const statuses: SubmissionStatus[] = ["Accepted", "Accepted", "Accepted", "Wrong Answer", "Accepted", "Time Limit Exceeded", "Accepted", "Wrong Answer"];
  for (let i = 0; i < count; i++) {
    const student = STUDENTS[i % 10];
    const entry = PROBLEM_POOL_FOR_SUBMISSIONS[i % PROBLEM_POOL_FOR_SUBMISSIONS.length];
    const status = statuses[i % statuses.length];
    const language = entry.type === "SQL" ? "MySQL" : LANGUAGES[i % LANGUAGES.length];
    const time = status === "Wrong Answer" ? "—" : status === "Time Limit Exceeded" ? "2000 ms" : `${40 + (i * 11) % 280} ms`;
    const memory = status === "Wrong Answer" || entry.type === "SQL" ? "—" : `${(14 + (i % 12)).toFixed(1)} MB`;
    minute -= 11;
    if (minute < 0) { minute += 60; hour -= 1; }
    if (hour < 0) { hour = 23; day -= 1; }
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = ((hour + 11) % 12) + 1;
    rows.push({
      id: i + 1,
      problemTitle: entry.title,
      difficulty: entry.difficulty,
      status,
      language,
      time,
      memory,
      submittedOn: `May ${day < 10 ? "0" + day : day}, 2025, ${hour12}:${minute < 10 ? "0" + minute : minute} ${ampm}`,
      type: entry.type,
      studentId: student.id,
      studentName: student.name,
      studentInitials: student.initials,
    });
  }
  return rows;
}
export const GLOBAL_SUBMISSIONS: Submission[] = generateGlobalSubmissions(60);
export const GLOBAL_SUBMISSIONS_STATS = {
  total: 1248,
  accepted: 932,
  acceptedPct: 74.68,
  wrongAnswer: 268,
  wrongAnswerPct: 21.47,
  runtimeErrors: 48,
  runtimeErrorsPct: 3.85,
};

// Deterministic (no Math.random) so server and client render identically.
function generateWeeklyActivity(): number[][] {
  const cols = 22;
  const rows = 7;
  const grid: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const col: number[] = [];
    for (let r = 0; r < rows; r++) {
      const seed = (c * 7 + r * 3 + c * r) % 9;
      col.push(seed < 4 ? 0 : seed < 6 ? 1 : seed < 7 ? 2 : seed < 8 ? 3 : 4);
    }
    grid.push(col);
  }
  return grid;
}
export const WEEKLY_ACTIVITY: number[][] = generateWeeklyActivity();

export const ADMIN_STATS = {
  totalStudents: STUDENTS.length,
  totalProblems: PROBLEMS.length,
  totalSqlProblems: SQL_PROBLEMS.length,
  totalSubmissions: 18542,
  newStudentsThisWeek: 28,
};

export const ADMIN_LEADERBOARD_STATS = {
  totalStudents: STUDENTS.length,
  programmingSolvedTotal: 18732,
  sqlSolvedTotal: 6524,
  totalProblemsSolved: 25256,
  averageSuccessRate: 74.68,
};

export const STUDENT_INSIGHTS_BY_RANGE: Record<InsightsRange, {
  activeStudents: number; activeStudentsDelta: string;
  avgProblemsPerStudent: number; avgProblemsPerStudentDelta: string;
  problemsSolved: number; problemsSolvedDelta: string;
  avgAccuracy: number; avgAccuracyDelta: string;
}> = {
  "This Week": {
    activeStudents: 86, activeStudentsDelta: "+4.2%",
    avgProblemsPerStudent: 4.8, avgProblemsPerStudentDelta: "+0.6%",
    problemsSolved: 412, problemsSolvedDelta: "+9.1%",
    avgAccuracy: 70.1, avgAccuracyDelta: "+2.0%",
  },
  "This Month": {
    activeStudents: 142, activeStudentsDelta: "+12.5%",
    avgProblemsPerStudent: 8.9, avgProblemsPerStudentDelta: "+1.4%",
    problemsSolved: 1265, problemsSolvedDelta: "+15.6%",
    avgAccuracy: 72.4, avgAccuracyDelta: "+5.8%",
  },
  "All Time": {
    activeStudents: STUDENTS.length, activeStudentsDelta: "+18.0%",
    avgProblemsPerStudent: Math.round((ADMIN_LEADERBOARD_STATS.totalProblemsSolved / STUDENTS.length) * 10) / 10, avgProblemsPerStudentDelta: "+22.3%",
    problemsSolved: ADMIN_LEADERBOARD_STATS.totalProblemsSolved, problemsSolvedDelta: "+28.0%",
    avgAccuracy: ADMIN_LEADERBOARD_STATS.averageSuccessRate, avgAccuracyDelta: "+9.4%",
  },
};

export const PROBLEMS_SOLVED_TREND = [
  { label: "May 1", value: 310 }, { label: "May 4", value: 420 }, { label: "May 7", value: 540 },
  { label: "May 10", value: 460 }, { label: "May 13", value: 600 }, { label: "May 16", value: 560 },
  { label: "May 19", value: 700 }, { label: "May 22", value: 650 }, { label: "May 25", value: 690 },
  { label: "May 28", value: 760 }, { label: "May 31", value: 920 },
];

export const PROBLEMS_SOLVED_TREND_BY_RANGE: Record<InsightsRange, { label: string; value: number }[]> = {
  "This Week": [
    { label: "May 25", value: 48 }, { label: "May 26", value: 52 }, { label: "May 27", value: 55 },
    { label: "May 28", value: 61 }, { label: "May 29", value: 58 }, { label: "May 30", value: 64 },
    { label: "May 31", value: 74 },
  ],
  "This Month": PROBLEMS_SOLVED_TREND,
  "All Time": [
    { label: "Dec", value: 3200 }, { label: "Jan", value: 3600 }, { label: "Feb", value: 3900 },
    { label: "Mar", value: 4400 }, { label: "Apr", value: 4800 }, { label: "May", value: 5356 },
  ],
};

function generateSubmissionsOverview() {
  const out: { label: string; programming: number; sql: number }[] = [];
  const labels = ["May 1", "", "", "May 7", "", "", "May 13", "", "", "May 19", "", "", "May 25", "", "", "May 31"];
  for (let i = 0; i < labels.length; i++) {
    out.push({
      label: labels[i],
      programming: 700 + ((i * 233) % 2600),
      sql: 300 + ((i * 157) % 1200),
    });
  }
  return out;
}
export const SUBMISSIONS_OVERVIEW = generateSubmissionsOverview();

function generateSubmissionsOverviewForRange(range: InsightsRange) {
  if (range === "This Week") {
    const labels = ["May 25", "May 26", "May 27", "May 28", "May 29", "May 30", "May 31"];
    return labels.map((label, i) => ({
      label,
      programming: 320 + ((i * 97) % 420),
      sql: 140 + ((i * 61) % 220),
    }));
  }
  if (range === "All Time") {
    const labels = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
    return labels.map((label, i) => ({
      label,
      programming: 2600 + ((i * 733) % 2400),
      sql: 900 + ((i * 411) % 1100),
    }));
  }
  return SUBMISSIONS_OVERVIEW;
}

export const SUBMISSIONS_OVERVIEW_BY_RANGE: Record<InsightsRange, { label: string; programming: number; sql: number }[]> = {
  "This Week": generateSubmissionsOverviewForRange("This Week"),
  "This Month": SUBMISSIONS_OVERVIEW,
  "All Time": generateSubmissionsOverviewForRange("All Time"),
};

export const RECENT_ACTIVITY: RecentActivityItem[] = [
  { icon: "code", iconBg: "#E3F2FD", iconColor: "#2196F3", title: "Added Problem", subtitle: "Two Sum", time: "2 hours ago" },
  { icon: "person_add", iconBg: "#E8F5E9", iconColor: "#4CAF50", title: "Added Problem", subtitle: "Employee Salary Query", time: "5 hours ago" },
  { icon: "person_add", iconBg: "#E8F5E9", iconColor: "#4CAF50", title: "New Student", subtitle: "Rahul Verma", time: "1 day ago" },
  { icon: "person_add", iconBg: "#E8F5E9", iconColor: "#4CAF50", title: "New Student", subtitle: "Priya Singh", time: "1 day ago" },
];

export const TOP_PERFORMING_STUDENTS = STUDENTS.slice(0, 5).map((s) => ({
  rank: 0,
  name: s.name,
  problemsSolved: s.problemsSolved,
  successRate: s.successRate,
}));
