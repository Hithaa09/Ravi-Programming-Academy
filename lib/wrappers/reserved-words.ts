// Identifier safety checks for admin-authored function/param names. Since
// the same canonical name is spliced into generated Python, JavaScript,
// Java, and C++ source, a name that's a keyword in any one of those (or
// collides with an internal driver identifier) would produce a Compilation
// Error at Run/Submit time rather than at save time. This is a best-effort
// check, not a full per-language parser — anything it misses still fails
// safely as a Compilation Error, never a silent wrong grade.

export const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Union of reserved words across Python, JavaScript, Java, and C++ that
// would break identifier position if used as a function or parameter name.
// Not exhaustive (no parser-level guarantee), but covers the common cases.
const RESERVED_WORDS = new Set([
  // Python
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue",
  "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in",
  "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
  // JavaScript
  "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do",
  "else", "export", "extends", "finally", "for", "function", "if", "import", "in", "instanceof",
  "new", "return", "super", "switch", "this", "throw", "try", "typeof", "var", "void", "while",
  "with", "yield", "let", "static", "await", "async", "null", "true", "false", "undefined",
  // Java
  "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const",
  "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float",
  "for", "goto", "if", "implements", "import", "instanceof", "int", "interface", "long", "native",
  "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp",
  "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void",
  "volatile", "while", "String", "Solution", "Main",
  // C++
  "alignas", "alignof", "and", "asm", "auto", "bool", "break", "case", "catch", "char", "class",
  "const", "constexpr", "continue", "decltype", "default", "delete", "do", "double", "dynamic_cast",
  "else", "enum", "explicit", "export", "extern", "false", "float", "for", "friend", "goto", "if",
  "inline", "int", "long", "mutable", "namespace", "new", "noexcept", "not", "nullptr", "operator",
  "or", "private", "protected", "public", "register", "reinterpret_cast", "return", "short",
  "signed", "sizeof", "static", "static_cast", "struct", "switch", "template", "this", "throw",
  "true", "try", "typedef", "typeid", "typename", "union", "unsigned", "using", "virtual", "void",
  "volatile", "while", "string", "vector", "cout", "cin", "endl",
]);

export function isValidIdentifierName(name: string): { valid: boolean; reason?: string } {
  if (!IDENTIFIER_PATTERN.test(name)) {
    return { valid: false, reason: `"${name}" isn't a valid identifier — use only letters, numbers, and underscores, and don't start with a number.` };
  }
  if (name.toLowerCase().startsWith("__rpa")) {
    return { valid: false, reason: `"${name}" is reserved for internal driver code — choose a different name.` };
  }
  if (RESERVED_WORDS.has(name)) {
    return { valid: false, reason: `"${name}" is a reserved keyword in Python, JavaScript, Java, or C++ — choose a different name.` };
  }
  return { valid: true };
}
