import type { LanguageWrapperAdapter } from "../adapter";
import type { FunctionSignature, ParamType } from "../types";

// Like Python, JS's own JSON.parse/JSON.stringify already round-trip every
// v1 type exactly (numbers cover int/long/double/float, arrays/bools/strings
// map 1:1) — no hand-written parsing needed. `char` has no JS equivalent and
// is just a length-1 string.
function jsTypeHint(type: ParamType): string {
  const map: Record<ParamType, string> = {
    int: "number", long: "number", double: "number", float: "number",
    boolean: "boolean", char: "string", String: "string",
    "int[]": "number[]", "long[]": "number[]", "double[]": "number[]",
    "boolean[]": "boolean[]", "String[]": "string[]",
  };
  return map[type];
}

function renderFunctionStub(sig: FunctionSignature): string {
  const paramList = sig.params.map((p) => p.name).join(", ");
  const jsdocParams = sig.params.map((p) => ` * @param {${jsTypeHint(p.type)}} ${p.name}`).join("\n");
  return (
    `/**\n` +
    (jsdocParams ? `${jsdocParams}\n` : "") +
    ` * @return {${jsTypeHint(sig.returnType)}}\n` +
    ` */\n` +
    `function ${sig.functionName}(${paramList}) {\n` +
    `    // Write your solution here\n` +
    `}\n`
  );
}

function renderDriver(sig: FunctionSignature, studentFunctionCode: string): string {
  const args = sig.params.map((_, i) => `__rpaArgs[${i}]`).join(", ");
  return (
    `${studentFunctionCode}\n\n` +
    `// --- Auto-generated driver (Function Only mode) — do not edit ---\n` +
    `(function () {\n` +
    `    const readline = require("readline");\n` +
    `    const rl = readline.createInterface({ input: process.stdin, terminal: false });\n` +
    `    const __rpaLines = [];\n` +
    `    rl.on("line", (l) => { if (l.trim() !== "") __rpaLines.push(l); });\n` +
    `    rl.on("close", () => {\n` +
    `        const __rpaArgs = __rpaLines.map((l) => JSON.parse(l));\n` +
    `        const __rpaResult = ${sig.functionName}(${args});\n` +
    `        process.stdout.write(JSON.stringify(__rpaResult) + "\\n");\n` +
    `    });\n` +
    `})();\n`
  );
}

export const javascriptAdapter: LanguageWrapperAdapter = {
  languageId: "javascript",
  renderFunctionStub,
  renderDriver,
};
