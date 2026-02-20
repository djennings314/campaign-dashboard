"use client";

import { Suspense, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Linkedin, Mail, RefreshCw, ChevronDown } from "lucide-react";
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
import { CampaignTable } from "@/components/campaign-table";
import { useCampaigns } from "@/lib/hooks";
import type { UnifiedCampaign } from "@/lib/types";

const categoryFilters = [
  { label: "All", value: "all" },
  { label: "Email Campaigns", value: "email" },
  { label: "Direct Mail", value: "direct-mail" },
] as const;

function PlatformTab({
  campaigns,
  loading,
  showCategoryFilter,
  initialClientFilter = "all",
}: {
  campaigns: UnifiedCampaign[];
  loading: boolean;
  showCategoryFilter?: boolean;
  initialClientFilter?: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState(initialClientFilter);

  const statuses = useMemo(() => {
    const set = new Set(campaigns.map((c) => c.status));
    return ["all", ...Array.from(set).sort()];
  }, [campaigns]);

  const clients = useMemo(() => {
    const set = new Set(campaigns.map((c) => c.client));
    return ["all", ...Array.from(set).sort()];
  }, [campaigns]);

  // Reset status filter if the selected status no longer exists
  const activeStatus = statuses.includes(statusFilter) ? statusFilter : "all";
  const activeClient = clients.includes(clientFilter) ? clientFilter : "all";

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (activeStatus !== "all" && c.status !== activeStatus) {
        return false;
      }
      if (categoryFilter !== "all" && c.category !== categoryFilter) {
        return false;
      }
      if (activeClient !== "all" && c.client !== activeClient) {
        return false;
      }
      return true;
    });
  }, [campaigns, search, activeStatus, categoryFilter, activeClient]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                {activeClient === "all" ? "All Clients" : activeClient}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {clients.map((c) => (
                <DropdownMenuItem
                  key={c}
                  onClick={() => setClientFilter(c)}
                  className={activeClient === c ? "font-semibold" : ""}
                >
                  {c === "all" ? "All Clients" : c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {showCategoryFilter && (
            <div className="flex items-center gap-1">
              {categoryFilters.map((cf) => (
                <Button
                  key={cf.value}
                  variant={categoryFilter === cf.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(cf.value)}
                >
                  {cf.label}
                </Button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1">
            {statuses.map((s) => (
              <Badge
                key={s}
                variant={activeStatus === s ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "All Statuses" : s}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <CampaignTable campaigns={filtered} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignsPageInner() {
  const { campaigns, loading, refetch } = useCampaigns();
  const searchParams = useSearchParams();
  const clientParam = searchParams.get("client") ?? "all";

  const heyreachCampaigns = useMemo(
    () => campaigns.filter((c) => c.platform === "heyreach"),
    [campaigns]
  );
  const smartleadCampaigns = useMemo(
    () => campaigns.filter((c) => c.platform === "smartlead"),
    [campaigns]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground text-sm">
            Browse campaigns by platform.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="heyreach">
        <TabsList>
          <TabsTrigger value="heyreach" className="gap-1.5">
            <Linkedin className="h-4 w-4" />
            HeyReach
            {!loading && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {heyreachCampaigns.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="smartlead" className="gap-1.5">
            <Mail className="h-4 w-4" />
            Smartlead
            {!loading && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {smartleadCampaigns.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="heyreach">
          <PlatformTab
            campaigns={heyreachCampaigns}
            loading={loading}
            initialClientFilter={clientParam}
          />
        </TabsContent>
        <TabsContent value="smartlead">
          <PlatformTab
            campaigns={smartleadCampaigns}
            loading={loading}
            showCategoryFilter
            initialClientFilter={clientParam}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense>
      <CampaignsPageInner />
    </Suspense>
  );
}
