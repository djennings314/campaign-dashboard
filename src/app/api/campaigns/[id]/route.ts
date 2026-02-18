import { NextResponse } from "next/server";
import { getHeyReachCampaign } from "@/lib/api/heyreach";
import { getSmartleadCampaign } from "@/lib/api/smartlead";

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

    let campaign;
    if (platform === "hr") {
      campaign = await getHeyReachCampaign(numericId);
    } else if (platform === "sl") {
      campaign = await getSmartleadCampaign(numericId);
    } else {
      return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
    }

    return NextResponse.json({ data: campaign, platform });
  } catch (error) {
    console.error(`Failed to fetch campaign ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch campaign", detail: String(error) },
      { status: 500 }
    );
  }
}
