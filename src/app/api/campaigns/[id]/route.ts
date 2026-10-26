import { NextResponse } from "next/server";
import { getHeyReachCampaign } from "@/lib/api/heyreach";
import { getSmartleadCampaign } from "@/lib/api/smartlead";
import { heyreachWorkspaces, smartleadWorkspaces } from "@/lib/api/workspaces";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [platform, platformId] = id.split("_");
    const numericId = Number(platformId);

    if (!platform || isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    // The id does not say which workspace owns the campaign; ask each in turn.
    let workspaces;
    let fetchOne: (key: string) => Promise<unknown>;
    if (platform === "hr") {
      workspaces = heyreachWorkspaces();
      fetchOne = (key) => getHeyReachCampaign(key, numericId);
    } else if (platform === "sl") {
      workspaces = smartleadWorkspaces();
      fetchOne = (key) => getSmartleadCampaign(key, numericId);
    } else {
      return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
    }

    let lastError: unknown = new Error("No workspace configured");
    for (const w of workspaces) {
      try {
        const campaign = await fetchOne(w.key);
        if (campaign && typeof campaign === "object" && "id" in campaign) {
          return NextResponse.json({ data: campaign, platform, workspace: w.name });
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  } catch (error) {
    console.error(`Failed to fetch campaign ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch campaign", detail: String(error) },
      { status: 500 }
    );
  }
}
