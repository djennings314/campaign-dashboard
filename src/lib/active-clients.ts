/**
 * Active client names from CRM export (Status = "Active" only).
 * Used to filter the Clients page — showing all campaigns (including finished)
 * for active clients while hiding inactive/cancelled client noise.
 *
 * Last updated: 2026-02-23
 */

const ACTIVE_CLIENT_NAMES: string[] = [
  "Allegiance Search",
  "Payroll Vault",
  "FocusCFO - Greater Philadelphia",
  "FocusCFO - Charlotte, NC",
  "Focus CFO - Greater Hartford",
  "APEX Human Performance",
  "APQ Engineering",
  "Fox Pest Control",
  "FocusCFO - Northeast Ohio",
  "Mercury Promotions",
  "HH Agency",
  "Fastech Solutions",
  "Fastech Solutions Las Vegas",
  "Robindale Energy & Associated Companies",
  "Transmission & Distribution Services",
  "Computing Edge Solutions",
  "Pierce Communications",
  "EBS Services, Inc.",
  "Enlightened Power LLC/Satori Energy/ Blake Willis Priority Power",
  "Cobalt Software",
  "Reed City Group",
  "C-Cured Consulting",
  "Brophy Air Specialty Group",
  "TeamLogic IT of Atlanta, GA",
  "CMIT Solutions of Cherry Hill",
  "CMIT Solutions of Charleston, SC",
  "First Solutions Group",
  "Centric Partners",
  "Backblaze - (SpringDB) Program 1",
  "Unisorb",
  "Athena Group",
  "SoHo Dragon",
  "Showalter Roofing Services Inc.",
  "Axcet HR Solutions",
  "Fox Valley Metrology",
  "Human-ISM LLC",
  "TeamLogic IT - Fort Worth, TX",
  "TeamLogic IT - Orange County, CA",
  "SDSONE",
  "EditPro",
  "Axis Warehouse & Logistics/Ifrost",
  "HTS Coatings",
  "PCB (Premium Credit Bureau)",
  "Axis Warehouse Program 2",
  "Backblaze - (SpringDB) Program 2",
  "Lynn HR Consulting",
  "Redbox+ Dumpsters STL",
  "360Pack",
  "Hodge Hart & Schleifer",
  "Cadence",
  "WA Campion - Program 2",
  "PMB Inc",
  "Tayloe/Gray",
  "SEM Dynamics",
  "Hydroz",
  "Priority Roofing - Dallas",
  "HealthSource Integrated Solutions",
  "Waytek",
  "303 Companies",
  "ExeVision",
  "WA Campion",
  "Rossee Oil Co.",
  "Sullivan & Company",
  "Prism Energy Services",
  "Andy's Roofing",
  "Black Dot Group",
  "Sharp Innovations",
  "John Marshall Advisory",
  "Oxford Appraisal Management",
  "Mediajuice Studios",
  "Logos Distribution",
  "Cultura HR - LinkedIn Only",
  "Switch Commerce",
  "Fohr",
  "DHX Software",
  "Speedeon",
  "Heckler Design",
  "Concrete Careers",
  "USI",
  "AEI Fabrication",
  "Nations Roof",
  "CMIT Solutions of Lanier",
  "Data Magic",
  "CL Technologies",
  "TeamLogic IT - Tempe/Phoenix",
  "goBRANDgo! - Shapiro Metals (White Label)",
  "TravelStore",
  "US Property Management (DBA Lyric Tower)",
  "Lighting Expertise And Design Services",
  "EPMA",
  "Forthright",
  "Bradford Systems",
  "AQS",
  "FitnessEMS",
  "Skyline Search Partners",
  "Bison Biocomposites",
  "Eastern Drayage",
  "QAS Solutions",
  "RealClean Aircraft Detailing - Corporate",
  "KBI Benefits Inc.",
  "WAE Program 2",
  "Today's Graphics",
  "WAE",
  "Lotus Method",
  "Bamar Plastics Inc",
  "Holifield Engineering",
  "BullsEye Jobs",
  "DCG Fulfilment P2",
  "DCG Fulfillment",
  "Isny",
  "Tenet Consulting",
  "Lancaster Safety Consulting Inc. (Win Back)",
  "Priority Power",
  "Grand Haven Custom Molding",
  "Blakeman and Associates",
  "Melton Machine",
  "Melton Machine & Control Program 2",
  "OnGuard Pest Control",
  "Heavy Equipment Colleges of America",
  "Caltron Security Services",
  "Ecologic Furniture",
  "UnDesked",
  "Truliance Consulting",
  "HH Red Stone",
  "Ptc Enterprises Inc",
  "Hoosier Custom Plastics",
  "Pflug Packaging",
  "MAC Safety Consultants",
  "Frontline HR & Training",
  "Wasteology",
  "Benefits Claims Intelligence",
  "Golden Gate Security",
  "SmartShield Solutions",
  "Luttrell Staffing Group",
  "Steel Skin Roofing",
  "Sourcing Insights",
  "Association for Supply Chain Management",
  "Solution Services HR",
  "Association for Supply Chain Management Program 2",
  "JC2 Technologies",
];

/**
 * Known aliases — maps common variations to their canonical CRM name.
 * Add entries here when campaign names don't match the CRM exactly.
 * Keys must be lowercase.
 */
const ALIASES: Record<string, string> = {
  "heckler": "Heckler Design",
  "pierce communication": "Pierce Communications",
  "gobrandgo!": "goBRANDgo! - Shapiro Metals (White Label)",
  "us property management": "US Property Management (DBA Lyric Tower)",
  "lighting expertise and design": "Lighting Expertise And Design Services",
  "lancaster safety consulting": "Lancaster Safety Consulting Inc. (Win Back)",
  "lancaster safety consulting inc.": "Lancaster Safety Consulting Inc. (Win Back)",
  "lancaster safety consulting inc": "Lancaster Safety Consulting Inc. (Win Back)",
  "cultura hr": "Cultura HR - LinkedIn Only",
  "realclean aircraft detailing": "RealClean Aircraft Detailing - Corporate",
  "melton machine & control": "Melton Machine & Control Program 2",
  "association for supply chain": "Association for Supply Chain Management",
  "axis warehouse": "Axis Warehouse & Logistics/Ifrost",
  "axis warehouse & logistics": "Axis Warehouse & Logistics/Ifrost",
  // Brophy and Brophy Air are the same client
  "brophy": "Brophy Air Specialty Group",
  "brophy air": "Brophy Air Specialty Group",
  // Sharp Innovation (singular) → Sharp Innovations (canonical)
  "sharp innovation": "Sharp Innovations",
  // Fastech — Las Vegas is one client, base Fastech is another
  "fastech solutions (las vegas)": "Fastech Solutions Las Vegas",
  "fastech solutions 2 (las vegas)": "Fastech Solutions Las Vegas",
  "fastech solutions las vegas": "Fastech Solutions Las Vegas",
  "fastech": "Fastech Solutions",
};

/**
 * Build a lookup from lowercased name → canonical (display) name.
 */
const canonicalMap = new Map<string, string>();
for (const name of ACTIVE_CLIENT_NAMES) {
  canonicalMap.set(name.toLowerCase().trim(), name);
}
// Add aliases into the map
for (const [alias, canonical] of Object.entries(ALIASES)) {
  canonicalMap.set(alias, canonical);
}

/**
 * Resolve a client name to its canonical form from the CRM list.
 * Uses case-insensitive exact match only (no prefix matching)
 * to avoid merging distinct clients like TeamLogic IT locations.
 */
function findCanonicalName(clientName: string): string | null {
  const normalized = clientName.toLowerCase().trim();

  // Exact match (includes aliases)
  const exact = canonicalMap.get(normalized);
  if (exact) return exact;

  return null;
}

/**
 * Check if a client name matches any active client from the CRM list.
 * Uses exact match + aliases, then falls back to prefix matching
 * only for the isActive check (not for grouping).
 */
export function isActiveClient(clientName: string): boolean {
  if (findCanonicalName(clientName) !== null) return true;

  // Looser prefix check for the active filter only — this is safe because
  // it doesn't affect grouping (campaigns stay in their own groups).
  const normalized = clientName.toLowerCase().trim();
  for (const [key] of canonicalMap) {
    if (normalized.startsWith(key) || key.startsWith(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Normalize a client name for consistent grouping.
 *
 * If the name matches a CRM active client (case-insensitive exact or alias),
 * returns the canonical CRM spelling. Otherwise returns the trimmed input
 * as-is to avoid accidentally merging distinct clients.
 */
export function normalizeClientName(rawName: string): string {
  const canonical = findCanonicalName(rawName);
  if (canonical) return canonical;

  // Not in CRM — return trimmed original
  return rawName.trim();
}
