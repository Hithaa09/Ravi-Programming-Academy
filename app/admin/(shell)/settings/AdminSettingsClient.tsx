"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { updatePassword } from "@/lib/actions/settings";
import { updatePlatformSettings } from "@/lib/payments/settings";

const SUB_TABS = [
  { id: "profile", label: "Profile", desc: "Manage your personal information", icon: "person" },
  { id: "account", label: "Account", desc: "Manage your account details", icon: "lock" },
  { id: "payments", label: "Payments", desc: "Enable Razorpay checkout and set the price", icon: "payments" },
] as const;
type SubTab = (typeof SUB_TABS)[number]["id"];

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

function PasswordField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary pr-12"
        />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
          <span className="material-symbols-outlined text-[20px]">{show ? "visibility" : "visibility_off"}</span>
        </button>
      </div>
    </div>
  );
}

interface Props {
  initials: string;
  fullName: string;
  email: string;
  role: string;
  joinedOn: string;
  initialPaymentsEnabled: boolean;
  initialSubscriptionPriceInr: number;
}

export function AdminSettingsClient({
  initials,
  fullName,
  email,
  role,
  joinedOn,
  initialPaymentsEnabled,
  initialSubscriptionPriceInr,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>("profile");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [paymentsEnabled, setPaymentsEnabled] = useState(initialPaymentsEnabled);
  const [subscriptionPriceInr, setSubscriptionPriceInr] = useState(String(initialSubscriptionPriceInr));
  const [paymentsSaving, setPaymentsSaving] = useState(false);
  const [paymentsFeedback, setPaymentsFeedback] = useState<Feedback | null>(null);

  async function handleSavePaymentSettings(e: FormEvent) {
    e.preventDefault();
    setPaymentsFeedback(null);
    const price = Number(subscriptionPriceInr);
    if (!Number.isFinite(price) || price < 0) {
      setPaymentsFeedback({ type: "error", text: "Price must be a non-negative number." });
      return;
    }
    setPaymentsSaving(true);
    const result = await updatePlatformSettings({ paymentsEnabled, subscriptionPriceInr: price });
    setPaymentsSaving(false);
    if (result.error) {
      setPaymentsFeedback({ type: "error", text: result.error });
      return;
    }
    setPaymentsFeedback({ type: "success", text: "Payment settings saved." });
  }

  async function handleUpdatePassword(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    setSaving(true);
    const result = await updatePassword(currentPassword, newPassword);
    setSaving(false);
    if ("error" in result) {
      setFeedback({ type: "error", text: result.error });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFeedback({ type: "success", text: "Password updated successfully." });
  }

  return (
    <div className="max-w-container-max mx-auto">
      <h1 className="font-headline-xl text-headline-xl text-on-surface">Settings</h1>
      <p className="font-body-md text-body-md text-on-surface-variant mt-1 mb-8">Manage your profile, account and application preferences.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <Card className="p-2 h-fit">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${subTab === t.id ? "bg-secondary/10" : "hover:bg-surface-container-low"}`}
            >
              <span className={`material-symbols-outlined text-[20px] mt-0.5 ${subTab === t.id ? "text-secondary" : "text-on-surface-variant"}`}>{t.icon}</span>
              <div>
                <p className={`font-label-md text-label-md font-semibold ${subTab === t.id ? "text-secondary" : "text-on-surface"}`}>{t.label}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{t.desc}</p>
              </div>
            </button>
          ))}
        </Card>

        <div className="space-y-6">
          {subTab === "profile" && (
            <>
              <Card className="p-card-padding">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-1">Profile Information</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">Update your personal information and profile details.</p>
                <div className="flex flex-col sm:flex-row gap-8">
                  <div className="relative w-20 h-20 shrink-0">
                    <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center text-white font-headline-lg text-headline-lg font-bold">
                      {initials}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 flex-1">
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant">Full Name</p><p className="text-on-surface font-medium mt-0.5">{fullName}</p></div>
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant">Email</p><p className="text-on-surface font-medium mt-0.5">{email}</p></div>
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant">Role</p><p className="text-on-surface font-medium mt-0.5 capitalize">{role}</p></div>
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant">Joined On</p><p className="text-on-surface font-medium mt-0.5">{joinedOn}</p></div>
                  </div>
                </div>
              </Card>

            </>
          )}

          {subTab === "account" && (
            <>
              <Card className="p-card-padding max-w-xl">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-1">Change Password</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">Choose a strong password to keep your account secure.</p>
                <FeedbackBanner feedback={feedback} />
                <form className="space-y-5" onSubmit={handleUpdatePassword}>
                  <PasswordField label="Current Password" placeholder="Enter current password" value={currentPassword} onChange={setCurrentPassword} />
                  <PasswordField label="New Password" placeholder="Enter new password" value={newPassword} onChange={setNewPassword} />
                  <PasswordField label="Confirm New Password" placeholder="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} />
                  <Button type="submit" disabled={saving}>{saving ? "Updating…" : "Update Password"}</Button>
                </form>
              </Card>
            </>
          )}

          {subTab === "payments" && (
            <Card className="p-card-padding max-w-xl">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-1">Payments</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                Controls the Razorpay checkout on the student-facing Buy Subscription page. Turning this off immediately
                hides checkout from students — existing lifetime access is never affected either way.
              </p>
              <FeedbackBanner feedback={paymentsFeedback} />
              <form className="space-y-5" onSubmit={handleSavePaymentSettings}>
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Checkout Status</label>
                  <select
                    value={paymentsEnabled ? "enabled" : "disabled"}
                    onChange={(e) => setPaymentsEnabled(e.target.value === "enabled")}
                    className="w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                  >
                    <option value="disabled">Disabled — students see &quot;not yet available&quot;</option>
                    <option value="enabled">Enabled — students can buy lifetime access</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Subscription Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={subscriptionPriceInr}
                    onChange={(e) => setSubscriptionPriceInr(e.target.value)}
                    placeholder="e.g. 999"
                    className="w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                  <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                    A price of 0 keeps checkout unavailable to students even if Checkout Status is Enabled.
                  </p>
                </div>
                <Button type="submit" disabled={paymentsSaving}>{paymentsSaving ? "Saving…" : "Save Payment Settings"}</Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
