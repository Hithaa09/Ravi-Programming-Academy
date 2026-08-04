"use server";

import { createClient } from "@/lib/supabase/server";
import type { TestCase, Difficulty } from "@/lib/types";
import { PARAM_TYPES, type ParamType, type FunctionSignature, type FunctionTestCase } from "@/lib/wrappers";

async function requireAdmin(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || role !== "admin") throw new Error("Unauthorized");
}

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
  // Present only when the document contains a recognizable "Function
  // Signature" section — signals a Function Only (LeetCode-style) problem.
  // When set, functionTestCases/functionHiddenTestCases replace (not
  // supplement) visibleTestCases/hiddenTestCases for that document, since
  // the two shapes are mutually exclusive per problem.
  functionSignature?: ExtractedField<FunctionSignature>;
  functionTestCases?: ExtractedField<FunctionTestCase[]>;
  functionHiddenTestCases?: ExtractedField<FunctionTestCase[]>;
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
  | "solutions"
  | "functionSignature";

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
  "function signature": "functionSignature",
  signature: "functionSignature",
  "method signature": "functionSignature",
  "function definition": "functionSignature",
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

// Header label pattern shared by both the "Label: inline value" and bare
// "Label" forms below — up to 4 words, letters only. Matches the word-count
// allowance every multi-word SECTION_MAP key already relies on (e.g. "Hidden
// Test Cases", "Official Solutions").
const HEADER_LABEL = "[A-Za-z]+(?:\\s+[A-Za-z]+){0,3}";
const HEADER_WITH_COLON_RE = new RegExp(`^(${HEADER_LABEL}):\\s*(.*)$`);
const BARE_HEADER_RE = new RegExp(`^(${HEADER_LABEL})$`);

interface HeaderCandidate {
  label: string;
  inlineVal: string;
}

// Strips common Markdown decoration from a line so header matching doesn't
// depend on writers using the one exact "Label:" style — purely syntactic
// cleanup, no semantic understanding of the content. Order matters little in
// practice since each strip is a no-op when its pattern isn't present, but
// running heading/bold before numbering/bullets handles combinations like
// "### **Title**" or "**1. Title**" correctly either way.
function stripHeaderDecoration(rawLine: string): string {
  let line = rawLine.trim();
  line = line.replace(/^#{1,6}\s*/, "");   // "# " / "## " / "### " ...
  line = line.replace(/\*\*/g, "");        // "**Title**" / "**Title:**"
  line = line.replace(/^\d+[.)]\s*/, "");  // "1. " / "2) "
  line = line.replace(/^[-*]\s+/, "");     // "- " / "* " (bullet, not bold)
  return line.trim();
}

// A header is a (possibly Markdown-decorated) line naming one of the known
// fields — either "Label: optional inline value" or a bare "Label" on its
// own line. Case-insensitive; the caller looks the returned label up in
// SECTION_MAP, so a cleaned line that doesn't match any known field is
// simply not treated as a header, same as before this change.
function matchHeaderCandidate(rawLine: string): HeaderCandidate | null {
  const cleaned = stripHeaderDecoration(rawLine);
  if (!cleaned) return null;

  const withColon = cleaned.match(HEADER_WITH_COLON_RE);
  if (withColon) {
    return { label: withColon[1].toLowerCase().trim(), inlineVal: withColon[2].trim() };
  }

  const bare = cleaned.match(BARE_HEADER_RE);
  if (bare) {
    return { label: bare[1].toLowerCase().trim(), inlineVal: "" };
  }

  return null;
}

function parseDocument(rawText: string): Map<FieldName, SectionEntry> {
  const text = rawText.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const result = new Map<FieldName, SectionEntry>();

  // Find all section headers and their line indices.
  //
  // "input"/"output" are ambiguous: they're valid top-level synonyms for
  // inputFormat/outputFormat, but they're also exactly what parseTestCases()
  // expects to find *inside* a Test Cases section, one pair per case (see
  // "Input: ...", "Output: ..." below). Without the guard below, every
  // per-case Input:/Output: line would itself be mistaken for a new
  // top-level header, fragmenting the test-case block before
  // parseTestCases() ever sees it as a whole — a pre-existing issue, not
  // introduced by the Markdown-tolerance normalization above, since these
  // lines already matched the old strict "Label:" regex too. Once inside a
  // visible/hidden test-case container, a bare "input"/"output" line is
  // treated as case content, not a new section, until a genuinely different
  // header ends the container.
  const headers: Array<{ lineIdx: number; field: FieldName; inlineVal: string }> = [];
  let insideTestCaseContainer = false;

  for (let i = 0; i < lines.length; i++) {
    const candidate = matchHeaderCandidate(lines[i]);
    if (!candidate) continue;
    const field = SECTION_MAP[candidate.label];
    if (field === undefined) continue;

    const isBareInputOrOutput = candidate.label === "input" || candidate.label === "output";
    if (insideTestCaseContainer && isBareInputOrOutput) continue;

    headers.push({ lineIdx: i, field, inlineVal: candidate.inlineVal });
    insideTestCaseContainer = field === "visibleTestCases" || field === "hiddenTestCases";
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

// ---------------------------------------------------------------------------
// Function Only parsing — a "Function Signature" section (e.g.
// "twoSum(nums: int[], target: int) -> int[]") plus test cases written as
// "name = value" pairs (e.g. "Input: nums = [2,7,11,15], target = 9") rather
// than raw stdin/stdout text. Deliberately conservative: anything that
// doesn't match the expected shape is dropped rather than guessed at, so a
// malformed document just falls back to Full Program import instead of
// silently producing a broken Function Only problem.
// ---------------------------------------------------------------------------

// Common author shorthands normalized to the platform's canonical type
// spelling (lib/wrappers/types.ts). Anything not listed here, or not in
// PARAM_TYPES after normalization, makes the whole signature unparseable —
// v1 has no float[]/char[]/nested types, so a document requesting one is
// treated the same as any other unparseable signature.
const TYPE_ALIASES: Record<string, ParamType> = {
  int: "int", integer: "int",
  long: "long",
  double: "double",
  float: "float",
  boolean: "boolean", bool: "boolean",
  char: "char", character: "char",
  string: "String",
  "int[]": "int[]", "integer[]": "int[]",
  "long[]": "long[]",
  "double[]": "double[]",
  "boolean[]": "boolean[]", "bool[]": "boolean[]",
  "string[]": "String[]",
};

function normalizeParamType(raw: string): ParamType | null {
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, "").replace(/\[\s*\]/g, "[]");
  const mapped = TYPE_ALIASES[cleaned];
  return mapped && PARAM_TYPES.includes(mapped) ? mapped : null;
}

const SIGNATURE_LINE_RE = /^\s*([A-Za-z_]\w*)\s*\(\s*([^)]*)\s*\)\s*(?:->|:)\s*([A-Za-z]+\s*\[?\s*\]?)\s*$/;

function parseFunctionSignature(content: string): FunctionSignature | null {
  const line = content.split("\n").map((l) => l.trim()).find(Boolean);
  if (!line) return null;
  const m = line.match(SIGNATURE_LINE_RE);
  if (!m) return null;

  const [, functionName, paramsStr, returnTypeRaw] = m;
  const returnType = normalizeParamType(returnTypeRaw);
  if (!returnType) return null;

  const params: { name: string; type: ParamType }[] = [];
  const paramSegments = paramsStr.split(",").map((s) => s.trim()).filter(Boolean);
  for (const seg of paramSegments) {
    const paramMatch = seg.match(/^([A-Za-z_]\w*)\s*:\s*([A-Za-z]+\s*\[?\s*\]?)$/);
    if (!paramMatch) return null;
    const type = normalizeParamType(paramMatch[2]);
    if (!type) return null;
    params.push({ name: paramMatch[1], type });
  }
  if (params.length === 0) return null;

  return { functionName, params, returnType };
}

// Splits on commas that aren't inside [...] or "..." — needed because array
// literals and quoted strings can themselves contain commas.
function splitTopLevelCommas(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuotes = false;
  let current = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      current += c;
      if (c === "\\" && i + 1 < s.length) { current += s[++i]; continue; }
      if (c === '"') inQuotes = false;
      continue;
    }
    if (c === '"') { inQuotes = true; current += c; continue; }
    if (c === "[") depth++;
    if (c === "]") depth--;
    if (c === "," && depth === 0) { parts.push(current); current = ""; continue; }
    current += c;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

// Parses a JSON-ish value, tolerating a bare unquoted string (common when an
// author writes `s = abcabcbb` instead of `s = "abcabcbb"`).
function parseLiteralValue(raw: string): { ok: true; value: unknown } | { ok: false } {
  const trimmed = raw.trim();
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    try {
      return { ok: true, value: JSON.parse(`"${trimmed.replace(/"/g, '\\"')}"`) };
    } catch {
      return { ok: false };
    }
  }
}

function parseNameValuePairs(line: string): Map<string, unknown> {
  const result = new Map<string, unknown>();
  for (const segment of splitTopLevelCommas(line)) {
    const m = segment.match(/^\s*([A-Za-z_]\w*)\s*=\s*([\s\S]+?)\s*$/);
    if (!m) continue;
    const parsed = parseLiteralValue(m[2]);
    if (parsed.ok) result.set(m[1], parsed.value);
  }
  return result;
}

function parseFunctionTestCases(content: string, sig: FunctionSignature): FunctionTestCase[] {
  const cases: FunctionTestCase[] = [];
  const text = content.replace(/\r\n?/g, "\n");
  const blocks = text.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);

  for (const block of blocks) {
    const blockLines = block.split("\n");
    const inputParts: string[] = [];
    const outputParts: string[] = [];
    let phase: "none" | "input" | "output" = "none";

    for (const line of blockLines) {
      if (/^input:\s*/i.test(line)) {
        phase = "input";
        const val = line.replace(/^input:\s*/i, "").trim();
        if (val) inputParts.push(val);
      } else if (/^(?:output|expected(?:\s+output)?):\s*/i.test(line)) {
        phase = "output";
        const val = line.replace(/^(?:output|expected(?:\s+output)?):\s*/i, "").trim();
        if (val) outputParts.push(val);
      } else if (phase === "input" && !/^(?:test\s*case|case)\s*\d/i.test(line)) {
        inputParts.push(line.trim());
      } else if (phase === "output") {
        outputParts.push(line.trim());
      }
    }

    if (inputParts.length === 0 || outputParts.length === 0) continue;

    const parsedArgs = parseNameValuePairs(inputParts.join(", "));
    const args: unknown[] = [];
    let allParamsFound = true;
    for (const p of sig.params) {
      if (!parsedArgs.has(p.name)) { allParamsFound = false; break; }
      args.push(parsedArgs.get(p.name));
    }
    if (!allParamsFound) continue;

    const expectedParsed = parseLiteralValue(outputParts.join(" "));
    if (!expectedParsed.ok) continue;

    cases.push({ args, expected: expectedParsed.value });
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
  await requireAdmin();
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

  // Function signature — presence of a recognizable "Function Signature"
  // section marks this a Function Only document. Conservative on purpose:
  // an unparseable signature line just leaves this undefined, and the
  // document falls back to being imported as Full Program, same as before
  // this parsing was added.
  let functionSignature: ExtractedField<FunctionSignature> | undefined;
  const signatureEntry = sections.get("functionSignature");
  if (signatureEntry) {
    const sig = parseFunctionSignature(signatureEntry.content);
    if (sig) functionSignature = { value: sig, confidence: signatureEntry.confidence };
  }

  // Visible/hidden test cases — structured (args/expected) when a function
  // signature was found, raw stdin/stdout otherwise. The two shapes are
  // mutually exclusive per document, matching the schema's own separation of
  // testCases/hiddenTestCases from functionTestCases/functionHiddenTestCases.
  let visibleTestCases: ExtractedField<TestCase[]> | undefined;
  let hiddenTestCases: ExtractedField<TestCase[]> | undefined;
  let functionTestCases: ExtractedField<FunctionTestCase[]> | undefined;
  let functionHiddenTestCases: ExtractedField<FunctionTestCase[]> | undefined;

  const visibleEntry = sections.get("visibleTestCases");
  const hiddenEntry = sections.get("hiddenTestCases");

  if (functionSignature) {
    if (visibleEntry) {
      const cases = parseFunctionTestCases(visibleEntry.content, functionSignature.value);
      functionTestCases = { value: cases, confidence: cases.length > 0 ? visibleEntry.confidence : "medium" };
    }
    if (hiddenEntry) {
      const cases = parseFunctionTestCases(hiddenEntry.content, functionSignature.value);
      functionHiddenTestCases = { value: cases, confidence: cases.length > 0 ? hiddenEntry.confidence : "medium" };
    }
  } else {
    if (visibleEntry) {
      const cases = parseTestCases(visibleEntry.content);
      visibleTestCases = { value: cases, confidence: cases.length > 0 ? visibleEntry.confidence : "medium" };
    }
    if (hiddenEntry) {
      const cases = parseTestCases(hiddenEntry.content);
      hiddenTestCases = { value: cases, confidence: cases.length > 0 ? hiddenEntry.confidence : "medium" };
    }
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
    functionSignature, functionTestCases, functionHiddenTestCases,
  ];

  const lowConfidenceCount = allFields.filter((f) => f?.confidence === "low").length;

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
    functionSignature,
    functionTestCases,
    functionHiddenTestCases,
    lowConfidenceCount,
  };
}
