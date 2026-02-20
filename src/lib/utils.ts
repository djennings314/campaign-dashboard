import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract the client name from a campaign name.
 * Convention: "ClientName - Campaign Title" (space-dash-space delimiter).
 * Returns "Uncategorized" for campaigns without this pattern.
 */
export function extractClientName(name: string): string {
  const idx = name.indexOf(" - ");
  if (idx === -1) return "Uncategorized";
  const client = name.slice(0, idx).trim();
  return client || "Uncategorized";
}
