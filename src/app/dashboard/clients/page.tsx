"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Linkedin, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaigns } from "@/lib/hooks";
import type { UnifiedCampaign, Platform } from "@/lib/types";

interface ClientGroup {
  name: string;
  campaigns: UnifiedCampaign[];
  platformCounts: Record<Platform, number>;
  activeCampaigns: number;
  pausedCampaigns: number;
  totalLeads: number;
}

function buildClientGroups(campaigns: UnifiedCampaign[]): ClientGroup[] {
  const map = new Map<string, UnifiedCampaign[]>();
  for (const c of campaigns) {
    const list = map.get(c.client) ?? [];
    list.push(c);
    map.set(c.client, list);
  }

  const groups: ClientGroup[] = [];
  for (const [name, cList] of map) {
    const platformCounts: Record<Platform, number> = { heyreach: 0, smartlead: 0 };
    let activeCampaigns = 0;
    let pausedCampaigns = 0;
    let totalLeads = 0;

    for (const c of cList) {
      platformCounts[c.platform]++;
      const s = c.status.toUpperCase();
      if (s === "IN_PROGRESS" || s === "ACTIVE") activeCampaigns++;
      if (s === "PAUSED") pausedCampaigns++;
      totalLeads += c.leadStats?.totalUsers ?? 0;
    }

    groups.push({
      name,
      campaigns: cList,
      platformCounts,
      activeCampaigns,
      pausedCampaigns,
      totalLeads,
    });
  }

  groups.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}

export default function ClientsPage() {
  const { campaigns, loading } = useCampaigns();
  const [search, setSearch] = useState("");

  const clientGroups = useMemo(() => buildClientGroups(campaigns), [campaigns]);

  const filtered = useMemo(() => {
    if (!search) return clientGroups;
    const q = search.toLowerCase();
    return clientGroups.filter((g) => g.name.toLowerCase().includes(q));
  }, [clientGroups, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground text-sm">
          Campaigns grouped by client.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
          No clients found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((group) => (
            <Link
              key={group.name}
              href={`/dashboard/campaigns?client=${encodeURIComponent(group.name)}`}
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {group.campaigns.length} campaign{group.campaigns.length !== 1 ? "s" : ""}
                    </span>
                    {group.platformCounts.heyreach > 0 && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Linkedin className="h-3 w-3" />
                        {group.platformCounts.heyreach}
                      </Badge>
                    )}
                    {group.platformCounts.smartlead > 0 && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Mail className="h-3 w-3" />
                        {group.platformCounts.smartlead}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {group.activeCampaigns > 0 && (
                      <Badge variant="default" className="text-xs">
                        {group.activeCampaigns} active
                      </Badge>
                    )}
                    {group.pausedCampaigns > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {group.pausedCampaigns} paused
                      </Badge>
                    )}
                  </div>
                  {group.totalLeads > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {group.totalLeads.toLocaleString()} total leads
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
