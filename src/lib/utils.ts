import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
 */
export function extractClientName(name: string): string {
  // 1. "Client - Campaign Title"
  const spaceDash = name.indexOf(" - ");
  if (spaceDash > 0) return name.slice(0, spaceDash).trim();

  // 2. "Client- Title" or "Client -Title"
  const dashIdx = name.indexOf("-");
  if (dashIdx > 0) return name.slice(0, dashIdx).trim();

  // 3. "Client Campaign …" or "Client campaign …"
  const campaignMatch = name.match(/^(.+?)\s+campaign\b/i);
  if (campaignMatch && campaignMatch[1].trim()) return campaignMatch[1].trim();

  return "Uncategorized";
}
