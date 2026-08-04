"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { updateFullName, updatePassword, type MyPurchase } from "@/lib/actions/settings";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: "person", description: "View and update your personal information" },
  { id: "security", label: "Security", icon: "shield_locked", description: "Password and security settings" },
  { id: "subscription", label: "Subscription", icon: "shopping_cart", description: "Manage your lifetime access" },
] as const;

interface Props {
  initialFullName: string;
  initialEmail: string;
  hasLifetimeAccess: boolean;
  purchases: MyPurchase[];
}

function formatAmount(amountPaise: number | null, currency: string): string {
  if (amountPaise === null) return "—";
  const major = amountPaise / 100;
  return currency === "INR" ? `₹${major.toLocaleString("en-IN")}` : `${major.toLocaleString()} ${currency}`;
}

interface Feedback {
  type: "success" | "error";
  text: string;
}

function FeedbackBanner({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  const isError = feedback.type === "error";
  return (
    <div
      className={`mb-6 flex items-center gap-3 rounded-lg px-4 py-3 font-body-md text-body-md ${
        isError
          ? "bg-error/5 border border-error/20 text-error"
          : "bg-status-solved-bg border border-status-solved-text/20 text-status-solved-text"
      }`}
    >
      <span className="material-symbols-outlined text-[18px] shrink-0">{isError ? "error" : "check_circle"}</span>
      {feedback.text}
    </div>
  );
}

export function SettingsClient({ initialFullName, initialEmail, hasLifetimeAccess, purchases }: Props) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("profile");
  const [fullName, setFullName] = useState(initialFullName);
  const [email] = useState(initialEmail);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<Feedback | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback | null>(null);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileFeedback(null);
    setProfileSaving(true);
    const result = await updateFullName(fullName);
    setProfileSaving(false);
    if ("error" in result) {
      setProfileFeedback({ type: "error", text: result.error });
      return;
    }
    setProfileFeedback({ type: "success", text: "Full name updated." });
  }

  async function handleUpdatePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordFeedback(null);
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    setPasswordSaving(true);
    const result = await updatePassword(currentPassword, newPassword);
    setPasswordSaving(false);
    if ("error" in result) {
      setPasswordFeedback({ type: "error", text: result.error });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordFeedback({ type: "success", text: "Password updated successfully." });
  }

  return (
    <div className="max-w-container-max mx-auto">
      <h1 className="font-headline-xl text-headline-xl text-on-surface mb-8">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        <Card className="overflow-hidden self-start">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-4 p-5 border-b border-outline-variant/10 last:border-b-0 text-left transition-colors ${section === s.id ? "bg-surface-container-low" : "hover:bg-surface-container-low/50"}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${section === s.id ? "bg-primary-fixed text-primary" : "bg-surface-container text-on-surface-variant"}`}>
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <div>
                <h3 className="font-headline-md text-body-lg font-semibold text-on-surface">{s.label}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-0.5 text-sm">{s.description}</p>
              </div>
            </button>
          ))}
        </Card>

        <Card className="p-card-padding">
          {section === "profile" && (
            <>
              <h2 className="font-headline-xl text-headline-xl text-primary mb-2">My Profile</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">Manage your personal information.</p>
              <FeedbackBanner feedback={profileFeedback} />
              <form className="space-y-stack-gap max-w-xl" onSubmit={handleSaveProfile}>
                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-on-surface font-bold">Full Name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-secondary" />
                </div>
                <div className="flex flex-col gap-2 pb-4">
                  <label className="font-label-md text-label-md text-on-surface font-bold">Email</label>
                  <input type="email" value={email} disabled title="Email cannot be changed here. Contact an administrator if you need this updated." className="w-full px-4 py-3 bg-surface-container-low text-on-surface-variant border border-outline-variant/50 rounded-lg cursor-not-allowed" />
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Email cannot be changed here. Contact an administrator if you need this updated.</p>
                </div>
                <Button type="submit" disabled={profileSaving}>{profileSaving ? "Saving…" : "Save Changes"}</Button>
              </form>
            </>
          )}

          {section === "security" && (
            <>
              <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Security</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-8">Manage your password and account security settings.</p>
              <FeedbackBanner feedback={passwordFeedback} />
              <form className="space-y-6 max-w-xl" onSubmit={handleUpdatePassword}>
                <div className="flex flex-col gap-2">
                  <label className="font-medium text-on-surface text-sm">Current Password</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="w-full px-4 py-2.5 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-medium text-on-surface text-sm">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="w-full px-4 py-2.5 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-medium text-on-surface text-sm">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full px-4 py-2.5 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" />
                </div>
                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={passwordSaving}>{passwordSaving ? "Updating…" : "Update Password"}</Button>
                </div>
              </form>
            </>
          )}

          {section === "subscription" && (
            <>
              <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Subscription</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-8">
                {hasLifetimeAccess
                  ? "You have lifetime access to every Premium problem on the platform."
                  : "Unlock every Premium Programming and SQL problem with a one-time purchase."}
              </p>
              <div className="max-w-xl bg-surface-container-low border border-outline-variant/20 rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <span className={`material-symbols-outlined text-[32px] ${hasLifetimeAccess ? "text-status-solved-text" : "text-tertiary-fixed-dim"}`}>
                    {hasLifetimeAccess ? "check_circle" : "workspace_premium"}
                  </span>
                  <div className="flex-1">
                    <p className="font-label-md text-label-md font-bold text-on-surface">
                      {hasLifetimeAccess ? "Lifetime Access — Active" : "No active subscription"}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {hasLifetimeAccess ? "Thanks for your purchase!" : "Buy once, unlocked forever."}
                    </p>
                  </div>
                  {!hasLifetimeAccess && (
                    <Link href="/buy-subscription">
                      <Button type="button">Buy Now</Button>
                    </Link>
                  )}
                </div>

                {hasLifetimeAccess && purchases.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-outline-variant/20 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="text-on-surface-variant font-label-sm text-label-sm">Purchased on</p>
                      <p className="text-on-surface font-medium mt-0.5">
                        {purchases[0].createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-on-surface-variant font-label-sm text-label-sm">Receipt ID</p>
                      <p className="text-on-surface font-medium mt-0.5 font-mono">{purchases[0].providerReference ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-on-surface-variant font-label-sm text-label-sm">Amount</p>
                      <p className="text-on-surface font-medium mt-0.5">{formatAmount(purchases[0].amount, purchases[0].currency)}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
