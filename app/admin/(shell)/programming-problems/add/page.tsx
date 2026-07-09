import { ProgrammingProblemForm } from "@/components/ProgrammingProblemForm";

export default function AddProgrammingProblemPage() {
  return (
    <ProgrammingProblemForm
      mode="create"
      backHref="/admin/programming-problems"
      cancelHref="/admin/programming-problems"
    />
  );
}
