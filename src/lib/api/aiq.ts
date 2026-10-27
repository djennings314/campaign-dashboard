/**
 * Salesforce accounts and their status (Active, Canceled, On Hold…) from
 * Abstrakt Intelligence, the same endpoint Reply Desk uses to map campaigns:
 * GET /api/replydesk/?sfAccountId= | ?smartleadCampaignId= | ?heyreachCampaignId=
 * (header X-AIQ-API-KEY).
 *
 * Reply Desk's own tables carry no status, and the hardcoded CRM list in
 * active-clients.ts goes stale (it still named clients cancelled since), so
 * this is what decides who counts as an active client.
 *
 * One request per id, about 0.2s each, with no bulk form. Answers are kept
 * for TTL_S both in memory and in Next's data cache, so only a cold start
 * pays for the full set. Any failure is "unknown", never an error.
 * Needs AIQ_API_KEY; without it every status is unknown.
 */

const BASE_URL = () =>
  process.env.AIQ_REPLYDESK_API_URL || "https://api.abstraktintelligence.com";
const API_KEY = () => process.env.AIQ_API_KEY ?? "";

/** Statuses change rarely; six hours is fresh enough for a dashboard. */
const TTL_S = 6 * 60 * 60;
const CONCURRENCY = 20;

/**
 * A few AIQ sequences list dozens of unrelated HeyReach campaigns (Bison
 * Biocomposites' two list 88), so asking for any of those campaigns answers
 * "Bison". A real client's sequence lists fewer than ten.
 */
const MAX_HEYREACH_PER_SEQUENCE = 25;

interface Row {
  sfAccountId?: string;
  accountName?: string;
  sfAccountStatus?: string;
  smartleadCampaignId?: number | null;
  heyreachCampaigns?: unknown[];
}

const memo = new Map<string, { at: number; rows: Row[] | null }>();

/** Rows for one query, or null when AIQ could not be asked. */
async function aiqGet(query: string): Promise<Row[] | null> {
  const hit = memo.get(query);
  if (hit && Date.now() - hit.at < TTL_S * 1000) return hit.rows;

  let rows: Row[];
  try {
    const res = await fetch(`${BASE_URL()}/api/replydesk/?${query}`, {
      headers: { "X-AIQ-API-KEY": API_KEY() },
      cache: "force-cache",
      next: { revalidate: TTL_S },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    rows = ((await res.json()) as { data?: Row[] }).data ?? [];
  } catch {
    return null;
  }
  memo.set(query, { at: Date.now(), rows });
  return rows;
}

/** Run `work` over `items`, CONCURRENCY at a time. */
async function each<T>(items: T[], work: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
        await work(item);
      }
    })
  );
}

/** Salesforce account id (15) → status; ids AIQ cannot answer are left out. */
export async function getAccountStatuses(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!API_KEY()) return out;

  // Made-up ids (OFFBOARD_…, INTERNAL_…) are not Salesforce accounts.
  const valid = [...new Set(ids)].filter((id) => /^[a-zA-Z0-9]{15}$/.test(id));
  const started = Date.now();
  await each(valid, async (id) => {
    const rows = await aiqGet(`sfAccountId=${encodeURIComponent(id)}`);
    const status = rows?.find((r) => r.sfAccountStatus)?.sfAccountStatus;
    if (status) out.set(id, status);
  });
  console.log(`[AIQ] ${out.size} account statuses in ${Date.now() - started}ms`);
  return out;
}

export interface CampaignAccount {
  /** 15-character form. */
  salesforceAccountId: string;
  accountName: string | null;
  status: string | null;
}

export const campaignKey = (platform: string, platformId: number) => `${platform}:${platformId}`;

/**
 * The Salesforce account behind each campaign, asked by campaign id, keyed by
 * campaignKey. For campaigns Reply Desk's map has never seen. Left out when
 * AIQ has no answer, or names more than one account.
 */
export async function getCampaignAccounts(
  campaigns: { platform: "heyreach" | "smartlead"; platformId: number }[]
): Promise<Map<string, CampaignAccount>> {
  const out = new Map<string, CampaignAccount>();
  if (!API_KEY()) return out;

  const started = Date.now();
  await each(campaigns, async ({ platform, platformId }) => {
    const param = platform === "smartlead" ? "smartleadCampaignId" : "heyreachCampaignId";
    let rows = (await aiqGet(`${param}=${platformId}`))?.filter((r) => r.sfAccountId) ?? [];
    if (platform === "smartlead") {
      const own = rows.filter((r) => r.smartleadCampaignId === platformId);
      if (own.length) rows = own;
    } else {
      rows = rows.filter((r) => (r.heyreachCampaigns?.length ?? 0) <= MAX_HEYREACH_PER_SEQUENCE);
    }
    const accounts = new Set(rows.map((r) => String(r.sfAccountId).slice(0, 15)));
    if (accounts.size !== 1) return;
    const row = rows[0];
    out.set(campaignKey(platform, platformId), {
      salesforceAccountId: [...accounts][0],
      accountName: row.accountName ?? null,
      status: row.sfAccountStatus ?? null,
    });
  });
  console.log(`[AIQ] ${out.size} of ${campaigns.length} campaigns by id in ${Date.now() - started}ms`);
  return out;
}
