"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateStudent, suspendStudent } from "@/lib/actions/admin-students";
import { grantLifetimeAccess, revokeLifetimeAccess } from "@/lib/payments/access";
import type { StudentProfile } from "@/lib/actions/admin-students";
import { Button } from "@/components/ui/Button";

export function StudentDetailClient({ student }: { student: StudentProfile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleToggle() {
    const action = student.status === "active" ? suspendStudent : activateStudent;
    await action(student.id);
    startTransition(() => router.refresh());
  }

  // Manual grant/revoke — the only way to change this while Razorpay isn't
  // wired up. A future checkout webhook calls the exact same
  // grantLifetimeAccess() instead of this button.
  async function handleToggleAccess() {
    const action = student.hasLifetimeAccess ? revokeLifetimeAccess : grantLifetimeAccess;
    await action(student.id);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button
        variant={student.status === "active" ? "danger-outline" : "secondary"}
        onClick={handleToggle}
        disabled={isPending}
      >
        <span className="material-symbols-outlined text-[18px]">
          {student.status === "active" ? "block" : "check_circle"}
        </span>
        {isPending ? "Updating…" : student.status === "active" ? "Suspend Student" : "Activate Student"}
      </Button>
      <Button
        variant={student.hasLifetimeAccess ? "danger-outline" : "secondary"}
        onClick={handleToggleAccess}
        disabled={isPending}
      >
        <span className="material-symbols-outlined text-[18px]">
          {student.hasLifetimeAccess ? "remove_circle" : "workspace_premium"}
        </span>
        {isPending
          ? "Updating…"
          : student.hasLifetimeAccess ? "Revoke Lifetime Access" : "Grant Lifetime Access"}
      </Button>
    </div>
  );
}
