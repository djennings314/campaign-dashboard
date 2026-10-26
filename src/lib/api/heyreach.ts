import type {
  HeyReachCampaign,
  HeyReachOverallStats,
} from "@/lib/types";

const BASE_URL = process.env.HEYREACH_API_URL ?? "https://api.heyreach.io/api/public";

/**
 * HeyReach answers with an occasional 500 that a retry clears (Reply Desk sees
 * the same), and with 429 past 15 requests per 2 seconds. Four tries, backing
 * off past the rate window, before giving up.
 */
async function heyreachFetch<T>(key: string, path: string, init: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  console.log(`[HeyReach] ${init.method ?? "GET"} ${url}`);

  let res: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * attempt));
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "CampaignDashboard/1.0",
        "X-API-KEY": key,
      },
      cache: "no-store",
    });
    if (res.ok || (res.status < 500 && res.status !== 429)) break;
  }

  if (!res || !res.ok) {
    const text = await res?.text().catch(() => "");
    console.error(`[HeyReach] ${path} failed: ${res?.status} ${text}`);
    throw new Error(`HeyReach ${path}: ${res?.status}`);
  }

  return res.json();
}

function heyreachPost<T>(key: string, path: string, body: unknown): Promise<T> {
  return heyreachFetch(key, path, { method: "POST", body: JSON.stringify(body) });
}

function heyreachGet<T>(key: string, path: string): Promise<T> {
  return heyreachFetch(key, path, { method: "GET" });
}

type CampaignPage = { totalCount: number; items: HeyReachCampaign[] };

/**
 * Pages requested at once. HeyReach takes anywhere from 2 to 12 seconds per
 * page, so waiting on small rounds adds up (the Outbound workspace has 12
 * pages). Ten stays under the 15-per-2s limit; a 429 is retried.
 */
const PAGE_CONCURRENCY = 10;
/** /api/campaigns and /api/stats load together; one read serves both. */
const CAMPAIGNS_CACHE_MS = 60 * 1000;

/** Per API key: each workspace has its own rate limit and campaigns. */
const campaignsCache = new Map<string, { at: number; value: Promise<CampaignPage> }>();

export function getHeyReachCampaigns(key: string): Promise<CampaignPage> {
  const hit = campaignsCache.get(key);
  if (hit && Date.now() - hit.at < CAMPAIGNS_CACHE_MS) return hit.value;
  const value = fetchHeyReachCampaigns(key);
  campaignsCache.set(key, { at: Date.now(), value });
  value.catch(() => campaignsCache.delete(key));
  return value;
}

async function fetchHeyReachCampaigns(key: string): Promise<CampaignPage> {
  const PAGE_SIZE = 100; // API max is 100
  const page = (offset: number) =>
    heyreachPost<CampaignPage>(key, "/campaign/GetAll", {
      statuses: [],
      accountIds: [],
      offset,
      limit: PAGE_SIZE,
      keyword: "",
    });

  const firstPage = await page(0);
  const allItems = [...firstPage.items];
  const totalCount = firstPage.totalCount;

  // Remaining pages, a few at a time to stay inside the rate limit
  const offsets: number[] = [];
  for (let o = PAGE_SIZE; o < totalCount; o += PAGE_SIZE) offsets.push(o);
  for (let i = 0; i < offsets.length; i += PAGE_CONCURRENCY) {
    const results = await Promise.allSettled(
      offsets.slice(i, i + PAGE_CONCURRENCY).map(page)
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value.items);
      } else {
        console.error("[HeyReach] Pagination page failed:", result.reason);
      }
    }
  }

  if (allItems.length < totalCount) {
    console.error(`[HeyReach] Read ${allItems.length} of ${totalCount} campaigns`);
  }
  return { totalCount, items: allItems };
}

export async function getHeyReachCampaign(
  key: string,
  campaignId: number
): Promise<HeyReachCampaign> {
  return heyreachGet(key, `/campaign/GetById?campaignId=${campaignId}`);
}

export async function getHeyReachOverallStats(
  key: string,
  campaignIds: number[] = [],
  startDate?: string,
  endDate?: string
): Promise<HeyReachOverallStats> {
  return heyreachPost(key, "/stats/GetOverallStats", {
    campaignIds,
    accountIds: [],
    startDate: startDate ?? null,
    endDate: endDate ?? null,
  });
}
