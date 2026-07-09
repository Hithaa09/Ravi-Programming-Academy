"use server";

import JSZip from "jszip";

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
      console.log("[parse] [1/3] TXT: decoding buffer as UTF-8");
      text = buffer.toString("utf-8");
      console.log(`[parse] [2/3] TXT: decoded ${text.length} characters`);
      console.log("[parse] [3/3] TXT: done");
    } else if (ext === "pdf") {
      console.log("[parse] [1/8] PDF: file received, buffer length:", buffer.length, "bytes");

      console.log("[parse] [2/8] PDF: importing pdf-parse v2.x (PDFParse class)...");
      // pdf-parse v2.x exports a named class, not a default function
      const { PDFParse } = await import("pdf-parse");
      console.log("[parse] [3/8] PDF: pdf-parse imported, PDFParse type:", typeof PDFParse);

      // pdfjs-dist v5 always requires a workerSrc — even in fake-worker (Node.js) mode.
      // Point it to the worker bundle so the fake worker can import() it inline.
      const { join } = await import("node:path");
      const { pathToFileURL } = await import("node:url");
      const workerSrc = pathToFileURL(
        join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")
      ).href;
      PDFParse.setWorker(workerSrc);
      console.log("[parse] [4/8] PDF: worker configured");

      console.log("[parse] [5/8] PDF: converting Buffer to Uint8Array...");
      const data = new Uint8Array(buffer);
      console.log("[parse] [6/8] PDF: Uint8Array created, length:", data.length);

      console.log("[parse] [7/8] PDF: constructing PDFParse instance...");
      const parser = new PDFParse({ data });
      console.log("[parse] [8/8] PDF: calling parser.getText()...");

      const result = await parser.getText();
      console.log(
        `[parse] ✓ PDF parsed — ${result.total} page(s), ${result.text.length} characters`
      );

      text = result.text;
      await parser.destroy();
    } else if (ext === "docx") {
      console.log("[parse] [1/4] DOCX: file received, buffer length:", buffer.length, "bytes");
      console.log("[parse] [2/4] DOCX: importing mammoth...");
      const mammoth = await import("mammoth");
      console.log("[parse] [3/4] DOCX: calling extractRawText...");
      const result = await mammoth.extractRawText({ buffer });
      console.log(`[parse] [4/4] DOCX: extracted ${result.value.length} characters`);
      text = result.value;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      console.log("[parse] ✗ No readable text found after trim");
      return { error: "No readable text found." };
    }

    console.log(`[parse] ✓ Final text: ${trimmed.length} characters (type: ${ext.toUpperCase()})`);
    return {
      text: trimmed,
      fileType: ext.toUpperCase() as "PDF" | "DOCX" | "TXT",
      charCount: trimmed.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[parse] ✗ Parse failed:", message);
    if (stack) console.error("[parse] Stack trace:\n", stack);
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
      console.log(`[parse-problem-file] ✗ Skipped (unsupported): ${filename}`);
      continue;
    }

    console.log(`[parse-problem-file] ✓ Parsing: ${filename}`);
    try {
      const fileBuffer = Buffer.from(await zipEntry.async("arraybuffer"));
      const result = await parseSingleBuffer(fileBuffer, ext);
      entries.push({ filename, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      entries.push({ filename, result: { error: `Failed to read: ${message}` } });
    }
  }

  console.log(
    `[parse-problem-file] ✓ ZIP processed: ${entries.length} parsed, ${skipped.length} skipped`
  );

  return { type: "zip", entries, skipped };
}

export async function parseProblemFile(
  formData: FormData
): Promise<ParsedFile | ZipParseResult | { error: string }> {
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { error: "No file received." };
  }

  const ext = getExtension(file.name);
  console.log(`[parse-problem-file] ✓ File received: ${file.name} (${file.size} bytes)`);

  const allSupported = [...SINGLE_EXTENSIONS, "zip"];
  if (!allSupported.includes(ext)) {
    console.log(`[parse-problem-file] ✗ Unsupported file type: .${ext}`);
    return {
      error: `".${ext || "unknown"}" is not a supported type. Upload a PDF, DOCX, TXT, or ZIP file.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === "zip") {
    console.log(`[parse-problem-file] ✓ ZIP archive detected: ${file.name}`);
    return parseZip(buffer);
  }

  const result = await parseSingleBuffer(buffer, ext);
  if ("error" in result) {
    console.log(`[parse-problem-file] ✗ Parse failed for ${file.name}: ${result.error}`);
    return result;
  }

  console.log(
    `[parse-problem-file] ✓ Text extracted: ${result.charCount} characters from ${file.name}`
  );
  return result;
}
