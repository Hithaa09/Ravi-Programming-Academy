import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkJudge0Health } from "@/lib/judge0";

// Intentionally lightweight: no dashboards, no metrics, no auth. Just "is
// the app up, can it reach its database, can it reach Judge0" — enough for
// an external uptime check (cron + curl, UptimeRobot, etc.) to alert on,
// which matters specifically because this is a single-server deployment
// with no load balancer or orchestrator otherwise watching it.
export async function GET() {
  const [dbResult, judge0Result] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    checkJudge0Health(),
  ]);

  const database = dbResult.status === "fulfilled";
  const judge0 = judge0Result.status === "fulfilled" && judge0Result.value.ok;

  const healthy = database && judge0;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        database: database ? "ok" : "error",
        judge0: judge0 ? "ok" : "error",
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
