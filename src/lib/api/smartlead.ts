import type { SmartleadCampaign, SmartleadOverallStats } from "@/lib/types";

const BASE_URL =
  process.env.SMARTLEAD_API_URL ?? "https://server.smartlead.ai/api/v1";
const API_KEY = () => process.env.SMARTLEAD_API_KEY ?? "";

function buildUrl(path: string, params: Record<string, string> = {}): string {
  const u = new URL(`${BASE_URL}${path}`);
  u.searchParams.set("api_key", API_KEY());
  for (const [k, v] of Object.entries(params)) {
    if (v) u.searchParams.set(k, v);
  }
  return u.toString();
}

async function smartleadFetch<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = buildUrl(path, params);
  console.log(`[Smartlead] GET ${path}`);

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "CampaignDashboard/1.0",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[Smartlead] ${path} failed: ${res.status} ${text}`);
    throw new Error(`Smartlead ${path}: ${res.status}`);
  }

  return res.json();
}

export async function getSmartleadCampaigns(): Promise<SmartleadCampaign[]> {
  return smartleadFetch("/campaigns");
}

export async function getSmartleadCampaign(
  id: number
): Promise<SmartleadCampaign> {
  return smartleadFetch(`/campaigns/${id}`);
}

export interface SmartleadCampaignLeadStats {
  total: number;
  notStarted: number;
  inprogress: number;
  completed: number;
  paused: number;
  blocked: number;
  stopped: number;
  interested: number;
  revenue: number;
}

export interface SmartleadCampaignAnalytics {
  id: number;
  name: string;
  status: string;
  sent_count: string;
  open_count: string;
  click_count: string;
  reply_count: string;
  bounce_count: string;
  block_count: string;
  total_count: string;
  drafted_count: string;
  unique_sent_count: string;
  unique_open_count: string;
  unique_click_count: string;
  campaign_lead_stats?: SmartleadCampaignLeadStats;
  [key: string]: unknown;
}

export async function getSmartleadCampaignAnalytics(
  campaignId: number
): Promise<SmartleadCampaignAnalytics> {
  return smartleadFetch(`/campaigns/${campaignId}/analytics`);
}

/**
 * Fetch campaigns with their analytics data merged in.
 * Analytics are fetched in parallel batches to stay within rate limits.
 */
export async function getSmartleadCampaignsWithAnalytics(): Promise<
  (SmartleadCampaign & { analytics?: SmartleadCampaignAnalytics })[]
> {
  const campaigns = await getSmartleadCampaigns();

  // Fetch analytics in batches of 50
  const BATCH_SIZE = 50;
  const analyticsMap = new Map<number, SmartleadCampaignAnalytics>();

  for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
    const batch = campaigns.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((c) => getSmartleadCampaignAnalytics(c.id))
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        analyticsMap.set(result.value.id, result.value);
      }
    }
  }

  return campaigns.map((c) => ({
    ...c,
    analytics: analyticsMap.get(c.id),
  }));
}

export async function getSmartleadOverallStats(
  startDate: string,
  endDate: string
): Promise<SmartleadOverallStats> {
  const data = await smartleadFetch<{
    success: boolean;
    data: { overall_stats: SmartleadOverallStats };
  }>("/analytics/overall-stats-v2", {
    start_date: startDate,
    end_date: endDate,
  });
  return data.data.overall_stats;
}
