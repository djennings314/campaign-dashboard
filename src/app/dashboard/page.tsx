"use client";

import {
  Send,
  MessageSquare,
  Users,
  Linkedin,
  Mail,
  UserCheck,
  UserX,
  Clock,
  Zap,
  RefreshCw,
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
import { CampaignTable } from "@/components/campaign-table";
import { useCampaigns, useDashboardStats } from "@/lib/hooks";

function fmt(n: number) {
  return n.toLocaleString();
}

export default function DashboardPage() {
  const { campaigns, loading: campaignsLoading, refetch: refetchCampaigns } = useCampaigns();
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats();

  const isLoading = campaignsLoading || statsLoading;
  const handleRefresh = () => {
    refetchCampaigns();
    refetchStats();
  };

  const hrStats = stats?.heyreach;
  const slStats = stats?.smartlead;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Lead status counts and campaign performance across HeyReach &amp;
            Smartlead.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {statsError && (
        <Card className="border-destructive py-3">
          <CardContent className="text-destructive text-sm">
            Failed to load stats: {statsError}
          </CardContent>
        </Card>
      )}

      {/* ═══ HEYREACH — LinkedIn ═══ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Linkedin className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">HeyReach — LinkedIn Outreach</h2>
          {!statsLoading && hrStats && (
            <Badge variant="outline" className="ml-2">
              {hrStats.totalCampaigns} campaigns ({hrStats.activeCampaigns}{" "}
              active)
            </Badge>
          )}
        </div>

        {statsLoading ? (
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : hrStats ? (
          <>
            {/* Lead status counts */}
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard
                title="Total Leads"
                value={fmt(hrStats.totalLeads)}
                icon={Users}
              />
              <StatCard
                title="Pending"
                value={fmt(hrStats.leadsByStatus.pending)}
                icon={Clock}
                className="border-l-4 border-l-yellow-400"
              />
              <StatCard
                title="In Progress"
                value={fmt(hrStats.leadsByStatus.inProgress)}
                icon={Zap}
                className="border-l-4 border-l-blue-400"
              />
              <StatCard
                title="Finished"
                value={fmt(hrStats.leadsByStatus.finished)}
                icon={UserCheck}
                className="border-l-4 border-l-green-500"
              />
              <StatCard
                title="Failed"
                value={fmt(hrStats.leadsByStatus.failed)}
                icon={UserX}
                className="border-l-4 border-l-red-500"
              />
              <StatCard
                title="Stopped / Excluded"
                value={fmt(
                  hrStats.leadsByStatus.stopped +
                    hrStats.leadsByStatus.excluded
                )}
                icon={UserX}
                className="border-l-4 border-l-gray-400"
              />
            </div>

            {/* Activity stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Connections Sent"
                value={fmt(hrStats.connectionsSent)}
                icon={Send}
              />
              <StatCard
                title="Connections Accepted"
                value={fmt(hrStats.connectionsAccepted)}
                subtitle={
                  hrStats.connectionsSent > 0
                    ? `${((hrStats.connectionsAccepted / hrStats.connectionsSent) * 100).toFixed(1)}% acceptance`
                    : undefined
                }
                icon={UserCheck}
              />
              <StatCard
                title="Messages Sent"
                value={fmt(hrStats.messagesSent)}
                icon={MessageSquare}
              />
              <StatCard
                title="Message Replies"
                value={fmt(hrStats.messageReplies)}
                subtitle={
                  hrStats.messagesSent > 0
                    ? `${((hrStats.messageReplies / hrStats.messagesSent) * 100).toFixed(1)}% reply rate`
                    : undefined
                }
                icon={MessageSquare}
              />
            </div>
          </>
        ) : null}
      </section>

      {/* ═══ SMARTLEAD — Email ═══ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold">Smartlead — Email Outreach</h2>
          {!statsLoading && slStats && (
            <Badge variant="outline" className="ml-2">
              {slStats.totalCampaigns} campaigns
            </Badge>
          )}
        </div>

        {statsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : slStats ? (
          <>
            {/* Email stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard
                title="Emails Sent"
                value={fmt(slStats.overallStats.sent)}
                icon={Send}
              />
              <StatCard
                title="Opened"
                value={fmt(slStats.overallStats.opened)}
                subtitle={
                  slStats.overallStats.sent > 0
                    ? `${((slStats.overallStats.opened / slStats.overallStats.sent) * 100).toFixed(2)}% open rate`
                    : undefined
                }
                icon={Mail}
              />
              <StatCard
                title="Replied"
                value={fmt(slStats.overallStats.replied)}
                subtitle={
                  slStats.overallStats.sent > 0
                    ? `${((slStats.overallStats.replied / slStats.overallStats.sent) * 100).toFixed(2)}% reply rate`
                    : undefined
                }
                icon={MessageSquare}
              />
              <StatCard
                title="Bounced"
                value={fmt(slStats.overallStats.bounced)}
                icon={UserX}
              />
              <StatCard
                title="Active Campaign Leads"
                value={fmt(slStats.activeCampaignLeads)}
                icon={Users}
              />
            </div>

            {/* Campaign status breakdown */}
            {Object.keys(slStats.campaignsByStatus).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Campaigns by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-6">
                    {Object.entries(slStats.campaignsByStatus)
                      .filter(([, count]) => count > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([status, count]) => (
                        <div key={status} className="text-center">
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-muted-foreground text-xs">
                            {status}
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </section>

      {/* ═══ CAMPAIGNS TABLE ═══ */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
          <CardDescription>
            Showing the 15 most recently created campaigns across both platforms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignTable
            campaigns={campaigns.slice(0, 15)}
            loading={campaignsLoading}
            paginate={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
