// Shared password policy — not a Server Action, just a plain sync helper, so
// it must live outside any "use server" file (Next.js requires every export
// of a "use server" module to itself be an async Server Action; a sync
// helper exported from one fails the production build even though it passes
// tsc/eslint). Used by both the authenticated Settings password change
// (lib/actions/settings.ts) and the forgot-password recovery flow
// (lib/auth/actions.ts), so both enforce the exact same rule server-side.
export const MIN_PASSWORD_LENGTH = 8;

export function validateNewPassword(newPassword: string): string | null {
  if (!newPassword) return "New password is required.";
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}
