import { getSqlLeaderboardAllRanges, getTotalStudentCount } from "@/lib/actions/leaderboard";
import { AdminLeaderboardTable } from "./AdminLeaderboardTable";

export default async function AdminLeaderboardPage() {
  const [data, totalStudents] = await Promise.all([
    getSqlLeaderboardAllRanges(),
    getTotalStudentCount(),
  ]);

  return (
    <div className="max-w-container-max mx-auto space-y-6">
      <div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Leaderboard</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">Top students ranked by total problems solved, combining SQL and Programming submissions.</p>
      </div>

      <AdminLeaderboardTable data={data} totalStudents={totalStudents} />
    </div>
  );
}
