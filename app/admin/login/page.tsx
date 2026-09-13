"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminSignIn, adminVerifyMfaLogin } from "@/lib/auth/actions";

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Set only after a correct password when the account has 2FA enrolled —
  // switches the form to the "enter your code" step instead of finishing.
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await adminSignIn(email, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    if (result.requiresMfa && result.mfaFactorId) {
      setMfaFactorId(result.mfaFactorId);
      return;
    }
    router.push("/admin/dashboard");
  }

  async function handleVerifyMfa(e: FormEvent) {
    e.preventDefault();
    if (!mfaFactorId) return;
    setError(null);
    setLoading(true);
    const result = await adminVerifyMfaLogin(mfaFactorId, mfaCode);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    router.push("/admin/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-container p-6 md:p-4">
      <div className="w-full max-w-5xl bg-surface-bright rounded-2xl shadow-card overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-1/2 p-6 md:p-16 flex flex-col">
          <div className="text-center mb-5 md:mb-8">
            <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight">{"{R.}"}</span>
            <p className="font-headline-md text-headline-md text-on-surface mt-1">Ravi Programming Academy</p>
            <p className="font-body-md text-body-md text-secondary mt-1">Admin Panel</p>
          </div>

          {mfaFactorId ? (
            <>
              <p className="font-body-md text-body-md font-bold text-on-surface mb-2">Enter your authentication code</p>
              <p className="font-label-md text-label-md text-on-surface-variant mb-4 md:mb-6">Open your authenticator app and enter the 6-digit code for this account.</p>
              <form onSubmit={handleVerifyMfa} className="space-y-4 md:space-y-5">
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Authentication code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 md:py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary tracking-[0.3em] text-center font-mono text-lg"
                  />
                </div>
                {error && (
                  <p className="font-label-md text-label-md text-error">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-container text-white py-2.5 md:py-3 rounded-lg font-label-md text-label-md font-bold hover:bg-primary-container/90 transition-colors disabled:opacity-60"
                >
                  {loading ? "Verifying…" : "Verify"}
                </button>
                <button
                  type="button"
                  onClick={() => { setMfaFactorId(null); setMfaCode(""); setError(null); }}
                  className="w-full font-label-md text-label-md text-on-surface-variant hover:text-on-surface text-center"
                >
                  Back to login
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="font-body-md text-body-md font-bold text-on-surface mb-4 md:mb-6">Sign in to your admin account.</p>

              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Username</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[20px]">person</span>
                    <input
                      type="text"
                      placeholder="Enter username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[20px]">lock</span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-12 py-2.5 md:py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                      <span className="material-symbols-outlined text-[20px]">{showPassword ? "visibility" : "visibility_off"}</span>
                    </button>
                  </div>
                </div>
                {error && (
                  <p className="font-label-md text-label-md text-error">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-container text-white py-2.5 md:py-3 rounded-lg font-label-md text-label-md font-bold hover:bg-primary-container/90 transition-colors disabled:opacity-60"
                >
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>

              <div className="flex items-center gap-3 my-4 md:my-6">
                <div className="flex-1 h-px bg-outline-variant/30" />
                <span className="font-label-sm text-label-sm text-on-surface-variant">OR</span>
                <div className="flex-1 h-px bg-outline-variant/30" />
              </div>

              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 border border-outline-variant/40 py-2.5 md:py-3 rounded-lg font-label-md text-label-md font-medium text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">school</span> Student Login
              </Link>
            </>
          )}

          <p className="font-label-sm text-label-sm text-on-surface-variant text-center mt-5 md:mt-8">© 2026 Ravi Programming Academy</p>
        </div>

        <div className="hidden md:flex w-1/2 bg-primary-container flex-col relative overflow-hidden p-10">
          <div className="relative z-10">
            <h2 className="font-headline-lg text-headline-lg text-white leading-snug">
              Empowering learners.<br />
              Building the <span className="text-secondary-container font-bold">future</span> with code.
            </h2>
            <div className="w-12 h-1 bg-secondary-container rounded-full mt-4" />
          </div>

          <div className="relative flex-1 mt-6 flex items-center justify-center">
            <div className="relative w-full max-w-[320px] h-[320px]">
              <div className="absolute left-1/2 top-[18%] -translate-x-1/2 w-56 h-56 bg-secondary-container/30 rounded-full blur-3xl" />

              <div className="absolute left-0 top-0 w-11 h-11 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center text-secondary-container font-mono text-sm backdrop-blur-sm">
                {"</>"}
              </div>
              <div className="absolute right-2 top-6 w-9 h-9 rounded-lg border border-white/15 bg-white/5 flex items-center justify-center backdrop-blur-sm">
                <span className="material-symbols-outlined text-white/60 text-[18px]">keyboard</span>
              </div>

              <div className="absolute left-1/2 top-[14%] -translate-x-1/2 w-[68%]">
                <div className="rounded-lg bg-slate-950 border border-white/10 shadow-xl p-3">
                  <div className="flex gap-1 mb-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 rounded-full bg-secondary-container/70 w-[70%]" />
                    <div className="h-1.5 rounded-full bg-secondary-container/50 w-[85%]" />
                    <div className="h-1.5 rounded-full bg-secondary-container/40 w-[55%]" />
                    <div className="h-1.5 rounded-full bg-secondary-container/60 w-[75%]" />
                    <div className="h-1.5 rounded-full bg-secondary-container/30 w-[40%]" />
                  </div>
                </div>
                <div className="w-10 h-3 bg-slate-800 mx-auto rounded-b-sm" />
                <div className="w-20 h-1.5 bg-slate-800/80 mx-auto rounded-full" />
              </div>

              <div className="absolute right-[6%] top-[8%] flex flex-col items-center">
                <span className="w-10 h-7 rounded-full bg-amber-200/80 blur-[5px]" />
                <span className="w-px h-16 bg-white/25" />
                <span className="w-6 h-1.5 rounded-full bg-white/20" />
              </div>

              <div className="absolute left-1/2 top-[58%] -translate-x-1/2 w-[82%] h-24 bg-slate-800/50 rounded-t-[36px] border-t border-x border-white/10" />

              <div className="absolute left-1 bottom-2 flex flex-col items-center">
                <div className="flex items-end justify-center -space-x-1 mb-0.5">
                  <span className="w-4 h-7 bg-emerald-500/70 rounded-full -rotate-[24deg] origin-bottom" />
                  <span className="w-4 h-9 bg-emerald-400/80 rounded-full" />
                  <span className="w-4 h-7 bg-emerald-500/70 rounded-full rotate-[24deg] origin-bottom" />
                </div>
                <div className="w-9 h-7 bg-white/10 border border-white/15 rounded-b-lg" />
              </div>

              <div className="absolute left-14 bottom-1 w-6 h-5 rounded-md bg-white/10 border border-white/15 flex items-center justify-center">
                <span className="font-label-sm text-[8px] text-white/60">{"{R.}"}</span>
              </div>

              <div className="absolute right-0 bottom-0 flex flex-col items-start gap-1">
                {["SYSTEM DESIGN", "ALGORITHMS", "DATA STRUCTURES"].map((label) => (
                  <div key={label} className="w-28 h-4 bg-white/10 border border-white/15 rounded-sm flex items-center px-1.5">
                    <span className="font-label-sm text-[7px] tracking-wider text-white/50">{label}</span>
                  </div>
                ))}
              </div>

              <div className="absolute left-0 right-0 bottom-0 h-px bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
