import { NextResponse } from "next/server";
import { getAllCampaigns } from "@/lib/api/unified";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { campaigns, errors } = await getAllCampaigns();
    return NextResponse.json({ data: campaigns, errors });
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns", detail: String(error) },
      { status: 500 }
    );
  }
}
