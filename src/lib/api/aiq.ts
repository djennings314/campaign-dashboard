/**
 * Salesforce account status (Active, Canceled, On Hold…) from Abstrakt
 * Intelligence, the same endpoint Reply Desk uses to map campaigns:
 * GET /api/replydesk/?sfAccountId=  (header X-AIQ-API-KEY).
 *
 * Reply Desk's own tables carry no status, and the hardcoded CRM list in
 * active-clients.ts goes stale (it still named clients cancelled since), so
 * this is what decides who counts as an active client.
 *
 * One request per account, about 0.2s each, with no bulk form. Answers are
 * kept for STATUS_TTL_S both in memory and in Next's data cache, so only a
 * cold start pays for the full set. Any failure is "unknown", never an error.
 * Needs AIQ_API_KEY; without it every status is unknown.
 */

const BASE_URL = () =>
  process.env.AIQ_REPLYDESK_API_URL || "https://api.abstraktintelligence.com";
const API_KEY = () => process.env.AIQ_API_KEY ?? "";

/** Statuses change rarely; six hours is fresh enough for a dashboard. */
const STATUS_TTL_S = 6 * 60 * 60;
const CONCURRENCY = 20;

const memo = new Map<string, { at: number; status: string | null }>();

async function fetchStatus(sfAccountId: string): Promise<string | null> {
  const hit = memo.get(sfAccountId);
  if (hit && Date.now() - hit.at < STATUS_TTL_S * 1000) return hit.status;

  let status: string | null = null;
  try {
    const res = await fetch(
      `${BASE_URL()}/api/replydesk/?sfAccountId=${encodeURIComponent(sfAccountId)}`,
      {
        headers: { "X-AIQ-API-KEY": API_KEY() },
        cache: "force-cache",
        next: { revalidate: STATUS_TTL_S },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { sfAccountStatus?: string }[] };
    status = body.data?.find((r) => r.sfAccountStatus)?.sfAccountStatus ?? null;
  } catch {
    return null;
  }
  memo.set(sfAccountId, { at: Date.now(), status });
  return status;
}

/** Salesforce account id (15) → status; ids AIQ cannot answer are left out. */
export async function getAccountStatuses(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!API_KEY()) return out;

  // Made-up ids (OFFBOARD_…, INTERNAL_…) are not Salesforce accounts.
  const queue = [...new Set(ids)].filter((id) => /^[a-zA-Z0-9]{15}$/.test(id));
  const started = Date.now();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let id = queue.shift(); id; id = queue.shift()) {
        const status = await fetchStatus(id);
        if (status) out.set(id, status);
      }
    })
  );
  console.log(`[AIQ] ${out.size} account statuses in ${Date.now() - started}ms`);
  return out;
}
