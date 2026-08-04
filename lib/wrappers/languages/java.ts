import type { LanguageWrapperAdapter } from "../adapter";
import type { FunctionSignature, ParamType } from "../types";

// Java is statically typed, so unlike Python/JS the driver knows every
// param's and the return value's concrete native type at codegen time — no
// runtime instanceof dispatch is needed anywhere below. Java also has no
// built-in JSON parser available on Judge0's classpath, so this adapter
// hand-writes small parsers/formatters for exactly the v1 type set (a fixed,
// narrow grammar — not general JSON).

const JAVA_TYPE: Record<ParamType, string> = {
  int: "int", long: "long", double: "double", float: "float",
  boolean: "boolean", char: "char", String: "String",
  "int[]": "int[]", "long[]": "long[]", "double[]": "double[]",
  "boolean[]": "boolean[]", "String[]": "String[]",
};

const JAVA_DEFAULT: Record<ParamType, string> = {
  int: "0", long: "0L", double: "0.0", float: "0.0f",
  boolean: "false", char: "'\\0'", String: "null",
  "int[]": "null", "long[]": "null", "double[]": "null",
  "boolean[]": "null", "String[]": "null",
};

function parseExpr(type: ParamType, lineVar: string): string {
  switch (type) {
    case "int": return `Integer.parseInt(${lineVar}.trim())`;
    case "long": return `Long.parseLong(${lineVar}.trim())`;
    case "double": return `Double.parseDouble(${lineVar}.trim())`;
    case "float": return `Float.parseFloat(${lineVar}.trim())`;
    case "boolean": return `Boolean.parseBoolean(${lineVar}.trim())`;
    case "char": return `__rpaParseChar(${lineVar})`;
    case "String": return `__rpaParseString(${lineVar})`;
    case "int[]": return `__rpaParseIntArray(${lineVar})`;
    case "long[]": return `__rpaParseLongArray(${lineVar})`;
    case "double[]": return `__rpaParseDoubleArray(${lineVar})`;
    case "boolean[]": return `__rpaParseBooleanArray(${lineVar})`;
    case "String[]": return `__rpaParseStringArray(${lineVar})`;
  }
}

function printStatement(type: ParamType, resultVar: string): string {
  switch (type) {
    case "int": case "long": case "double": case "float": case "boolean":
      return `System.out.println(${resultVar});`;
    case "char": return `System.out.println(__rpaFormatChar(${resultVar}));`;
    case "String": return `System.out.println(__rpaFormatString(${resultVar}));`;
    case "int[]": return `System.out.println(__rpaFormatIntArray(${resultVar}));`;
    case "long[]": return `System.out.println(__rpaFormatLongArray(${resultVar}));`;
    case "double[]": return `System.out.println(__rpaFormatDoubleArray(${resultVar}));`;
    case "boolean[]": return `System.out.println(__rpaFormatBooleanArray(${resultVar}));`;
    case "String[]": return `System.out.println(__rpaFormatStringArray(${resultVar}));`;
  }
}

function renderFunctionStub(sig: FunctionSignature): string {
  const params = sig.params.map((p) => `${JAVA_TYPE[p.type]} ${p.name}`).join(", ");
  const ret = JAVA_TYPE[sig.returnType];
  return (
    `class Solution {\n` +
    `    public ${ret} ${sig.functionName}(${params}) {\n` +
    `        // Write your solution here\n` +
    `        return ${JAVA_DEFAULT[sig.returnType]};\n` +
    `    }\n` +
    `}\n`
  );
}

// Always emitted in full regardless of which types this particular
// signature uses — dead helper methods don't hurt compilation, and always
// emitting the same fixed library keeps the generator simple and reliable.
const HELPER_METHODS = `
    static char __rpaParseChar(String line) {
        String s = __rpaParseString(line);
        return s.isEmpty() ? '\\0' : s.charAt(0);
    }

    static String __rpaParseString(String line) {
        String s = line.trim();
        if (s.length() >= 2 && s.charAt(0) == '"' && s.charAt(s.length() - 1) == '"') {
            s = s.substring(1, s.length() - 1);
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '\\\\' && i + 1 < s.length()) {
                char next = s.charAt(i + 1);
                if (next == 'n') { sb.append('\\n'); i++; }
                else if (next == 't') { sb.append('\\t'); i++; }
                else if (next == '"' || next == '\\\\') { sb.append(next); i++; }
                else sb.append(c);
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    static int[] __rpaParseIntArray(String line) {
        String s = line.trim();
        s = s.substring(1, s.length() - 1).trim();
        if (s.isEmpty()) return new int[0];
        String[] parts = s.split(",");
        int[] arr = new int[parts.length];
        for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i].trim());
        return arr;
    }

    static long[] __rpaParseLongArray(String line) {
        String s = line.trim();
        s = s.substring(1, s.length() - 1).trim();
        if (s.isEmpty()) return new long[0];
        String[] parts = s.split(",");
        long[] arr = new long[parts.length];
        for (int i = 0; i < parts.length; i++) arr[i] = Long.parseLong(parts[i].trim());
        return arr;
    }

    static double[] __rpaParseDoubleArray(String line) {
        String s = line.trim();
        s = s.substring(1, s.length() - 1).trim();
        if (s.isEmpty()) return new double[0];
        String[] parts = s.split(",");
        double[] arr = new double[parts.length];
        for (int i = 0; i < parts.length; i++) arr[i] = Double.parseDouble(parts[i].trim());
        return arr;
    }

    static boolean[] __rpaParseBooleanArray(String line) {
        String s = line.trim();
        s = s.substring(1, s.length() - 1).trim();
        if (s.isEmpty()) return new boolean[0];
        String[] parts = s.split(",");
        boolean[] arr = new boolean[parts.length];
        for (int i = 0; i < parts.length; i++) arr[i] = Boolean.parseBoolean(parts[i].trim());
        return arr;
    }

    static String[] __rpaParseStringArray(String line) {
        String s = line.trim();
        s = s.substring(1, s.length() - 1);
        java.util.List<String> items = new java.util.ArrayList<>();
        int i = 0;
        while (i < s.length()) {
            while (i < s.length() && (s.charAt(i) == ' ' || s.charAt(i) == ',')) i++;
            if (i >= s.length()) break;
            if (s.charAt(i) == '"') {
                StringBuilder sb = new StringBuilder();
                i++;
                while (i < s.length() && s.charAt(i) != '"') {
                    char c = s.charAt(i);
                    if (c == '\\\\' && i + 1 < s.length()) {
                        char next = s.charAt(i + 1);
                        if (next == 'n') sb.append('\\n');
                        else if (next == 't') sb.append('\\t');
                        else sb.append(next);
                        i += 2;
                    } else {
                        sb.append(c);
                        i++;
                    }
                }
                i++;
                items.add(sb.toString());
            } else {
                i++;
            }
        }
        return items.toArray(new String[0]);
    }

    static String __rpaJsonQuote(String s) {
        StringBuilder sb = new StringBuilder("\\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"' || c == '\\\\') { sb.append('\\\\').append(c); }
            else if (c == '\\n') sb.append("\\\\n");
            else if (c == '\\t') sb.append("\\\\t");
            else sb.append(c);
        }
        sb.append("\\"");
        return sb.toString();
    }

    static String __rpaFormatChar(char c) { return __rpaJsonQuote(String.valueOf(c)); }
    static String __rpaFormatString(String s) { return __rpaJsonQuote(s); }

    static String __rpaFormatIntArray(int[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) { if (i > 0) sb.append(","); sb.append(arr[i]); }
        sb.append("]");
        return sb.toString();
    }

    static String __rpaFormatLongArray(long[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) { if (i > 0) sb.append(","); sb.append(arr[i]); }
        sb.append("]");
        return sb.toString();
    }

    static String __rpaFormatDoubleArray(double[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) { if (i > 0) sb.append(","); sb.append(arr[i]); }
        sb.append("]");
        return sb.toString();
    }

    static String __rpaFormatBooleanArray(boolean[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) { if (i > 0) sb.append(","); sb.append(arr[i]); }
        sb.append("]");
        return sb.toString();
    }

    static String __rpaFormatStringArray(String[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) { if (i > 0) sb.append(","); sb.append(__rpaJsonQuote(arr[i])); }
        sb.append("]");
        return sb.toString();
    }
`;

function renderDriver(sig: FunctionSignature, studentFunctionCode: string): string {
  const readLines = sig.params
    .map((_, i) => `        String __rpaLine${i} = __rpaBr.readLine();`)
    .join("\n");
  const parseAssignments = sig.params
    .map((p, i) => `        ${JAVA_TYPE[p.type]} ${p.name} = ${parseExpr(p.type, `__rpaLine${i}`)};`)
    .join("\n");
  const paramNames = sig.params.map((p) => p.name).join(", ");
  const retType = JAVA_TYPE[sig.returnType];

  return (
    `import java.io.*;\n` +
    `import java.util.*;\n\n` +
    `${studentFunctionCode}\n\n` +
    `public class Main {\n` +
    `    public static void main(String[] args) throws Exception {\n` +
    `        BufferedReader __rpaBr = new BufferedReader(new InputStreamReader(System.in));\n` +
    `${readLines}\n` +
    `${parseAssignments}\n` +
    `        Solution __rpaSol = new Solution();\n` +
    `        ${retType} __rpaResult = __rpaSol.${sig.functionName}(${paramNames});\n` +
    `        ${printStatement(sig.returnType, "__rpaResult")}\n` +
    `    }\n` +
    `${HELPER_METHODS}` +
    `}\n`
  );
}

export const javaAdapter: LanguageWrapperAdapter = {
  languageId: "java",
  renderFunctionStub,
  renderDriver,
};
