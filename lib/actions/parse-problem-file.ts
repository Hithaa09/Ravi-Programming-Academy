"use server";

import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/log";
import { checkRateLimit } from "@/lib/rate-limit";

// Returns the admin's user id — existing callers that only need the auth
// check (e.g. `await requireAdmin();`) are unaffected, since discarding a
// return value is always valid; parseProblemFile uses it below as the
// rate-limit key.
async function requireAdmin(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || role !== "admin") throw new Error("Unauthorized");
  return user.id;
}

export interface ParsedFile {
  text: string;
  fileType: "PDF" | "DOCX" | "TXT";
  charCount: number;
}

export interface ZipFileEntry {
  filename: string;
  result: ParsedFile | { error: string };
}

export interface ZipParseResult {
  type: "zip";
  entries: ZipFileEntry[];
  skipped: string[];
}

const SINGLE_EXTENSIONS = ["pdf", "docx", "txt"] as const;
// mammoth/pdf-parse/jszip all buffer the whole file into memory before
// parsing — with no cap, a very large upload risks a memory spike. Checked
// against file.size (metadata the browser already provides), so this never
// needs to read or buffer the file to reject it.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

async function parseSingleBuffer(
  buffer: Buffer,
  ext: string
): Promise<ParsedFile | { error: string }> {
  try {
    let text = "";

    if (ext === "txt") {
      text = buffer.toString("utf-8");
    } else if (ext === "pdf") {
      // pdf-parse v2.x exports a named class, not a default function
      const { PDFParse } = await import("pdf-parse");

      // pdfjs-dist v5 always requires a workerSrc — even in fake-worker (Node.js) mode.
      // Point it to the worker bundle so the fake worker can import() it inline.
      const { join } = await import("node:path");
      const { pathToFileURL } = await import("node:url");
      const workerSrc = pathToFileURL(
        join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")
      ).href;
      PDFParse.setWorker(workerSrc);

      const data = new Uint8Array(buffer);
      const parser = new PDFParse({ data });
      const result = await parser.getText();

      text = result.text;
      await parser.destroy();
    } else if (ext === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return { error: "No readable text found." };
    }

    return {
      text: trimmed,
      fileType: ext.toUpperCase() as "PDF" | "DOCX" | "TXT",
      charCount: trimmed.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logError("Parse failed", { context: { error: message } });
    if (stack) logError("Parse failed - stack trace", { context: { stack } });
    return { error: `Parse failed: ${message}` };
  }
}

async function parseZip(buffer: Buffer): Promise<ZipParseResult | { error: string }> {
  let zip: Awaited<ReturnType<typeof JSZip.prototype.loadAsync>>;
  try {
    zip = await new JSZip().loadAsync(buffer);
  } catch {
    return { error: "Failed to open ZIP archive. The file may be corrupted or password-protected." };
  }

  const sortedEntries = Object.entries(zip.files)
    .filter(([, entry]) => !entry.dir)
    .sort(([a], [b]) => a.localeCompare(b));

  if (sortedEntries.length === 0) {
    return { error: "The ZIP archive is empty." };
  }

  const entries: ZipFileEntry[] = [];
  const skipped: string[] = [];

  for (const [filename, zipEntry] of sortedEntries) {
    const basename = filename.split("/").pop() ?? "";
    // Skip macOS metadata and hidden files
    if (basename.startsWith(".") || filename.includes("__MACOSX/")) continue;

    const ext = getExtension(filename);

    if (!(SINGLE_EXTENSIONS as readonly string[]).includes(ext)) {
      skipped.push(filename);
      continue;
    }

    try {
      const fileBuffer = Buffer.from(await zipEntry.async("arraybuffer"));
      const result = await parseSingleBuffer(fileBuffer, ext);
      entries.push({ filename, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      entries.push({ filename, result: { error: `Failed to read: ${message}` } });
    }
  }

  return { type: "zip", entries, skipped };
}

export async function parseProblemFile(
  formData: FormData
): Promise<ParsedFile | ZipParseResult | { error: string }> {
  const adminId = await requireAdmin();
  const rateLimit = checkRateLimit("bulkImport", adminId);
  if (!rateLimit.allowed) {
    return { error: "You're importing too frequently. Please wait a while and try again." };
  }
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { error: "No file received." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      error: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB, which exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB upload limit. Split it into smaller files or a smaller ZIP and try again.`,
    };
  }

  const ext = getExtension(file.name);

  const allSupported = [...SINGLE_EXTENSIONS, "zip"];
  if (!allSupported.includes(ext)) {
    return {
      error: `".${ext || "unknown"}" is not a supported type. Upload a PDF, DOCX, TXT, or ZIP file.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === "zip") {
    return parseZip(buffer);
  }

  return parseSingleBuffer(buffer, ext);
}
