import { getHeyReachCampaigns, getHeyReachOverallStats } from "./heyreach";
import {
  getSmartleadCampaigns,
  getSmartleadOverallStats,
  getSmartleadCampaignAnalytics,
} from "./smartlead";
import type {
  UnifiedCampaign,
  CampaignCategory,
  DashboardStats,
  HeyReachCampaign,
  HeyReachDayStats,
  SmartleadCampaign,
} from "@/lib/types";

const DIRECT_MAIL_RE = /direct\s*mail/i;

function categorize(name: string): CampaignCategory {
  return DIRECT_MAIL_RE.test(name) ? "direct-mail" : "email";
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizeHeyReachCampaign(c: HeyReachCampaign): UnifiedCampaign {
  return {
    id: `hr_${c.id}`,
    platformId: c.id,
    platform: "heyreach",
    name: c.name,
    status: c.status,
    createdAt: c.creationTime,
    leadStats: c.progressStats ?? undefined,
  };
}

function normalizeSmartleadCampaign(c: SmartleadCampaign): UnifiedCampaign {
  return {
    id: `sl_${c.id}`,
    platformId: c.id,
    platform: "smartlead",
    name: c.name,
    status: c.status,
    createdAt: c.created_at,
    category: categorize(c.name),
  };
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

export interface CampaignsResult {
  campaigns: UnifiedCampaign[];
  errors: string[];
}

export async function getAllCampaigns(): Promise<CampaignsResult> {
  const [hrResult, slResult] = await Promise.allSettled([
    getHeyReachCampaigns(),
    getSmartleadCampaigns(),
  ]);

  const campaigns: UnifiedCampaign[] = [];
  const errors: string[] = [];

  if (hrResult.status === "fulfilled") {
    campaigns.push(...hrResult.value.items.map(normalizeHeyReachCampaign));
  } else {
    const msg = `HeyReach: ${hrResult.reason}`;
    console.error("[Unified]", msg);
    errors.push(msg);
  }
  if (slResult.status === "fulfilled") {
    campaigns.push(...slResult.value.map(normalizeSmartleadCampaign));
  } else {
    const msg = `Smartlead: ${slResult.reason}`;
    console.error("[Unified]", msg);
    errors.push(msg);
  }

  campaigns.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return { campaigns, errors };
}

function aggregateDayStats(byDayStats: Record<string, HeyReachDayStats>) {
  let connectionsSent = 0;
  let connectionsAccepted = 0;
  let messagesSent = 0;
  let messageReplies = 0;

  for (const day of Object.values(byDayStats)) {
    connectionsSent += day.connectionsSent;
    connectionsAccepted += day.connectionsAccepted;
    messagesSent += day.messagesSent;
    messageReplies += day.totalMessageReplies;
  }

  return { connectionsSent, connectionsAccepted, messagesSent, messageReplies };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const startDate = "2024-01-01";
  const endDate = new Date().toISOString().split("T")[0];

  const [hrCampaigns, hrStats, slCampaigns, slOverall] =
    await Promise.allSettled([
      getHeyReachCampaigns(),
      getHeyReachOverallStats([], startDate, endDate),
      getSmartleadCampaigns(),
      getSmartleadOverallStats(startDate, endDate),
    ]);

  // ── HeyReach: aggregate lead stats from progressStats ──
  const hrItems =
    hrCampaigns.status === "fulfilled" ? hrCampaigns.value.items : [];
  if (hrCampaigns.status === "rejected") {
    console.error("[Stats] HeyReach campaigns failed:", hrCampaigns.reason);
  }

  const hrLeadsByStatus = {
    pending: 0,
    inProgress: 0,
    finished: 0,
    failed: 0,
    stopped: 0,
    excluded: 0,
  };
  let hrTotalLeads = 0;
  for (const c of hrItems) {
    const p = c.progressStats;
    if (!p) continue;
    hrLeadsByStatus.pending += p.totalUsersPending;
    hrLeadsByStatus.inProgress += p.totalUsersInProgress;
    hrLeadsByStatus.finished += p.totalUsersFinished;
    hrLeadsByStatus.failed += p.totalUsersFailed;
    hrLeadsByStatus.stopped += p.totalUsersManuallyStopped;
    hrLeadsByStatus.excluded += p.totalUsersExcluded;
    hrTotalLeads += p.totalUsers;
  }

  const hrAggregated =
    hrStats.status === "fulfilled"
      ? aggregateDayStats(hrStats.value.byDayStats)
      : { connectionsSent: 0, connectionsAccepted: 0, messagesSent: 0, messageReplies: 0 };
  if (hrStats.status === "rejected") {
    console.error("[Stats] HeyReach stats failed:", hrStats.reason);
  }

  // ── Smartlead: campaign status counts from campaign list ──
  const slItems =
    slCampaigns.status === "fulfilled" ? slCampaigns.value : [];
  if (slCampaigns.status === "rejected") {
    console.error("[Stats] Smartlead campaigns failed:", slCampaigns.reason);
  }

  const campaignsByStatus: Record<string, number> = {};
  for (const c of slItems) {
    const s = c.status?.toUpperCase() ?? "UNKNOWN";
    campaignsByStatus[s] = (campaignsByStatus[s] ?? 0) + 1;
  }

  // Fetch per-campaign analytics for active Smartlead campaigns (top 50)
  const activeSl = slItems
    .filter((c) => c.status?.toUpperCase() === "ACTIVE")
    .slice(0, 50);

  const slAnalyticsResults = await Promise.allSettled(
    activeSl.map((c) => getSmartleadCampaignAnalytics(c.id))
  );

  let slTotalSent = 0;
  let slTotalReplied = 0;
  let slTotalBounced = 0;
  let slTotalLeads = 0;

  for (const r of slAnalyticsResults) {
    if (r.status === "fulfilled") {
      slTotalSent += Number(r.value.sent_count) || 0;
      slTotalReplied += Number(r.value.reply_count) || 0;
      slTotalBounced += Number(r.value.bounce_count) || 0;
      slTotalLeads += Number(r.value.total_count) || 0;
    }
  }

  // Use overall stats if available (more complete), otherwise use aggregated
  const slOverallData =
    slOverall.status === "fulfilled" ? slOverall.value : null;
  if (slOverall.status === "rejected") {
    console.error("[Stats] Smartlead overall stats failed:", slOverall.reason);
  }

  return {
    heyreach: {
      totalCampaigns: hrItems.length,
      activeCampaigns: hrItems.filter((c) => c.status === "IN_PROGRESS").length,
      totalLeads: hrTotalLeads,
      leadsByStatus: hrLeadsByStatus,
      ...hrAggregated,
    },
    smartlead: {
      totalCampaigns: slItems.length,
      campaignsByStatus,
      overallStats: slOverallData ?? {
        sent: slTotalSent,
        opened: 0,
        replied: slTotalReplied,
        bounced: slTotalBounced,
      },
      activeCampaignLeads: slTotalLeads,
      leadCategories: [], // Not available via REST API
    },
  };
}
