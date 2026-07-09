"use client";

import { useState } from "react";
import { CURRENT_USER, STUDENT_CART_ITEMS } from "@/lib/mock-data";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: "person", description: "View and update your personal information" },
  { id: "security", label: "Security", icon: "shield_locked", description: "Password and security settings" },
  { id: "subscription", label: "Subscription", icon: "workspace_premium", description: "Manage your plan and billing details" },
] as const;

export default function SettingsPage() {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("profile");
  const [fullName, setFullName] = useState(CURRENT_USER.fullName);
  const [username, setUsername] = useState(CURRENT_USER.username);
  const [email, setEmail] = useState(CURRENT_USER.email);
  const [plansOpen, setPlansOpen] = useState(false);
  const premiumPlan = STUDENT_CART_ITEMS[0];

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
              <form className="space-y-stack-gap max-w-xl" onSubmit={(e) => e.preventDefault()}>
                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-on-surface font-bold">Full Name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-secondary" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-on-surface font-bold">Username</label>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-secondary" />
                </div>
                <div className="flex flex-col gap-2 pb-4">
                  <label className="font-label-md text-label-md text-on-surface font-bold">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-secondary" />
                </div>
                <Button type="submit">Save Changes</Button>
              </form>
            </>
          )}

          {section === "security" && (
            <>
              <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Security</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-8">Manage your password and account security settings.</p>
              <form className="space-y-6 max-w-xl" onSubmit={(e) => e.preventDefault()}>
                <div className="flex flex-col gap-2">
                  <label className="font-medium text-on-surface text-sm">Current Password</label>
                  <input type="password" placeholder="Enter current password" className="w-full px-4 py-2.5 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-medium text-on-surface text-sm">New Password</label>
                  <input type="password" placeholder="Enter new password" className="w-full px-4 py-2.5 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-medium text-on-surface text-sm">Confirm New Password</label>
                  <input type="password" placeholder="Confirm new password" className="w-full px-4 py-2.5 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" />
                </div>
                <div className="pt-2 flex justify-end">
                  <Button type="submit">Update Password</Button>
                </div>
              </form>
            </>
          )}

          {section === "subscription" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Subscription</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">Manage your plan and billing details.</p>
                </div>
                <span className="px-4 py-1.5 rounded-full bg-secondary-fixed text-secondary font-label-md text-label-md font-semibold">Free Plan</span>
              </div>
              <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/20 flex flex-col md:flex-row gap-6 md:items-center">
                <div className="flex-1 space-y-4">
                  <h4 className="font-headline-md text-body-lg font-semibold text-on-surface">Free Plan Includes:</h4>
                  <ul className="space-y-3 font-body-md text-body-md text-on-surface-variant">
                    {["Solve Programming Problems", "Solve SQL Problems", "Track Progress", "Participate in Leaderboards"].map((f) => (
                      <li key={f} className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-secondary text-lg">check</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="hidden md:block w-px h-32 bg-outline-variant/30" />
                <div className="flex-1 space-y-4">
                  <h4 className="font-headline-md text-body-lg font-semibold text-on-surface">Upgrade to Premium</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">Unlock premium features and take your learning to the next level.</p>
                  <Button variant="primary" className="bg-secondary hover:bg-secondary/90" onClick={() => setPlansOpen(true)}>View Plans</Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {plansOpen && (
        <Modal title="Upgrade to Premium" onClose={() => setPlansOpen(false)} maxWidth="max-w-md">
          <div className="space-y-6">
            <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/20 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-md text-body-lg font-semibold text-on-surface">{premiumPlan.name}</h3>
                <span className="font-headline-md text-headline-md text-secondary font-bold">{premiumPlan.price}</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">{premiumPlan.description}</p>
              <ul className="space-y-3 font-body-md text-body-md text-on-surface-variant">
                {["Everything in Free Plan", "Unlock all premium problems", "Priority support", "Exclusive contests"].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-lg">check</span>{f}
                  </li>
                ))}
              </ul>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant text-center">One-time payment — no recurring charges.</p>
            <Button variant="primary" className="w-full bg-secondary hover:bg-secondary/90" onClick={() => setPlansOpen(false)}>
              Buy Now — {premiumPlan.price}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
