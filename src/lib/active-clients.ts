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
 * Normalized set for fast exact lookups.
 */
const normalizedNames = new Set(
  ACTIVE_CLIENT_NAMES.map((n) => n.toLowerCase().trim())
);

/**
 * Check if a client name (as extracted from campaign names) matches
 * any active client from the CRM list.
 *
 * Uses exact match first, then falls back to prefix matching to handle
 * variations like "FocusCFO" vs "FocusCFO - Charlotte, NC" or
 * "TeamLogic IT" vs "TeamLogic IT of Atlanta, GA".
 */
export function isActiveClient(clientName: string): boolean {
  const normalized = clientName.toLowerCase().trim();

  // Exact match
  if (normalizedNames.has(normalized)) return true;

  // Check if the extracted client name starts with any active client name,
  // or if any active client name starts with the extracted name.
  for (const active of normalizedNames) {
    if (normalized.startsWith(active) || active.startsWith(normalized)) {
      return true;
    }
  }

  return false;
}
