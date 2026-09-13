// Password reuse prevention — independent of Supabase Auth's own password
// storage, which this app has no read access to (and shouldn't). Every
// successful password change hashes and records the new password here
// (recordPasswordChange), so the next change can be checked against the
// student's recent ones (isPasswordReused) without ever touching Supabase's
// internal storage.
//
// Uses Node's built-in crypto.scrypt rather than adding a bcrypt-style
// dependency — scrypt is a well-established, secure KDF already in Node
// core, so this needs no new package at all (and avoids any repeat of the
// better-sqlite3 native-module Vercel-tracing issue: zero new dependencies
// means zero new tracing risk).
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
// How many of the student's most recent passwords are checked against and
// retained — matches the "last 3 passwords" policy this was built for.
const HISTORY_LIMIT = 3;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function matchesHash(password: string, stored: string): Promise<boolean> {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(keyHex, "hex");
  // Only compare when lengths match — timingSafeEqual throws on a length
  // mismatch rather than returning false, and a corrupt/foreign-shaped
  // stored value should just fail the check, not crash the request.
  if (derivedKey.length !== storedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}

// Note a real, known gap: a student's very first password (set at signup)
// is never recorded here, since it's set directly through Supabase Auth,
// not through either of this app's own password-change flows. So a
// student's first-ever password change/reset could still "change" to that
// original signup password — history only ever covers passwords set after
// this feature shipped. Not worth working around; it self-resolves the
// first time each student actually changes their password.
export async function isPasswordReused(studentId: string, newPassword: string): Promise<boolean> {
  const history = await prisma.passwordHistory.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { passwordHash: true },
  });
  for (const entry of history) {
    if (await matchesHash(newPassword, entry.passwordHash)) return true;
  }
  return false;
}

// Records a successful password change and prunes anything beyond the most
// recent HISTORY_LIMIT entries, so this table never grows unbounded.
export async function recordPasswordChange(studentId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await prisma.passwordHistory.create({ data: { studentId, passwordHash } });

  const recent = await prisma.passwordHistory.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { id: true },
  });
  await prisma.passwordHistory.deleteMany({
    where: { studentId, id: { notIn: recent.map((r) => r.id) } },
  });
}
