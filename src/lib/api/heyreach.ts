import type {
  HeyReachCampaign,
  HeyReachOverallStats,
} from "@/lib/types";

const BASE_URL = process.env.HEYREACH_API_URL ?? "https://api.heyreach.io/api/public";
const API_KEY = () => process.env.HEYREACH_API_KEY ?? "";

async function heyreachPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`;
  console.log(`[HeyReach] POST ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "CampaignDashboard/1.0",
      "X-API-KEY": API_KEY(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[HeyReach] ${path} failed: ${res.status} ${text}`);
    throw new Error(`HeyReach ${path}: ${res.status}`);
  }

  return res.json();
}

async function heyreachGet<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  console.log(`[HeyReach] GET ${url}`);

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "CampaignDashboard/1.0",
      "X-API-KEY": API_KEY(),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[HeyReach] ${path} failed: ${res.status} ${text}`);
    throw new Error(`HeyReach ${path}: ${res.status}`);
  }

  return res.json();
}

export async function getHeyReachCampaigns(): Promise<{
  totalCount: number;
  items: HeyReachCampaign[];
}> {
  const PAGE_SIZE = 100; // API max is 100
  const firstPage = await heyreachPost<{
    totalCount: number;
    items: HeyReachCampaign[];
  }>("/campaign/GetAll", {
    statuses: [],
    accountIds: [],
    offset: 0,
    limit: PAGE_SIZE,
    keyword: "",
  });

  const allItems = [...firstPage.items];
  const totalCount = firstPage.totalCount;

  // Fetch remaining pages in parallel
  if (totalCount > PAGE_SIZE) {
    const remainingPages = Math.ceil((totalCount - PAGE_SIZE) / PAGE_SIZE);
    const pagePromises = Array.from({ length: remainingPages }, (_, i) =>
      heyreachPost<{ totalCount: number; items: HeyReachCampaign[] }>(
        "/campaign/GetAll",
        {
          statuses: [],
          accountIds: [],
          offset: (i + 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
          keyword: "",
        }
      )
    );

    const results = await Promise.allSettled(pagePromises);
    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value.items);
      } else {
        console.error("[HeyReach] Pagination page failed:", result.reason);
      }
    }
  }

  return { totalCount, items: allItems };
}

export async function getHeyReachCampaign(
  campaignId: number
): Promise<HeyReachCampaign> {
  return heyreachGet(`/campaign/GetById?campaignId=${campaignId}`);
}

export async function getHeyReachOverallStats(
  campaignIds: number[] = [],
  startDate?: string,
  endDate?: string
): Promise<HeyReachOverallStats> {
  return heyreachPost("/analytics/GetOverallStats", {
    campaignIds,
    accountIds: [],
    startDate: startDate ?? null,
    endDate: endDate ?? null,
  });
}
