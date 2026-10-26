/**
 * Campaign → client attribution from Reply Desk (Ignite's Supabase).
 *
 * Reply Desk keeps an id-based map of which Salesforce account each Smartlead
 * campaign and each HeyReach sending account belongs to, filled from the
 * warehouse export and from Abstrakt Intelligence. That is the real answer to
 * "whose campaign is this?" — parsing the campaign name is a guess, and a
 * wrong one often enough that the alias list kept growing.
 *
 * Read-only. Needs REPLYDESK_SUPABASE_URL and REPLYDESK_SUPABASE_SERVICE_ROLE_KEY;
 * without them (or if the read fails) every campaign falls back to name
 * parsing exactly as before.
 *
 * Mirrors Ignite's lib/reply-desk-account-map.ts. Keep ACCOUNT_ALIASES and the
 * internal-account rules below in step with it.
 */

const SB_URL = () => process.env.REPLYDESK_SUPABASE_URL ?? "";
const SB_KEY = () => process.env.REPLYDESK_SUPABASE_SERVICE_ROLE_KEY ?? "";

/** How long one read of the map is reused. It changes a few times a day. */
const CACHE_MS = 10 * 60 * 1000;

/**
 * Salesforce ids compared in their 15-character form. Reply Desk stores 15;
 * warehouse exports carry 18 (the last three are a checksum).
 */
export function sf15(value: unknown): string {
  return String(value ?? "").trim().slice(0, 15);
}

/**
 * Salesforce accounts that stand in for another (old id → current id).
 * Copied from Ignite's ACCOUNT_ALIASES.
 */
const ACCOUNT_ALIASES: Record<string, string> = {
  "0014w00003SiSQI": "0014w00003i1dp7", // Treasures Rediscovered
  "0014w00003sNDG1": "001Rj00000mnabO", // WA Campion
  "001Ro00000dTiCC": "001Rj00000koZBQ", // APQ Engineering
  "0014A00002iPPH9": "001Rj00000k2yvK", // Tech Turnaround
};

/**
 * HeyReach sending accounts that prospect for Abstrakt itself. Copied from
 * Ignite's INTERNAL_ACCOUNTS (141148 is James Leisinger).
 */
const INTERNAL_SENDERS = new Set(["141148"]);

/** Abstrakt's own Smartlead campaigns, by name. Copied from Ignite's INTERNAL_CAMPAIGN. */
const INTERNAL_CAMPAIGN = /^\s*sapper\s+(august|outbound\s+sdr)\b/i;

export interface Attribution {
  /** Smartlead campaign id → Salesforce account (15). */
  byCampaign: Map<string, string>;
  /** HeyReach sender account id → Salesforce account (15). */
  bySender: Map<string, string>;
  /** Salesforce account (15) → client name as Reply Desk records it. */
  clientNames: Map<string, string>;
  /** Salesforce accounts that are Abstrakt's own. */
  internal: Set<string>;
  /** Salesforce accounts Reply Desk has stopped handling (offboarded clients). */
  offboarded: Set<string>;
  /** Lowercased client name → client name; built on first use. */
  namesLower?: Map<string, string>;
}

export interface CampaignAccount {
  salesforceAccountId: string | null;
  /** Client name from Reply Desk; null when the account has no client row. */
  clientName: string | null;
  internal: boolean;
  offboarded: boolean;
}

const NONE: CampaignAccount = {
  salesforceAccountId: null,
  clientName: null,
  internal: false,
  offboarded: false,
};

async function sbGetAll<T>(table: string, query: string): Promise<T[]> {
  const out: T[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${SB_URL()}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: SB_KEY(),
        Authorization: `Bearer ${SB_KEY()}`,
        Range: `${from}-${from + PAGE - 1}`,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Reply Desk ${table}: ${res.status} ${text}`);
    }
    const rows: T[] = await res.json();
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

let cached: { at: number; value: Promise<Attribution | null> } | null = null;

/**
 * The whole map, or null when Reply Desk is not configured or cannot be read.
 * A few thousand rows; read once and reused for CACHE_MS.
 */
export function loadAttribution(): Promise<Attribution | null> {
  if (!SB_URL() || !SB_KEY()) return Promise.resolve(null);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const value = (async () => {
    const [map, clients, internal] = await Promise.all([
      sbGetAll<{ kind: string; external_id: string; salesforce_account_id: string }>(
        "ignite_replydesk_account_map",
        "select=kind,external_id,salesforce_account_id&order=id.asc"
      ),
      sbGetAll<{ name: string; salesforce_account_id: string | null }>(
        "ignite_replydesk_clients",
        "select=name,salesforce_account_id&salesforce_account_id=not.is.null&order=id.asc"
      ),
      sbGetAll<{ salesforce_account_id: string; note: string | null }>(
        "ignite_replydesk_internal_accounts",
        "select=salesforce_account_id,note&order=salesforce_account_id.asc"
      ),
    ]);

    const a: Attribution = {
      byCampaign: new Map(),
      bySender: new Map(),
      clientNames: new Map(),
      internal: new Set(),
      offboarded: new Set(),
    };
    for (const r of map) {
      const target = r.kind === "smartlead_campaign" ? a.byCampaign : a.bySender;
      target.set(String(r.external_id).trim(), sf15(r.salesforce_account_id));
    }
    for (const c of clients) a.clientNames.set(sf15(c.salesforce_account_id), c.name);
    // Reply Desk's "internal" list holds two kinds of account: Abstrakt's own,
    // and clients it has stopped handling replies for, whose notes say
    // "offboarded client" / "cancelled client" (and whose made-up ids start
    // OFFBOARD_). Only the first are internal here; the second are real client
    // campaigns and stay in the numbers.
    for (const r of internal) {
      const id = sf15(r.salesforce_account_id);
      const offboarded = id.startsWith("OFFBOARD_") || /\bclient\b/i.test(r.note ?? "");
      (offboarded ? a.offboarded : a.internal).add(id);
    }
    // Clients Reply Desk made up for Abstrakt work ("Abstrakt Operations - SDR
    // Email Audit" is INTERNAL_SDRAUD).
    for (const id of a.clientNames.keys()) {
      if (id.startsWith("INTERNAL_")) a.internal.add(id);
    }
    return a;
  })().catch((err) => {
    console.error("[ReplyDesk] attribution read failed:", err);
    cached = null;
    return null;
  });

  cached = { at: Date.now(), value };
  return value;
}

function describe(sf: string, a: Attribution): CampaignAccount {
  const id = ACCOUNT_ALIASES[sf] ?? sf;
  return {
    salesforceAccountId: id,
    clientName: a.clientNames.get(id) ?? null,
    internal: a.internal.has(id),
    offboarded: a.offboarded.has(id),
  };
}

export function smartleadAccount(
  campaign: { id: number; name: string },
  a: Attribution | null
): CampaignAccount {
  if (INTERNAL_CAMPAIGN.test(campaign.name)) return { ...NONE, internal: true };
  const sf = a?.byCampaign.get(String(campaign.id));
  return sf && a ? describe(sf, a) : NONE;
}

/**
 * A HeyReach campaign has no account of its own in the map; its sending
 * accounts do. Resolved when every mapped sender agrees on one account.
 *
 * Senders mapped to an internal account are Abstrakt's own LinkedIn profiles,
 * and those run client campaigns too (Shapiro Metals, Priority Power), so they
 * say nothing about whose campaign it is and are skipped rather than marking
 * the campaign internal.
 */
export function heyreachAccount(
  campaign: { name: string; campaignAccountIds?: number[] },
  a: Attribution | null
): CampaignAccount {
  const senders = (campaign.campaignAccountIds ?? []).map(String);
  if (
    INTERNAL_CAMPAIGN.test(campaign.name) ||
    (senders.length && senders.every((s) => INTERNAL_SENDERS.has(s)))
  ) {
    return { ...NONE, internal: true };
  }
  if (!a) return NONE;
  const accounts = new Set(
    senders
      .map((s) => a.bySender.get(s))
      .filter((sf): sf is string => !!sf)
      .map((sf) => ACCOUNT_ALIASES[sf] ?? sf)
      .filter((sf) => !a.internal.has(sf))
  );
  return accounts.size === 1 ? describe([...accounts][0], a) : NONE;
}

/**
 * Reply Desk's spelling of a client name that was parsed from a campaign name,
 * for campaigns the map does not cover. Exact, case-insensitive; null if none.
 */
export function knownClientName(parsed: string, a: Attribution | null): string | null {
  if (!a) return null;
  if (!a.namesLower) {
    a.namesLower = new Map();
    for (const n of a.clientNames.values()) a.namesLower.set(n.toLowerCase().trim(), n);
  }
  return a.namesLower.get(parsed.toLowerCase().trim()) ?? null;
}
