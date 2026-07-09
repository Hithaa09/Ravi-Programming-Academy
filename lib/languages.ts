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
