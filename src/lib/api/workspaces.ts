/**
 * Abstrakt runs outreach from two workspaces on each platform, Sapper and
 * Outbound, each with its own API keys (Reply Desk polls both). A workspace
 * without a key is skipped, so a deploy with only the Sapper keys behaves as
 * the dashboard always did.
 *
 *   Sapper:   HEYREACH_API_KEY,          SMARTLEAD_API_KEY
 *   Outbound: HEYREACH_API_KEY_OUTBOUND, SMARTLEAD_API_KEY_OUTBOUND
 */

export interface Workspace {
  /** Short id used in URLs and requests. */
  id: string;
  name: string;
  key: string;
}

const DEFS = [
  { id: "sapper", name: "Sapper", heyreach: "HEYREACH_API_KEY", smartlead: "SMARTLEAD_API_KEY" },
  { id: "outbound", name: "Outbound", heyreach: "HEYREACH_API_KEY_OUTBOUND", smartlead: "SMARTLEAD_API_KEY_OUTBOUND" },
] as const;

function configured(platform: "heyreach" | "smartlead"): Workspace[] {
  const seen = new Set<string>();
  const out: Workspace[] = [];
  for (const d of DEFS) {
    const key = process.env[d[platform]]?.trim();
    // The same key set twice would count every campaign twice.
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ id: d.id, name: d.name, key });
  }
  return out;
}

export const heyreachWorkspaces = () => configured("heyreach");
export const smartleadWorkspaces = () => configured("smartlead");

export function findWorkspace(
  platform: "heyreach" | "smartlead",
  id: string | null | undefined
): Workspace | undefined {
  return configured(platform).find((w) => w.id === id);
}
