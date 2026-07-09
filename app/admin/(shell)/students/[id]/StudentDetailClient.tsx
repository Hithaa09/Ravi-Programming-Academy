"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateStudent, suspendStudent } from "@/lib/actions/admin-students";
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

  return (
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
  );
}
