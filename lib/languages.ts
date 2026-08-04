export interface CodeLanguage {
  id: string;
  label: string;
  monacoId: string;
}

// Single source of truth so every language dropdown/tab strip in the app
// (student Solve page, admin Add/Edit Problem form) stays in sync.
export const CODE_LANGUAGES: CodeLanguage[] = [
  { id: "python", label: "Python 3", monacoId: "python" },
  { id: "javascript", label: "JavaScript", monacoId: "javascript" },
  { id: "java", label: "Java", monacoId: "java" },
  { id: "cpp", label: "C++", monacoId: "cpp" },
  { id: "c", label: "C", monacoId: "cpp" },
  { id: "vb", label: "VB", monacoId: "vb" },
  { id: "perl", label: "Perl", monacoId: "perl" },
];

// Generic per-language fallback used whenever a problem doesn't have
// admin-authored starter code for a given language, so every language tab
// always has a compiling skeleton instead of a blank editor.
export const DEFAULT_BOILERPLATE: Record<string, string> = {
  python: "def main():\n    # Write your solution here\n    pass\n\nmain()\n",
  javascript: "// Write your solution here\n",
  java: "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n",
  vb: "Imports System\n\nModule Program\n    Sub Main()\n        ' Write your solution here\n    End Sub\nEnd Module\n",
  perl: "# Write your solution here\n",
};
