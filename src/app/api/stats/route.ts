import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/api/unified";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats", detail: String(error) },
      { status: 500 }
    );
  }
}
