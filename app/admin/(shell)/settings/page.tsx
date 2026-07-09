"use client";

import { useState } from "react";
import { ADMIN_USER } from "@/lib/mock-data";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const SUB_TABS = [
  { id: "profile", label: "Profile", desc: "Manage your personal information", icon: "person" },
  { id: "account", label: "Account", desc: "Manage your account details", icon: "lock" },
] as const;
type SubTab = (typeof SUB_TABS)[number]["id"];

function PasswordField({ label, placeholder }: { label: string; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary pr-12"
        />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
          <span className="material-symbols-outlined text-[20px]">{show ? "visibility" : "visibility_off"}</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [subTab, setSubTab] = useState<SubTab>("profile");

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
                      {ADMIN_USER.initials}
                    </div>
                    <button type="button" className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">photo_camera</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 flex-1">
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant">Full Name</p><p className="text-on-surface font-medium mt-0.5">{ADMIN_USER.name}</p></div>
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant">Username</p><p className="text-on-surface font-medium mt-0.5">{ADMIN_USER.username}</p></div>
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant">Email</p><p className="text-on-surface font-medium mt-0.5">{ADMIN_USER.email}</p></div>
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant">Role</p><p className="text-on-surface font-medium mt-0.5">{ADMIN_USER.role}</p></div>
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant">Phone</p><p className="text-on-surface font-medium mt-0.5">{ADMIN_USER.phone}</p></div>
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant">Joined On</p><p className="text-on-surface font-medium mt-0.5">{ADMIN_USER.joinedOn}</p></div>
                  </div>
                </div>
              </Card>

              <Card className="p-card-padding">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-1">Preferences</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">Customize your application preferences.</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center"><span className="material-symbols-outlined text-secondary">language</span></div>
                      <div>
                        <p className="font-body-md text-body-md font-medium text-on-surface">Language</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">Choose your preferred language</p>
                      </div>
                    </div>
                    <select className="border border-outline-variant/40 rounded-lg text-sm py-2 px-4 bg-white focus:outline-none focus:ring-1 focus:ring-secondary">
                      <option>English</option>
                    </select>
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
                <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                  <PasswordField label="Current Password" placeholder="Enter current password" />
                  <PasswordField label="New Password" placeholder="Enter new password" />
                  <PasswordField label="Confirm New Password" placeholder="Confirm new password" />
                  <Button type="submit">Update Password</Button>
                </form>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
