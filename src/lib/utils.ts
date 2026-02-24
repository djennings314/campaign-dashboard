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
  if (!raw) {
    const dashIdx = name.indexOf("-");
    if (dashIdx > 0) raw = name.slice(0, dashIdx).trim();
  }

  // 3. "Client Campaign …" or "Client campaign …"
  if (!raw) {
    const campaignMatch = name.match(/^(.+?)\s+campaign\b/i);
    if (campaignMatch && campaignMatch[1].trim()) raw = campaignMatch[1].trim();
  }

  if (!raw) return "Uncategorized";

  return normalizeClientName(raw);
}
