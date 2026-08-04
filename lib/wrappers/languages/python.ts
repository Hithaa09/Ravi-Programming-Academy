import type { LanguageWrapperAdapter } from "../adapter";
import type { FunctionSignature, ParamType } from "../types";

// Python's own `json` module gives a free, exact round-trip for every v1
// type (int/float/bool/str/list all map directly, and json.loads("true")
// already yields the correct Python bool) — there is no per-type parsing
// logic to hand-write here, unlike Java/C++. `char` has no Python
// equivalent; it is represented as a length-1 str, which json handles like
// any other string.
function pythonTypeHint(type: ParamType): string {
  const map: Record<ParamType, string> = {
    int: "int", long: "int", double: "float", float: "float",
    boolean: "bool", char: "str", String: "str",
    "int[]": "List[int]", "long[]": "List[int]", "double[]": "List[float]",
    "boolean[]": "List[bool]", "String[]": "List[str]",
  };
  return map[type];
}

function renderFunctionStub(sig: FunctionSignature): string {
  const paramList = sig.params.map((p) => p.name).join(", ");
  const hints = sig.params.map((p) => `${p.name}: ${pythonTypeHint(p.type)}`).join(", ");
  return (
    `# ${hints || "(no parameters)"} -> ${pythonTypeHint(sig.returnType)}\n` +
    `def ${sig.functionName}(${paramList}):\n` +
    `    # Write your solution here\n` +
    `    pass\n`
  );
}

function renderDriver(sig: FunctionSignature, studentFunctionCode: string): string {
  const args = sig.params.map((_, i) => `__rpa_args[${i}]`).join(", ");
  return (
    `${studentFunctionCode}\n\n` +
    `# --- Auto-generated driver (Function Only mode) — do not edit ---\n` +
    `import sys, json\n\n` +
    `def __rpa_main():\n` +
    `    __rpa_lines = [l for l in sys.stdin.read().split("\\n") if l.strip() != ""]\n` +
    `    __rpa_args = [json.loads(l) for l in __rpa_lines]\n` +
    `    __rpa_result = ${sig.functionName}(${args})\n` +
    `    print(json.dumps(__rpa_result))\n\n` +
    `if __name__ == "__main__":\n` +
    `    __rpa_main()\n`
  );
}

export const pythonAdapter: LanguageWrapperAdapter = {
  languageId: "python",
  renderFunctionStub,
  renderDriver,
};
