"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Clock,
  Zap,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import type { HeyReachProgressStats } from "@/lib/types";

interface CampaignDetail {
  id?: number;
  name?: string;
  status?: string;
  creationTime?: string;
  created_at?: string;
  progressStats?: HeyReachProgressStats;
  [key: string]: unknown;
}

function fmt(n: number) {
  return n.toLocaleString();
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [platform, setPlatform] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCampaign() {
      try {
        const res = await fetch(`/api/campaigns/${id}`);
        if (!res.ok) throw new Error("Failed to fetch campaign");
        const json = await res.json();
        setCampaign(json.data);
        setPlatform(json.platform);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchCampaign();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/campaigns">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8 text-center text-red-600">
            {error ?? "Campaign not found"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const name = campaign.name ?? "Untitled Campaign";
  const status = campaign.status ?? "Unknown";
  const createdAt = campaign.creationTime ?? campaign.created_at ?? "";
  const platformLabel = platform === "hr" ? "HeyReach" : "Smartlead";
  const ps = campaign.progressStats;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/campaigns">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Campaigns
        </Button>
      </Link>

      {/* Campaign info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{name}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Badge variant="outline">{platformLabel}</Badge>
            <Badge
              variant={
                status.toUpperCase() === "IN_PROGRESS" ||
                status.toLowerCase() === "active"
                  ? "default"
                  : "secondary"
              }
            >
              {status}
            </Badge>
            {createdAt && (
              <span className="text-muted-foreground text-xs">
                Created {new Date(createdAt).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Lead status breakdown (HeyReach only) */}
      {ps && (
        <section className="space-y-3">
          <h3 className="font-semibold">Lead Status Breakdown</h3>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              title="Total Leads"
              value={fmt(ps.totalUsers)}
              icon={Users}
            />
            <StatCard
              title="Pending"
              value={fmt(ps.totalUsersPending)}
              icon={Clock}
              className="border-l-4 border-l-yellow-400"
            />
            <StatCard
              title="In Progress"
              value={fmt(ps.totalUsersInProgress)}
              icon={Zap}
              className="border-l-4 border-l-blue-400"
            />
            <StatCard
              title="Finished"
              value={fmt(ps.totalUsersFinished)}
              icon={UserCheck}
              className="border-l-4 border-l-green-500"
            />
            <StatCard
              title="Failed"
              value={fmt(ps.totalUsersFailed)}
              icon={UserX}
              className="border-l-4 border-l-red-500"
            />
            <StatCard
              title="Stopped / Excluded"
              value={fmt(ps.totalUsersManuallyStopped + ps.totalUsersExcluded)}
              icon={UserX}
              className="border-l-4 border-l-gray-400"
            />
          </div>

          {/* Visual bar */}
          {ps.totalUsers > 0 && (
            <div className="flex h-4 overflow-hidden rounded-full">
              {ps.totalUsersFinished > 0 && (
                <div
                  className="bg-green-500"
                  style={{
                    width: `${(ps.totalUsersFinished / ps.totalUsers) * 100}%`,
                  }}
                  title={`Finished: ${ps.totalUsersFinished}`}
                />
              )}
              {ps.totalUsersInProgress > 0 && (
                <div
                  className="bg-blue-400"
                  style={{
                    width: `${(ps.totalUsersInProgress / ps.totalUsers) * 100}%`,
                  }}
                  title={`In Progress: ${ps.totalUsersInProgress}`}
                />
              )}
              {ps.totalUsersPending > 0 && (
                <div
                  className="bg-yellow-400"
                  style={{
                    width: `${(ps.totalUsersPending / ps.totalUsers) * 100}%`,
                  }}
                  title={`Pending: ${ps.totalUsersPending}`}
                />
              )}
              {ps.totalUsersFailed > 0 && (
                <div
                  className="bg-red-500"
                  style={{
                    width: `${(ps.totalUsersFailed / ps.totalUsers) * 100}%`,
                  }}
                  title={`Failed: ${ps.totalUsersFailed}`}
                />
              )}
              {ps.totalUsersManuallyStopped + ps.totalUsersExcluded > 0 && (
                <div
                  className="bg-gray-400"
                  style={{
                    width: `${((ps.totalUsersManuallyStopped + ps.totalUsersExcluded) / ps.totalUsers) * 100}%`,
                  }}
                  title={`Stopped/Excluded: ${ps.totalUsersManuallyStopped + ps.totalUsersExcluded}`}
                />
              )}
            </div>
          )}
        </section>
      )}

      {/* Smartlead detail placeholder */}
      {platform === "sl" && (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            Smartlead campaign detail — email sequence stats coming soon.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
