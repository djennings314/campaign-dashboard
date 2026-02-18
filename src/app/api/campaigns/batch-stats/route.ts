import { NextResponse } from "next/server";
import {
  getSmartleadCampaignAnalytics,
  type SmartleadCampaignLeadStats,
} from "@/lib/api/smartlead";
import type { HeyReachProgressStats } from "@/lib/types";

export const dynamic = "force-dynamic";

function toLeadStats(ls: SmartleadCampaignLeadStats): HeyReachProgressStats {
  return {
    totalUsers: ls.total,
    totalUsersPending: ls.notStarted,
    totalUsersInProgress: ls.inprogress,
    totalUsersFinished: ls.completed,
    totalUsersFailed: ls.blocked,
    totalUsersManuallyStopped: ls.stopped + ls.paused,
    totalUsersExcluded: 0,
  };
}

/**
 * GET /api/campaigns/batch-stats?ids=sl_123,sl_456,...
 * Fetches analytics for a batch of Smartlead campaign IDs.
 * Returns { [unifiedId]: HeyReachProgressStats }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("sl_"));

  if (ids.length === 0) {
    return NextResponse.json({ data: {} });
  }

  // Cap at 5 per request to stay within Vercel's 10s function timeout
  const batch = ids.slice(0, 5);
  const results = await Promise.allSettled(
    batch.map(async (uid) => {
      const numId = Number(uid.replace("sl_", ""));
      const analytics = await getSmartleadCampaignAnalytics(numId);
      return { uid, analytics };
    })
  );

  const data: Record<string, HeyReachProgressStats> = {};
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.analytics.campaign_lead_stats) {
      data[r.value.uid] = toLeadStats(r.value.analytics.campaign_lead_stats);
    }
  }

  return NextResponse.json({ data });
}
