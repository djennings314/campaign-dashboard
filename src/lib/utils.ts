import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { normalizeClientName } from "./active-clients"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract the client name from a campaign name.
 * Tries in order:
 *   1. Text before " - " (space-dash-space)
 *   2. Text before "-" (dash with optional spaces)
 *   3. Text before the word "campaign" (case-insensitive)
 * Returns "Uncategorized" if none of those match.
 *
 * The result is normalized via the active clients CRM list so that
 * variations like "Exevision" / "ExeVision" or "Pierce Communication" /
 * "Pierce Communications" resolve to the same canonical name.
 */
export function extractClientName(name: string): string {
  let raw: string | null = null;

  // 1. "Client - Campaign Title"
  const spaceDash = name.indexOf(" - ");
  if (spaceDash > 0) raw = name.slice(0, spaceDash).trim();

  // 2. "Client- Title" or "Client -Title"
  //    Try each "-" position and pick the first one whose left side
  //    resolves to a known CRM client. This avoids splitting on hyphens
  //    that are part of the client name (e.g. "C-Cured Consulting").
  if (!raw) {
    let searchFrom = 0;
    while (searchFrom < name.length) {
      const dashIdx = name.indexOf("-", searchFrom);
      if (dashIdx <= 0) break;
      const candidate = name.slice(0, dashIdx).trim();
      const canonical = normalizeClientName(candidate);
      if (canonical !== candidate || dashIdx === name.lastIndexOf("-")) {
        // Either it matched a known client, or this is the last dash
        raw = candidate;
        break;
      }
      searchFrom = dashIdx + 1;
    }
  }

  // 3. "Client Campaign …" or "Client campaign …"
  if (!raw) {
    const campaignMatch = name.match(/^(.+?)\s+campaign\b/i);
    if (campaignMatch && campaignMatch[1].trim()) raw = campaignMatch[1].trim();
  }

  if (!raw) return "Uncategorized";

  return normalizeClientName(raw);
}
