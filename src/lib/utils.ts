import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { findCanonicalName, normalizeClientName } from "./active-clients"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract the client name from a campaign name.
 * Tries in order:
 *   1. Text before " - " (space-dash-space)
 *   1b. Text before " (" (parenthetical metadata), with qualifier extraction
 *   2. Text before "-" (bare dash), trying each dash to find a known CRM client
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

  // 1b. "Client Name (metadata-here)" — strip parenthetical suffix
  //     e.g. "Fastech Solutions 2 (Las Vegas-C/VP/D-Scrubbed)"
  //     Include key qualifiers from inside parens (like "Las Vegas")
  //     so the alias system can route them correctly.
  //     Only use the base as raw if it resolves to a known client;
  //     otherwise let later steps (bare-dash) handle it.
  if (!raw) {
    const parenIdx = name.indexOf(" (");
    if (parenIdx > 0) {
      const base = name.slice(0, parenIdx).trim();
      // Extract meaningful qualifiers from parenthetical content
      const parenContent = name.slice(parenIdx + 2).replace(/\).*$/, "");
      // Check if paren content starts with a geographical/qualifying term
      // before any technical suffixes (separated by - )
      const qualifier = parenContent.split("-")[0].trim();
      if (qualifier) {
        // Try base + qualifier first (e.g. "Fastech Solutions Las Vegas")
        const withQualifier = `${base} ${qualifier}`;
        if (findCanonicalName(withQualifier) !== null) {
          raw = withQualifier;
        }
      }
      // Fall back to base only if it's a known client
      if (!raw && findCanonicalName(base) !== null) raw = base;
    }
  }

  // 2. "Client- Title" or "Client -Title"
  //    Try each "-" position and pick the first one whose left side
  //    resolves to a known CRM client. This avoids splitting on hyphens
  //    that are part of the client name (e.g. "C-Cured Consulting").
  //    Falls back to the last dash if no known client is found.
  if (!raw) {
    let searchFrom = 0;
    while (searchFrom < name.length) {
      const dashIdx = name.indexOf("-", searchFrom);
      if (dashIdx <= 0) break;
      const candidate = name.slice(0, dashIdx).trim();
      if (findCanonicalName(candidate) !== null || dashIdx === name.lastIndexOf("-")) {
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
