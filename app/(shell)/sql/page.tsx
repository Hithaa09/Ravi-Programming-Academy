import { Suspense } from "react";
import { getSqlProblems } from "@/lib/actions/sql-problems";
import { StudentSqlTable } from "@/components/StudentSqlTable";
import { getAuthUser } from "@/lib/auth/get-user";
import { hasLifetimeAccess } from "@/lib/payments/access";

type SearchParams = { [key: string]: string | string[] | undefined };
function sp(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
}

export default async function SqlPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [problems, user] = await Promise.all([
    getSqlProblems({
      onlyPublished: true,
      search: sp(searchParams, "search"),
      difficulty: sp(searchParams, "difficulty"),
      availability: sp(searchParams, "availability"),
    }),
    getAuthUser(),
  ]);
  const isAdmin = user?.app_metadata?.role === "admin";
  const unlocked = isAdmin || (user ? await hasLifetimeAccess(user.id) : false);
  return (
    <Suspense>
      <StudentSqlTable problems={problems} hasLifetimeAccess={unlocked} />
    </Suspense>
  );
}
