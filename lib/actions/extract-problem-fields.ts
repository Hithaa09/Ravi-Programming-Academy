"use server";

import type { TestCase, Difficulty } from "@/lib/types";

export type Confidence = "high" | "medium" | "low";

export interface ExtractedField<T> {
  value: T;
  confidence: Confidence;
}

export interface ExtractedProblemFields {
  title?: ExtractedField<string>;
  difficulty?: ExtractedField<Difficulty>;
  topic?: ExtractedField<string>;
  description?: ExtractedField<string>;
  inputFormat?: ExtractedField<string>;
  outputFormat?: ExtractedField<string>;
  constraints?: ExtractedField<string>;
  sampleInput?: ExtractedField<string>;
  sampleOutput?: ExtractedField<string>;
  explanation?: ExtractedField<string>;
  visibleTestCases?: ExtractedField<TestCase[]>;
  hiddenTestCases?: ExtractedField<TestCase[]>;
  starterCode?: ExtractedField<Record<string, string>>;
  solutions?: ExtractedField<Record<string, string>>;
  lowConfidenceCount: number;
}

type FieldName =
  | "title"
  | "difficulty"
  | "topic"
  | "description"
  | "inputFormat"
  | "outputFormat"
  | "constraints"
  | "sampleInput"
  | "sampleOutput"
  | "explanation"
  | "visibleTestCases"
  | "hiddenTestCases"
  | "starterCode"
  | "solutions";

const SECTION_MAP: Record<string, FieldName> = {
  title: "title",
  "problem title": "title",
  "problem name": "title",
  difficulty: "difficulty",
  level: "difficulty",
  topic: "topic",
  topics: "topic",
  category: "topic",
  tags: "topic",
  tag: "topic",
  description: "description",
  "problem statement": "description",
  statement: "description",
  overview: "description",
  "problem description": "description",
  problem: "description",
  "input format": "inputFormat",
  "input description": "inputFormat",
  input: "inputFormat",
  "output format": "outputFormat",
  "output description": "outputFormat",
  output: "outputFormat",
  constraints: "constraints",
  constraint: "constraints",
  limitations: "constraints",
  "sample input": "sampleInput",
  "example input": "sampleInput",
  "sample output": "sampleOutput",
  "example output": "sampleOutput",
  "expected output": "sampleOutput",
  explanation: "explanation",
  note: "explanation",
  notes: "explanation",
  hint: "explanation",
  hints: "explanation",
  "test cases": "visibleTestCases",
  "test case": "visibleTestCases",
  examples: "visibleTestCases",
  "visible test cases": "visibleTestCases",
  "visible test case": "visibleTestCases",
  "public test cases": "visibleTestCases",
  "hidden test cases": "hiddenTestCases",
  "hidden test case": "hiddenTestCases",
  "hidden cases": "hiddenTestCases",
  "private test cases": "hiddenTestCases",
  "judge test cases": "hiddenTestCases",
  "starter code": "starterCode",
  template: "starterCode",
  "code template": "starterCode",
  boilerplate: "starterCode",
  skeleton: "starterCode",
  solution: "solutions",
  solutions: "solutions",
  "official solution": "solutions",
  "official solutions": "solutions",
  answer: "solutions",
  "answer key": "solutions",
};

// Maps document language labels to CODE_LANGUAGES ids
const LANG_MAP: Record<string, string> = {
  python: "python",
  python3: "python",
  "python 3": "python",
  py: "python",
  javascript: "javascript",
  js: "javascript",
  node: "javascript",
  nodejs: "javascript",
  java: "java",
  "c++": "cpp",
  cpp: "cpp",
  "c plus plus": "cpp",
  c: "c",
  "visual basic": "vb",
  vb: "vb",
  "vb.net": "vb",
  vbnet: "vb",
  basic: "vb",
  perl: "perl",
};

// ---------------------------------------------------------------------------
// Internal parsing helpers
// ---------------------------------------------------------------------------

interface SectionEntry {
  content: string;
  confidence: Confidence;
}

function parseDocument(rawText: string): Map<FieldName, SectionEntry> {
  const text = rawText.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const result = new Map<FieldName, SectionEntry>();

  // Find all section headers and their line indices.
  // A header is a line matching "WORD(S): optional-inline-value"
  // where the key (case-insensitive) exists in SECTION_MAP.
  const headers: Array<{ lineIdx: number; field: FieldName; inlineVal: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Z][A-Za-z]*(?:\s+[A-Za-z]+){0,3}):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase().trim();
    const field = SECTION_MAP[key];
    if (field !== undefined) {
      headers.push({ lineIdx: i, field, inlineVal: m[2].trim() });
    }
  }

  // Extract content between each pair of adjacent headers.
  for (let h = 0; h < headers.length; h++) {
    const { lineIdx, field, inlineVal } = headers[h];
    const nextLineIdx = h + 1 < headers.length ? headers[h + 1].lineIdx : lines.length;
    const body = lines
      .slice(lineIdx + 1, nextLineIdx)
      .join("\n")
      .trim();

    const content = inlineVal ? (body ? `${inlineVal}\n${body}` : inlineVal) : body;

    // First occurrence of each field wins.
    if (!result.has(field) && content) {
      result.set(field, { content, confidence: "high" });
    }
  }

  // Handle text before the first header (pre-content).
  const preLines = headers.length > 0 ? lines.slice(0, headers[0].lineIdx) : lines;
  const preContent = preLines.join("\n").trim();

  if (preContent) {
    // Title fallback: first non-empty line of pre-content.
    if (!result.has("title")) {
      const firstLine = preLines.find((l) => l.trim());
      if (firstLine?.trim()) {
        result.set("title", { content: firstLine.trim(), confidence: "low" });
      }
    }
    // Description fallback: everything after the first line of pre-content.
    if (!result.has("description")) {
      const firstIdx = preLines.findIndex((l) => l.trim());
      const rest = preLines
        .slice(firstIdx + 1)
        .join("\n")
        .trim();
      if (rest) {
        result.set("description", { content: rest, confidence: "medium" });
      }
    }
  }

  // Difficulty global fallback: scan entire text for Easy / Medium / Hard.
  if (!result.has("difficulty")) {
    const m = text.match(/\b(Easy|Medium|Hard)\b/i);
    if (m) {
      result.set("difficulty", { content: m[1], confidence: "low" });
    }
  }

  return result;
}

function parseTestCases(content: string): TestCase[] {
  const cases: TestCase[] = [];
  const text = content.replace(/\r\n?/g, "\n");

  // Split by blank lines; each block may contain one input/output pair.
  const blocks = text.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);

  for (const block of blocks) {
    const blockLines = block.split("\n");
    const inputLines: string[] = [];
    const outputLines: string[] = [];
    let phase: "none" | "input" | "output" = "none";

    for (const line of blockLines) {
      if (/^input:\s*/i.test(line)) {
        phase = "input";
        const val = line.replace(/^input:\s*/i, "").trim();
        if (val) inputLines.push(val);
      } else if (/^(?:output|expected(?:\s+output)?):\s*/i.test(line)) {
        phase = "output";
        const val = line.replace(/^(?:output|expected(?:\s+output)?):\s*/i, "").trim();
        if (val) outputLines.push(val);
      } else if (phase === "input" && !/^(?:test\s*case|case)\s*\d/i.test(line)) {
        inputLines.push(line);
      } else if (phase === "output") {
        outputLines.push(line);
      }
    }

    const inp = inputLines.join("\n").trim();
    const out = outputLines.join("\n").trim();
    if (inp && out) cases.push({ input: inp, expected: out });
  }

  return cases;
}

function parseCodeBlocks(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.replace(/\r\n?/g, "\n").split("\n");

  let currentLang: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLang) {
      const code = currentLines.join("\n").trim();
      if (code) result[currentLang] = code;
    }
  };

  for (const line of lines) {
    // Language sub-header: "Python:", "C++:", "Java:", etc.
    const m = line.match(/^([A-Za-z][A-Za-z+.\s]{0,20}?):\s*$/);
    if (m) {
      const langKey = m[1].toLowerCase().trim().replace(/\s+/g, " ");
      const mapped = LANG_MAP[langKey];
      if (mapped) {
        flush();
        currentLang = mapped;
        currentLines = [];
        continue;
      }
    }
    if (currentLang !== null) currentLines.push(line);
  }

  flush();
  return result;
}

// ---------------------------------------------------------------------------
// Public server action
// ---------------------------------------------------------------------------

export async function extractProblemFields(
  text: string
): Promise<ExtractedProblemFields> {
  const sections = parseDocument(text);

  function str(field: FieldName): ExtractedField<string> | undefined {
    const e = sections.get(field);
    if (!e || !e.content) return undefined;
    return { value: e.content, confidence: e.confidence };
  }

  const title = str("title");
  const topic = str("topic");
  const description = str("description");
  const inputFormat = str("inputFormat");
  const outputFormat = str("outputFormat");
  const constraints = str("constraints");
  const sampleInput = str("sampleInput");
  const sampleOutput = str("sampleOutput");
  const explanation = str("explanation");

  // Difficulty: coerce to the Difficulty union type.
  let difficulty: ExtractedField<Difficulty> | undefined;
  const diffEntry = sections.get("difficulty");
  if (diffEntry) {
    const m = diffEntry.content.match(/\b(easy|medium|hard)\b/i);
    if (m) {
      const norm = (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) as Difficulty;
      difficulty = { value: norm, confidence: diffEntry.confidence };
    }
  }

  // Visible test cases.
  let visibleTestCases: ExtractedField<TestCase[]> | undefined;
  const visibleEntry = sections.get("visibleTestCases");
  if (visibleEntry) {
    const cases = parseTestCases(visibleEntry.content);
    visibleTestCases = {
      value: cases,
      confidence: cases.length > 0 ? visibleEntry.confidence : "medium",
    };
  }

  // Hidden test cases.
  let hiddenTestCases: ExtractedField<TestCase[]> | undefined;
  const hiddenEntry = sections.get("hiddenTestCases");
  if (hiddenEntry) {
    const cases = parseTestCases(hiddenEntry.content);
    hiddenTestCases = {
      value: cases,
      confidence: cases.length > 0 ? hiddenEntry.confidence : "medium",
    };
  }

  // Starter code blocks.
  let starterCode: ExtractedField<Record<string, string>> | undefined;
  const starterEntry = sections.get("starterCode");
  if (starterEntry) {
    const blocks = parseCodeBlocks(starterEntry.content);
    if (Object.keys(blocks).length > 0) {
      starterCode = { value: blocks, confidence: starterEntry.confidence };
    }
  }

  // Solution code blocks.
  let solutions: ExtractedField<Record<string, string>> | undefined;
  const solutionsEntry = sections.get("solutions");
  if (solutionsEntry) {
    const blocks = parseCodeBlocks(solutionsEntry.content);
    if (Object.keys(blocks).length > 0) {
      solutions = { value: blocks, confidence: solutionsEntry.confidence };
    }
  }

  const allFields = [
    title, difficulty, topic, description,
    inputFormat, outputFormat, constraints,
    sampleInput, sampleOutput, explanation,
    visibleTestCases, hiddenTestCases, starterCode, solutions,
  ];

  const lowConfidenceCount = allFields.filter((f) => f?.confidence === "low").length;
  const extractedCount = allFields.filter(Boolean).length;

  console.log(
    `[extract-problem-fields] ✓ Extracted ${extractedCount} fields, ${lowConfidenceCount} low confidence`
  );

  return {
    title,
    difficulty,
    topic,
    description,
    inputFormat,
    outputFormat,
    constraints,
    sampleInput,
    sampleOutput,
    explanation,
    visibleTestCases,
    hiddenTestCases,
    starterCode,
    solutions,
    lowConfidenceCount,
  };
}
