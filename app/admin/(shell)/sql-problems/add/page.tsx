import { SqlProblemForm } from "@/components/SqlProblemForm";

export default function AddSqlProblemPage() {
  return (
    <SqlProblemForm
      mode="create"
      backHref="/admin/sql-problems"
      cancelHref="/admin/sql-problems"
    />
  );
}
