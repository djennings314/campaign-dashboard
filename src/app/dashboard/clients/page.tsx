"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ChevronRight, ChevronDown, ArrowUpDown, Filter, Linkedin, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCampaigns } from "@/lib/hooks";
import type { UnifiedCampaign, Platform } from "@/lib/types";
import { isActiveClient } from "@/lib/active-clients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  const s = status.toUpperCase();
  if (s === "IN_PROGRESS" || s === "ACTIVE") return "default";
  if (s === "PAUSED" || s === "DRAFT" || s === "DRAFTED") return "secondary";
  if (s === "FAILED" || s === "CANCELED" || s === "STOPPED")
    return "destructive";
  return "outline";
}

function platformLabel(platform: string) {
  return platform === "heyreach" ? "HeyReach" : "Smartlead";
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Client Group ─────────────────────────────────────────────────────────────

interface ClientGroup {
  name: string;
  campaigns: UnifiedCampaign[];
  platformCounts: Record<Platform, number>;
  activeCampaigns: number;
  pausedCampaigns: number;
  totalLeads: number;
  totalPending: number;
  totalInProgress: number;
  totalFinished: number;
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
    let totalPending = 0;
    let totalInProgress = 0;
    let totalFinished = 0;

    for (const c of cList) {
      platformCounts[c.platform]++;
      const s = c.status.toUpperCase();
      if (s === "IN_PROGRESS" || s === "ACTIVE") activeCampaigns++;
      if (s === "PAUSED") pausedCampaigns++;
      totalLeads += c.leadStats?.totalUsers ?? 0;
      totalPending += c.leadStats?.totalUsersPending ?? 0;
      totalInProgress += c.leadStats?.totalUsersInProgress ?? 0;
      totalFinished += c.leadStats?.totalUsersFinished ?? 0;
    }

    groups.push({
      name,
      campaigns: cList,
      platformCounts,
      activeCampaigns,
      pausedCampaigns,
      totalLeads,
      totalPending,
      totalInProgress,
      totalFinished,
    });
  }

  return groups;
}

// ─── Sort Options ────────────────────────────────────────────────────────────

type SortField = "name" | "campaigns" | "totalLeads" | "totalPending" | "totalInProgress" | "totalFinished" | "activeCampaigns";

const sortOptions: { label: string; field: SortField }[] = [
  { label: "Client Name", field: "name" },
  { label: "Campaigns", field: "campaigns" },
  { label: "Total Leads", field: "totalLeads" },
  { label: "Pending", field: "totalPending" },
  { label: "In Progress", field: "totalInProgress" },
  { label: "Finished", field: "totalFinished" },
  { label: "Active Campaigns", field: "activeCampaigns" },
];

function sortGroups(groups: ClientGroup[], field: SortField, desc: boolean): ClientGroup[] {
  return [...groups].sort((a, b) => {
    let cmp: number;
    if (field === "name") {
      cmp = a.name.localeCompare(b.name);
    } else if (field === "campaigns") {
      cmp = a.campaigns.length - b.campaigns.length;
    } else {
      cmp = a[field] - b[field];
    }
    return desc ? -cmp : cmp;
  });
}

// ─── Campaign Sub-Table ──────────────────────────────────────────────────────

function CampaignSubTable({ campaigns }: { campaigns: UnifiedCampaign[] }) {
  const totals = useMemo(() => {
    let leads = 0, pending = 0, inProgress = 0, finished = 0;
    for (const c of campaigns) {
      leads += c.leadStats?.totalUsers ?? 0;
      pending += c.leadStats?.totalUsersPending ?? 0;
      inProgress += c.leadStats?.totalUsersInProgress ?? 0;
      finished += c.leadStats?.totalUsersFinished ?? 0;
    }
    return { leads, pending, inProgress, finished };
  }, [campaigns]);

  const hasTotals = totals.leads > 0;

  if (campaigns.length === 0) {
    return (
      <div className="text-muted-foreground flex h-16 items-center justify-center text-sm">
        No campaigns on this platform.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Campaign</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total Leads</TableHead>
          <TableHead className="text-right">Pending</TableHead>
          <TableHead className="text-right">In Progress</TableHead>
          <TableHead className="text-right">Finished</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((c) => (
          <TableRow key={c.id}>
            <TableCell>
              <Link
                href={`/dashboard/campaigns/${c.id}`}
                className="text-primary font-medium hover:underline"
              >
                {c.name}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
            </TableCell>
            <TableCell className="text-right font-medium">
              {c.leadStats?.totalUsers != null
                ? c.leadStats.totalUsers.toLocaleString()
                : "—"}
            </TableCell>
            <TableCell className="text-right text-yellow-600">
              {c.leadStats?.totalUsersPending != null
                ? c.leadStats.totalUsersPending.toLocaleString()
                : "—"}
            </TableCell>
            <TableCell className="text-right text-blue-600">
              {c.leadStats?.totalUsersInProgress != null
                ? c.leadStats.totalUsersInProgress.toLocaleString()
                : "—"}
            </TableCell>
            <TableCell className="text-right text-green-600">
              {c.leadStats?.totalUsersFinished != null
                ? c.leadStats.totalUsersFinished.toLocaleString()
                : "—"}
            </TableCell>
            <TableCell>
              <span className="text-muted-foreground text-sm">
                {formatDate(c.createdAt)}
              </span>
            </TableCell>
          </TableRow>
        ))}
        {hasTotals && (
          <TableRow className="bg-muted/50 font-semibold">
            <TableCell colSpan={2} className="text-right text-xs uppercase tracking-wide">
              Totals
            </TableCell>
            <TableCell className="text-right">
              {totals.leads.toLocaleString()}
            </TableCell>
            <TableCell className="text-right text-yellow-600">
              {totals.pending.toLocaleString()}
            </TableCell>
            <TableCell className="text-right text-blue-600">
              {totals.inProgress.toLocaleString()}
            </TableCell>
            <TableCell className="text-right text-green-600">
              {totals.finished.toLocaleString()}
            </TableCell>
            <TableCell />
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

// ─── Client Section ───────────────────────────────────────────────────────────

function ClientSection({ group }: { group: ClientGroup }) {
  const [expanded, setExpanded] = useState(false);
  const hasLeadStats = group.totalLeads > 0;

  const heyreachCampaigns = useMemo(
    () => group.campaigns.filter((c) => c.platform === "heyreach"),
    [group.campaigns]
  );
  const smartleadCampaigns = useMemo(
    () => group.campaigns.filter((c) => c.platform === "smartlead"),
    [group.campaigns]
  );

  const hasBothPlatforms =
    heyreachCampaigns.length > 0 && smartleadCampaigns.length > 0;

  // Default to whichever platform has campaigns (prefer heyreach)
  const defaultTab = heyreachCampaigns.length > 0 ? "heyreach" : "smartlead";

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Client header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-accent/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
        <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-sm font-semibold">{group.name}</span>
          <span className="text-muted-foreground text-xs">
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
        {/* Summed stats on the right */}
        <div className="hidden items-center gap-4 text-xs sm:flex">
          {hasLeadStats && (
            <>
              <span className="font-medium" title="Total Leads">
                {group.totalLeads.toLocaleString()} leads
              </span>
              <span className="text-yellow-600" title="Pending">
                {group.totalPending.toLocaleString()} pending
              </span>
              <span className="text-blue-600" title="In Progress">
                {group.totalInProgress.toLocaleString()} in prog
              </span>
              <span className="text-green-600" title="Finished">
                {group.totalFinished.toLocaleString()} finished
              </span>
            </>
          )}
        </div>
      </button>

      {/* Expanded campaign tables — tabbed by platform */}
      {expanded && (
        <div className="border-t">
          {hasBothPlatforms ? (
            <Tabs defaultValue={defaultTab} className="w-full">
              <div className="px-4 pt-3">
                <TabsList>
                  <TabsTrigger value="heyreach" className="gap-1.5">
                    <Linkedin className="h-3.5 w-3.5" />
                    HeyReach ({heyreachCampaigns.length})
                  </TabsTrigger>
                  <TabsTrigger value="smartlead" className="gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Smartlead ({smartleadCampaigns.length})
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="heyreach">
                <CampaignSubTable campaigns={heyreachCampaigns} />
              </TabsContent>
              <TabsContent value="smartlead">
                <CampaignSubTable campaigns={smartleadCampaigns} />
              </TabsContent>
            </Tabs>
          ) : (
            /* Only one platform — no tabs needed */
            <CampaignSubTable campaigns={group.campaigns} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { campaigns, loading } = useCampaigns();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDesc, setSortDesc] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);

  const clientGroups = useMemo(() => buildClientGroups(campaigns), [campaigns]);

  const filtered = useMemo(() => {
    let groups = clientGroups;
    if (activeOnly) {
      groups = groups.filter((g) => isActiveClient(g.name));
    }
    if (search) {
      const q = search.toLowerCase();
      groups = groups.filter((g) => g.name.toLowerCase().includes(q));
    }
    return sortGroups(groups, sortField, sortDesc);
  }, [clientGroups, search, sortField, sortDesc, activeOnly]);

  const currentSortLabel = sortOptions.find((o) => o.field === sortField)?.label ?? "Sort";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground text-sm">
          Campaigns grouped by client.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {currentSortLabel}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {sortOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.field}
                onClick={() => {
                  if (sortField === opt.field) {
                    setSortDesc(!sortDesc);
                  } else {
                    setSortField(opt.field);
                    setSortDesc(opt.field !== "name");
                  }
                }}
                className={sortField === opt.field ? "font-semibold" : ""}
              >
                {opt.label}
                {sortField === opt.field && (
                  <span className="ml-auto text-xs opacity-60">
                    {sortDesc ? "↓" : "↑"}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant={activeOnly ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setActiveOnly(!activeOnly)}
        >
          <Filter className="h-3.5 w-3.5" />
          {activeOnly ? "Active clients" : "All clients"}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
          No clients found.
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-2 pt-4">
            {filtered.map((group) => (
              <ClientSection key={group.name} group={group} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
