import { getSqlLeaderboardAllRanges } from "@/lib/actions/leaderboard";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardTable } from "./LeaderboardTable";

export default async function LeaderboardPage() {
  const supabase = createClient();
  const [{ data: { user } }, data] = await Promise.all([
    supabase.auth.getUser(),
    getSqlLeaderboardAllRanges(),
  ]);

  return (
    <div className="max-w-container-max mx-auto flex flex-col gap-6">
      <LeaderboardTable data={data} currentUserId={user?.id ?? null} />
    </div>
  );
}
