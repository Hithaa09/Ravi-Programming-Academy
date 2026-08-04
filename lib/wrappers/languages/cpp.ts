import type { LanguageWrapperAdapter } from "../adapter";
import type { FunctionSignature, ParamType } from "../types";

// Like Java, C++ is statically typed — the driver knows every concrete type
// up front. Output formatting uses C++ function overloading (__rpaFormat)
// so the call site never needs to branch on returnType itself; overload
// resolution on `auto __rpaResult`'s deduced type does that automatically.

const CPP_NATIVE: Record<ParamType, string> = {
  int: "int", long: "long long", double: "double", float: "float",
  boolean: "bool", char: "char", String: "string",
  "int[]": "vector<int>", "long[]": "vector<long long>", "double[]": "vector<double>",
  "boolean[]": "vector<bool>", "String[]": "vector<string>",
};

const CPP_DEFAULT_RETURN: Record<ParamType, string> = {
  int: "0", long: "0LL", double: "0.0", float: "0.0f",
  boolean: "false", char: "'\\0'", String: `""`,
  "int[]": "{}", "long[]": "{}", "double[]": "{}", "boolean[]": "{}", "String[]": "{}",
};

function paramDecl(p: { name: string; type: ParamType }): string {
  if (p.type.endsWith("[]")) return `${CPP_NATIVE[p.type]}& ${p.name}`;
  return `${CPP_NATIVE[p.type]} ${p.name}`;
}

function parseExpr(type: ParamType, lineVar: string): string {
  switch (type) {
    case "int": return `__rpaParseInt(${lineVar})`;
    case "long": return `__rpaParseLong(${lineVar})`;
    case "double": return `__rpaParseDouble(${lineVar})`;
    case "float": return `__rpaParseFloat(${lineVar})`;
    case "boolean": return `__rpaParseBool(${lineVar})`;
    case "char": return `__rpaParseChar(${lineVar})`;
    case "String": return `__rpaParseString(${lineVar})`;
    case "int[]": return `__rpaParseIntArray(${lineVar})`;
    case "long[]": return `__rpaParseLongArray(${lineVar})`;
    case "double[]": return `__rpaParseDoubleArray(${lineVar})`;
    case "boolean[]": return `__rpaParseBoolArray(${lineVar})`;
    case "String[]": return `__rpaParseStringArray(${lineVar})`;
  }
}

function renderFunctionStub(sig: FunctionSignature): string {
  const params = sig.params.map(paramDecl).join(", ");
  const ret = CPP_NATIVE[sig.returnType];
  return (
    `#include <bits/stdc++.h>\n` +
    `using namespace std;\n\n` +
    `${ret} ${sig.functionName}(${params}) {\n` +
    `    // Write your solution here\n` +
    `    return ${CPP_DEFAULT_RETURN[sig.returnType]};\n` +
    `}\n`
  );
}

// Always emitted in full regardless of which types this signature actually
// uses — see the identical rationale in the Java adapter.
const HELPERS = `
static string __rpaTrim(const string &s) {
    size_t a = s.find_first_not_of(" \\t\\r\\n");
    if (a == string::npos) return "";
    size_t b = s.find_last_not_of(" \\t\\r\\n");
    return s.substr(a, b - a + 1);
}

static string __rpaUnquote(const string &line) {
    string s = __rpaTrim(line);
    if (s.size() >= 2 && s.front() == '"' && s.back() == '"') s = s.substr(1, s.size() - 2);
    string out;
    for (size_t i = 0; i < s.size(); i++) {
        if (s[i] == '\\\\' && i + 1 < s.size()) {
            char next = s[i + 1];
            if (next == 'n') { out += '\\n'; i++; }
            else if (next == 't') { out += '\\t'; i++; }
            else if (next == '"' || next == '\\\\') { out += next; i++; }
            else out += s[i];
        } else {
            out += s[i];
        }
    }
    return out;
}

static int __rpaParseInt(const string &line) { return stoi(__rpaTrim(line)); }
static long long __rpaParseLong(const string &line) { return stoll(__rpaTrim(line)); }
static double __rpaParseDouble(const string &line) { return stod(__rpaTrim(line)); }
static float __rpaParseFloat(const string &line) { return stof(__rpaTrim(line)); }
static bool __rpaParseBool(const string &line) { return __rpaTrim(line) == "true"; }
static char __rpaParseChar(const string &line) { string s = __rpaUnquote(line); return s.empty() ? '\\0' : s[0]; }
static string __rpaParseString(const string &line) { return __rpaUnquote(line); }

static vector<string> __rpaSplitTopLevel(const string &inner) {
    vector<string> parts;
    if (__rpaTrim(inner).empty()) return parts;
    string cur;
    for (size_t i = 0; i < inner.size(); i++) {
        if (inner[i] == ',') { parts.push_back(cur); cur.clear(); }
        else cur += inner[i];
    }
    parts.push_back(cur);
    return parts;
}

static string __rpaArrayInner(const string &line) {
    string s = __rpaTrim(line);
    if (s.size() >= 2 && s.front() == '[' && s.back() == ']') return s.substr(1, s.size() - 2);
    return "";
}

static vector<int> __rpaParseIntArray(const string &line) {
    vector<int> arr;
    for (auto &p : __rpaSplitTopLevel(__rpaArrayInner(line))) arr.push_back(stoi(__rpaTrim(p)));
    return arr;
}

static vector<long long> __rpaParseLongArray(const string &line) {
    vector<long long> arr;
    for (auto &p : __rpaSplitTopLevel(__rpaArrayInner(line))) arr.push_back(stoll(__rpaTrim(p)));
    return arr;
}

static vector<double> __rpaParseDoubleArray(const string &line) {
    vector<double> arr;
    for (auto &p : __rpaSplitTopLevel(__rpaArrayInner(line))) arr.push_back(stod(__rpaTrim(p)));
    return arr;
}

static vector<bool> __rpaParseBoolArray(const string &line) {
    vector<bool> arr;
    for (auto &p : __rpaSplitTopLevel(__rpaArrayInner(line))) arr.push_back(__rpaTrim(p) == "true");
    return arr;
}

static vector<string> __rpaParseStringArray(const string &line) {
    string inner = __rpaArrayInner(line);
    vector<string> items;
    size_t i = 0;
    while (i < inner.size()) {
        while (i < inner.size() && (inner[i] == ' ' || inner[i] == ',')) i++;
        if (i >= inner.size()) break;
        if (inner[i] == '"') {
            string cur;
            i++;
            while (i < inner.size() && inner[i] != '"') {
                if (inner[i] == '\\\\' && i + 1 < inner.size()) {
                    char next = inner[i + 1];
                    if (next == 'n') cur += '\\n';
                    else if (next == 't') cur += '\\t';
                    else cur += next;
                    i += 2;
                } else {
                    cur += inner[i];
                    i++;
                }
            }
            i++;
            items.push_back(cur);
        } else {
            i++;
        }
    }
    return items;
}

static string __rpaJsonQuote(const string &s) {
    string out = "\\"";
    for (char c : s) {
        if (c == '"' || c == '\\\\') { out += '\\\\'; out += c; }
        else if (c == '\\n') out += "\\\\n";
        else if (c == '\\t') out += "\\\\t";
        else out += c;
    }
    out += "\\"";
    return out;
}

static string __rpaFormat(int v) { return to_string(v); }
static string __rpaFormat(long long v) { return to_string(v); }
static string __rpaFormat(double v) { ostringstream oss; oss << setprecision(15) << v; return oss.str(); }
static string __rpaFormat(float v) { ostringstream oss; oss << setprecision(15) << v; return oss.str(); }
static string __rpaFormat(bool v) { return v ? "true" : "false"; }
static string __rpaFormat(char v) { return __rpaJsonQuote(string(1, v)); }
static string __rpaFormat(const string &v) { return __rpaJsonQuote(v); }

static string __rpaFormat(const vector<int> &v) {
    string out = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) out += ","; out += to_string(v[i]); }
    out += "]";
    return out;
}
static string __rpaFormat(const vector<long long> &v) {
    string out = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) out += ","; out += to_string(v[i]); }
    out += "]";
    return out;
}
static string __rpaFormat(const vector<double> &v) {
    string out = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) out += ","; out += __rpaFormat(v[i]); }
    out += "]";
    return out;
}
static string __rpaFormat(const vector<bool> &v) {
    string out = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) out += ","; out += (v[i] ? "true" : "false"); }
    out += "]";
    return out;
}
static string __rpaFormat(const vector<string> &v) {
    string out = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) out += ","; out += __rpaJsonQuote(v[i]); }
    out += "]";
    return out;
}
`;

function renderDriver(sig: FunctionSignature, studentFunctionCode: string): string {
  const readAndParse = sig.params
    .map((p, i) => {
      const lineVar = `__rpaLine${i}`;
      return `    string ${lineVar}; getline(cin, ${lineVar});\n    ${CPP_NATIVE[p.type]} ${p.name} = ${parseExpr(p.type, lineVar)};`;
    })
    .join("\n");
  const paramNames = sig.params.map((p) => p.name).join(", ");

  return (
    // Prepended defensively even though the stub already includes these —
    // duplicate #include/using are harmless in C++, and this keeps the
    // driver compiling even if a student deletes the header lines.
    `#include <bits/stdc++.h>\n` +
    `using namespace std;\n\n` +
    `${studentFunctionCode}\n\n` +
    `${HELPERS}\n` +
    `int main() {\n` +
    `${readAndParse}\n` +
    `    auto __rpaResult = ${sig.functionName}(${paramNames});\n` +
    `    cout << __rpaFormat(__rpaResult) << "\\n";\n` +
    `    return 0;\n` +
    `}\n`
  );
}

export const cppAdapter: LanguageWrapperAdapter = {
  languageId: "cpp",
  renderFunctionStub,
  renderDriver,
};
