import { NextResponse } from "next/server";
import { runCode, JUDGE0_LANGUAGE_IDS } from "@/lib/judge0";

// GET /api/test-judge0
// Runs a Python "Hello, Judge0!" and returns the full result.
// Remove or gate behind auth before going to production.
export async function GET() {
  const source = `print("Hello, Judge0!")`;

  try {
    const result = await runCode(source, JUDGE0_LANGUAGE_IDS.python);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
