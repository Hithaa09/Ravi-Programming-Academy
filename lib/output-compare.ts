// Token-based output comparison — the same strategy most judges (e.g.
// Codeforces' default checker) use. Only decimal-number tokens ever get
// tolerance; every other token (text, integers, exact-format strings) still
// requires byte-exact equality, so exact-output problems are unaffected.

const FLOAT_TOKEN = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
const FLOAT_TOLERANCE = 1e-6;

function normalize(output: string): string {
  return output
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (FLOAT_TOKEN.test(a) && FLOAT_TOKEN.test(b)) {
    const diff = Math.abs(parseFloat(a) - parseFloat(b));
    return diff <= FLOAT_TOLERANCE || diff <= FLOAT_TOLERANCE * Math.max(Math.abs(parseFloat(a)), Math.abs(parseFloat(b)));
  }
  return false;
}

function lineMatches(actualLine: string, expectedLine: string): boolean {
  if (actualLine === expectedLine) return true;
  const aTokens = actualLine.split(/\s+/).filter(Boolean);
  const eTokens = expectedLine.split(/\s+/).filter(Boolean);
  if (aTokens.length !== eTokens.length) return false;
  return aTokens.every((t, i) => tokensMatch(t, eTokens[i]));
}

export function outputsMatch(actual: string, expected: string): boolean {
  const a = normalize(actual);
  const e = normalize(expected);
  if (a === e) return true;

  const aLines = a.split("\n");
  const eLines = e.split("\n");
  if (aLines.length !== eLines.length) return false;

  return aLines.every((line, i) => lineMatches(line, eLines[i]));
}
