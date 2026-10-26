import { getHeyReachCampaigns, getHeyReachOverallStats } from "./heyreach";
import {
  getSmartleadCampaigns,
  getSmartleadOverallStats,
  getSmartleadCampaignAnalytics,
} from "./smartlead";
import {
  loadAttribution,
  smartleadAccount,
  heyreachAccount,
  knownClientName,
  type Attribution,
  type CampaignAccount,
} from "./replydesk";
import {
  heyreachWorkspaces,
  smartleadWorkspaces,
  type Workspace,
} from "./workspaces";
import type {
  UnifiedCampaign,
  CampaignCategory,
  DashboardStats,
  HeyReachCampaign,
  HeyReachDayStats,
  SmartleadCampaign,
  SmartleadOverallStats,
} from "@/lib/types";
import { extractClientName } from "@/lib/utils";
import { findCanonicalName } from "@/lib/active-clients";

const DIRECT_MAIL_RE = /direct\s*mail/i;

function categorize(name: string): CampaignCategory {
  return DIRECT_MAIL_RE.test(name) ? "direct-mail" : "email";
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

/**
 * Whose campaign this is: Reply Desk's Salesforce account when it knows,
 * otherwise the name parsed from the campaign, spelled as the CRM list or
 * Reply Desk spells it where one of them knows that name.
 */
function clientFields(
  name: string,
  account: CampaignAccount,
  a: Attribution | null
): Pick<UnifiedCampaign, "client" | "clientSource" | "salesforceAccountId" | "offboarded"> {
  if (account.clientName) {
    return {
      client: account.clientName,
      clientSource: "salesforce",
      salesforceAccountId: account.salesforceAccountId ?? undefined,
      offboarded: account.offboarded || undefined,
    };
  }
  const parsed = extractClientName(name);
  return {
    client: findCanonicalName(parsed) ?? knownClientName(parsed, a) ?? parsed,
    clientSource: "name",
    offboarded: account.offboarded || undefined,
  };
}

function normalizeHeyReachCampaign(
  c: HeyReachCampaign,
  w: Workspace,
  a: Attribution | null
): UnifiedCampaign {
  return {
    id: `hr_${c.id}`,
    platformId: c.id,
    platform: "heyreach",
    workspace: w.id,
    workspaceName: w.name,
    name: c.name,
    ...clientFields(c.name, heyreachAccount(c, a), a),
    status: c.status,
    createdAt: c.creationTime,
    leadStats: c.progressStats ?? undefined,
  };
}

function normalizeSmartleadCampaign(
  c: SmartleadCampaign,
  w: Workspace,
  a: Attribution | null
): UnifiedCampaign {
  return {
    id: `sl_${c.id}`,
    platformId: c.id,
    platform: "smartlead",
    workspace: w.id,
    workspaceName: w.name,
    name: c.name,
    ...clientFields(c.name, smartleadAccount(c, a), a),
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

/**
 * Every workspace's campaigns. Abstrakt's own campaigns are dropped here, so
 * nothing downstream counts them.
 */
export async function getAllCampaigns(): Promise<CampaignsResult> {
  const hrWs = heyreachWorkspaces();
  const slWs = smartleadWorkspaces();
  const [hrResults, slResults, a] = await Promise.all([
    Promise.allSettled(hrWs.map((w) => getHeyReachCampaigns(w.key))),
    Promise.allSettled(slWs.map((w) => getSmartleadCampaigns(w.key))),
    loadAttribution(),
  ]);

  const campaigns: UnifiedCampaign[] = [];
  const errors: string[] = [];

  hrResults.forEach((r, i) => {
    const w = hrWs[i];
    if (r.status === "fulfilled") {
      for (const c of r.value.items) {
        if (!heyreachAccount(c, a).internal) campaigns.push(normalizeHeyReachCampaign(c, w, a));
      }
    } else {
      const msg = `HeyReach (${w.name}): ${r.reason}`;
      console.error("[Unified]", msg);
      errors.push(msg);
    }
  });
  slResults.forEach((r, i) => {
    const w = slWs[i];
    if (r.status === "fulfilled") {
      for (const c of r.value) {
        if (!smartleadAccount(c, a).internal) campaigns.push(normalizeSmartleadCampaign(c, w, a));
      }
    } else {
      const msg = `Smartlead (${w.name}): ${r.reason}`;
      console.error("[Unified]", msg);
      errors.push(msg);
    }
  });

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

type DayTotals = ReturnType<typeof aggregateDayStats>;

const NO_DAYS: DayTotals = { connectionsSent: 0, connectionsAccepted: 0, messagesSent: 0, messageReplies: 0 };

function addDays(x: DayTotals, y: DayTotals, sign = 1): DayTotals {
  return {
    connectionsSent: x.connectionsSent + sign * y.connectionsSent,
    connectionsAccepted: x.connectionsAccepted + sign * y.connectionsAccepted,
    messagesSent: x.messagesSent + sign * y.messagesSent,
    messageReplies: x.messageReplies + sign * y.messageReplies,
  };
}

/** One HeyReach workspace: its campaigns (internal ones dropped) and activity. */
async function heyreachWorkspaceStats(
  w: Workspace,
  a: Attribution | null,
  startDate: string,
  endDate: string,
  warnings: string[]
): Promise<{ items: HeyReachCampaign[]; internal: number; days: DayTotals }> {
  const [campaigns, stats] = await Promise.allSettled([
    getHeyReachCampaigns(w.key),
    getHeyReachOverallStats(w.key, [], startDate, endDate),
  ]);

  const all = campaigns.status === "fulfilled" ? campaigns.value.items : [];
  if (campaigns.status === "rejected") {
    console.error(`[Stats] HeyReach (${w.name}) campaigns failed:`, campaigns.reason);
    warnings.push(`HeyReach ${w.name}: campaigns could not be read`);
  }
  const internal = all.filter((c) => heyreachAccount(c, a).internal);
  const items = all.filter((c) => !heyreachAccount(c, a).internal);

  if (stats.status === "rejected") {
    console.error(`[Stats] HeyReach (${w.name}) stats failed:`, stats.reason);
    warnings.push(`HeyReach ${w.name}: activity stats could not be read`);
    return { items, internal: internal.length, days: NO_DAYS };
  }

  // The overall stats cover the whole workspace. Take the internal campaigns'
  // share back out rather than listing every other campaign id in the request.
  let days = aggregateDayStats(stats.value.byDayStats);
  if (internal.length > 0) {
    try {
      const own = await getHeyReachOverallStats(w.key, internal.map((c) => c.id), startDate, endDate);
      days = addDays(days, aggregateDayStats(own.byDayStats), -1);
    } catch (err) {
      console.error(`[Stats] HeyReach (${w.name}) internal stats failed:`, err);
    }
  }
  return { items, internal: internal.length, days };
}

/** One Smartlead workspace: its campaigns (internal ones dropped) and email totals. */
async function smartleadWorkspaceStats(
  w: Workspace,
  a: Attribution | null,
  startDate: string,
  endDate: string,
  warnings: string[]
): Promise<{ items: SmartleadCampaign[]; internal: number; overall: SmartleadOverallStats }> {
  const [campaigns, overall] = await Promise.allSettled([
    getSmartleadCampaigns(w.key),
    getSmartleadOverallStats(w.key, startDate, endDate),
  ]);

  const all = campaigns.status === "fulfilled" ? campaigns.value : [];
  if (campaigns.status === "rejected") {
    console.error(`[Stats] Smartlead (${w.name}) campaigns failed:`, campaigns.reason);
    warnings.push(`Smartlead ${w.name}: campaigns could not be read`);
  }
  const internal = all.filter((c) => smartleadAccount(c, a).internal);
  const items = all.filter((c) => !smartleadAccount(c, a).internal);

  if (overall.status === "rejected") {
    console.error(`[Stats] Smartlead (${w.name}) overall stats failed:`, overall.reason);
    warnings.push(`Smartlead ${w.name}: email totals could not be read`);
    return { items, internal: internal.length, overall: { sent: 0, opened: 0, replied: 0, bounced: 0 } };
  }

  // Overall stats are account-wide: subtract the internal campaigns' lifetime
  // numbers (the range starts 2024-01-01, so lifetime is the same window).
  const totals = { ...overall.value };
  const own = await Promise.allSettled(
    internal.map((c) => getSmartleadCampaignAnalytics(w.key, c.id))
  );
  for (const r of own) {
    if (r.status !== "fulfilled") continue;
    totals.sent -= Number(r.value.sent_count) || 0;
    totals.opened -= Number(r.value.open_count) || 0;
    totals.replied -= Number(r.value.reply_count) || 0;
    totals.bounced -= Number(r.value.bounce_count) || 0;
  }
  return { items, internal: internal.length, overall: totals };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const startDate = "2024-01-01";
  const endDate = new Date().toISOString().split("T")[0];
  const warnings: string[] = [];

  const hrWs = heyreachWorkspaces();
  const slWs = smartleadWorkspaces();
  const a = await loadAttribution();
  const [hr, sl] = await Promise.all([
    Promise.all(hrWs.map((w) => heyreachWorkspaceStats(w, a, startDate, endDate, warnings))),
    Promise.all(slWs.map((w) => smartleadWorkspaceStats(w, a, startDate, endDate, warnings))),
  ]);

  // ── HeyReach: aggregate lead stats from progressStats ──
  const hrItems = hr.flatMap((r) => r.items);
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

  // ── Smartlead: campaign status counts from campaign list ──
  const slItems = sl.flatMap((r) => r.items);
  const campaignsByStatus: Record<string, number> = {};
  for (const c of slItems) {
    const s = c.status?.toUpperCase() ?? "UNKNOWN";
    campaignsByStatus[s] = (campaignsByStatus[s] ?? 0) + 1;
  }
  const overallStats = sl.reduce(
    (t, r) => ({
      sent: t.sent + r.overall.sent,
      opened: t.opened + r.overall.opened,
      replied: t.replied + r.overall.replied,
      bounced: t.bounced + r.overall.bounced,
    }),
    { sent: 0, opened: 0, replied: 0, bounced: 0 }
  );

  return {
    workspaces: {
      heyreach: hrWs.map((w) => w.name),
      smartlead: slWs.map((w) => w.name),
    },
    warnings,
    internalExcluded: {
      heyreach: hr.reduce((n, r) => n + r.internal, 0),
      smartlead: sl.reduce((n, r) => n + r.internal, 0),
    },
    attribution: a !== null,
    heyreach: {
      totalCampaigns: hrItems.length,
      activeCampaigns: hrItems.filter((c) => c.status === "IN_PROGRESS").length,
      totalLeads: hrTotalLeads,
      leadsByStatus: hrLeadsByStatus,
      ...hr.reduce((t, r) => addDays(t, r.days), NO_DAYS),
    },
    smartlead: {
      totalCampaigns: slItems.length,
      campaignsByStatus,
      overallStats,
      leadCategories: [], // Not available via REST API
    },
  };
}
