"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";

// useSearchParams() (used below to read ?error=... query params) requires a
// Suspense boundary during static prerendering, or `next build` fails on
// this page — the fallback is only ever visible for an instant since the
// page has no server data to actually wait on.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-primary-container" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "google_email_taken") {
      setError("An account with this email already exists. Please log in with your password instead.");
    } else if (err === "suspended") {
      setError("Your account has been suspended. Please contact your administrator.");
    } else if (err === "no_profile") {
      setError("Your account could not be found. Please contact your administrator.");
    } else if (err === "invalid_reset_link") {
      setError("That password reset link is invalid or has expired. Please request a new one.");
    }
  }, [searchParams]);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup fields
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  function switchTab(next: "login" | "signup") {
    setTab(next);
    setError(null);
    setSignupSuccess(false);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(loginEmail, loginPassword);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    router.push("/dashboard");
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success, Supabase redirects the browser to Google — no further action needed here.
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    if (signupPassword !== signupConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await signUp(signupEmail, signupPassword, signupFullName);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    if (result.requiresEmailConfirmation) { setSignupSuccess(true); return; }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-container p-6 md:p-4">
      <Link
        href="/admin/login"
        title="Admin Portal"
        aria-label="Admin Portal"
        className="fixed bottom-4 right-4 w-9 h-9 rounded-full bg-primary-container/40 hover:bg-primary-container/70 border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
      >
        <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
      </Link>
      <div className="w-full max-w-5xl bg-primary-container rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-card">
        <div className="hidden md:flex md:w-1/2 pt-12 pb-12 pl-10 pr-8 flex-col justify-center relative overflow-hidden">
          <span className="font-headline-xl text-[64px] leading-none text-surface-container-lowest tracking-tight">{"{R.}"}</span>
          <p className="font-body-md text-[22px] text-surface-container-lowest/80 mt-3">Ravi Programming Academy</p>
          <h2 className="font-headline-lg text-[48px] leading-tight text-white mt-10">
            Learn. <span className="text-tertiary-fixed-dim">Practice.</span> Improve.
          </h2>
          <p className="font-body-md text-[20px] text-surface-container-lowest/70 mt-4">
            Solve problems.<br />Track progress.<br />Master programming.
          </p>
          <pre className="font-label-md text-[18px] text-surface-container-lowest/40 mt-12 leading-7">
{`// Keep coding. Keep improving.
function grow() {
  while (learning) {
    practice();
    improve();
  }
}
grow();`}
          </pre>
        </div>

        <div className="md:w-1/2 bg-surface-bright p-6 md:p-10 flex flex-col justify-center rounded-2xl">
          <div className="flex p-1 bg-surface-container-low rounded-full mb-5 md:mb-8 w-full max-w-xs md:mx-auto">
            <button
              type="button"
              onClick={() => switchTab("login")}
              className={`flex-1 py-2 rounded-full font-label-md text-label-md font-bold uppercase tracking-wide transition-colors ${tab === "login" ? "bg-white shadow-sm text-on-surface" : "text-on-surface-variant"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchTab("signup")}
              className={`flex-1 py-2 rounded-full font-label-md text-label-md font-bold uppercase tracking-wide transition-colors ${tab === "signup" ? "bg-white shadow-sm text-on-surface" : "text-on-surface-variant"}`}
            >
              Sign Up
            </button>
          </div>

          {tab === "login" ? (
            <>
              <h1 className="font-headline-xl text-headline-xl text-on-surface">Welcome Back</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 mb-5 md:mb-8">Continue your coding journey.</p>
              <form className="space-y-4 md:space-y-5" onSubmit={handleLogin}>
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 md:py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 md:py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div className="flex justify-end text-sm">
                  <a href="/forgot-password" className="text-secondary font-medium">Forgot Password?</a>
                </div>
                {error && (
                  <p className="font-label-md text-label-md text-error">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-container text-white py-2.5 md:py-3 rounded-lg font-label-md text-label-md font-bold hover:bg-primary-container/90 transition-colors disabled:opacity-60"
                >
                  {loading ? "Signing in…" : "Login"}
                </button>
              </form>
            </>
          ) : signupSuccess ? (
            <div className="flex flex-col items-center text-center py-4">
              <span className="material-symbols-outlined text-[48px] text-secondary">mark_email_read</span>
              <h1 className="font-headline-xl text-headline-xl text-on-surface mt-4">Check Your Email</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
                We sent a verification link to <strong>{signupEmail}</strong>.<br />Click it to activate your account.
              </p>
              <button type="button" onClick={() => switchTab("login")} className="mt-6 font-label-md text-label-md text-secondary font-medium hover:underline">
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-headline-xl text-headline-xl text-on-surface">Create Your Account</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 mb-5 md:mb-8">Start your coding journey with us.</p>
              <form className="space-y-4 md:space-y-5" onSubmit={handleSignup}>
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 md:py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 md:py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Password</label>
                  <input
                    type="password"
                    placeholder="Create a password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 md:py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Confirm your password"
                    value={signupConfirm}
                    onChange={(e) => setSignupConfirm(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 md:py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                {error && (
                  <p className="font-label-md text-label-md text-error">{error}</p>
                )}
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  By creating an account, you agree to the{" "}
                  <Link href="/terms" className="text-secondary hover:underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="text-secondary hover:underline">Privacy Policy</Link>.
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-container text-white py-2.5 md:py-3 rounded-lg font-label-md text-label-md font-bold hover:bg-primary-container/90 transition-colors disabled:opacity-60"
                >
                  {loading ? "Creating account…" : "Sign Up"}
                </button>
              </form>
            </>
          )}

          <div className="flex items-center gap-3 my-4 md:my-6">
            <div className="flex-1 h-px bg-outline-variant/30" />
            <span className="font-label-sm text-label-sm text-on-surface-variant">or continue with</span>
            <div className="flex-1 h-px bg-outline-variant/30" />
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-outline-variant/40 rounded-lg py-2.5 md:py-3 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-60"
          >
            Google
          </button>
          <p className="text-center font-label-sm text-label-sm text-on-surface-variant/60 mt-2">
            Signing in with Google creates a new account automatically if you don&apos;t already have one.
          </p>
          <p className="text-center font-label-sm text-label-sm text-on-surface-variant mt-5 md:mt-6">
            <Link href="/privacy" className="text-secondary hover:underline">Privacy Policy</Link>
            {" "}·{" "}
            <Link href="/terms" className="text-secondary hover:underline">Terms of Service</Link>
          </p>
          <p className="text-center font-label-sm text-label-sm text-on-surface-variant mt-2">© 2026 Ravi Programming Academy. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
