import { createClient } from "@/lib/supabase/server";
import { getSqlSubmissionsByStudent } from "@/lib/actions/sql-submissions";
import { SubmissionsTable } from "./SubmissionsTable";

export default async function SubmissionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const submissions = user ? await getSqlSubmissionsByStudent(user.id) : [];

  return (
    <div className="max-w-container-max mx-auto">
      <h1 className="font-headline-xl text-headline-xl text-on-surface mb-8">Submissions</h1>
      <SubmissionsTable submissions={submissions} />
    </div>
  );
}
