"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type {
  UnifiedCampaign,
  DashboardStats,
  HeyReachProgressStats,
} from "@/lib/types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface CampaignsState {
  campaigns: UnifiedCampaign[];
  loading: boolean;
  error: string | null;
  warnings: string[];
  refetch: () => void;
}

interface DashboardStatsState {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface DashboardContextValue {
  campaigns: CampaignsState;
  dashboardStats: DashboardStatsState;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  // ── Campaigns ──────────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState<UnifiedCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const campaignsRef = useRef<UnifiedCampaign[]>([]);
  campaignsRef.current = campaigns;

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    setWarnings([]);
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setCampaigns(json.data ?? []);
      if (json.errors?.length) setWarnings(json.errors);
    } catch (err) {
      setCampaignsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  // Background-fetch Smartlead stats in throttled batches.
  useEffect(() => {
    if (campaignsLoading) return;

    const slIds = campaignsRef.current
      .filter((c) => c.platform === "smartlead" && !c.leadStats)
      .map((c) => c.id);

    if (slIds.length === 0) return;

    const controller = new AbortController();

    async function fetchAllStats() {
      const BATCH = 10;
      const DELAY_MS = 1500;

      for (let i = 0; i < slIds.length; i += BATCH) {
        if (controller.signal.aborted) return;

        const batch = slIds.slice(i, i + BATCH);
        try {
          const res = await fetch(
            `/api/campaigns/batch-stats?ids=${batch.join(",")}`,
            { signal: controller.signal }
          );
          if (!res.ok) continue;
          const json = await res.json();
          const statsMap: Record<string, HeyReachProgressStats> =
            json.data ?? {};

          if (Object.keys(statsMap).length > 0) {
            setCampaigns((prev) =>
              prev.map((c) =>
                statsMap[c.id] ? { ...c, leadStats: statsMap[c.id] } : c
              )
            );
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        }

        if (i + BATCH < slIds.length && !controller.signal.aborted) {
          await sleep(DELAY_MS);
        }
      }
    }

    fetchAllStats();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignsLoading]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // ── Dashboard Stats ────────────────────────────────────────────────────
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setStats(json.data ?? null);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Context Value ──────────────────────────────────────────────────────
  const value: DashboardContextValue = {
    campaigns: {
      campaigns,
      loading: campaignsLoading,
      error: campaignsError,
      warnings,
      refetch: fetchCampaigns,
    },
    dashboardStats: {
      stats,
      loading: statsLoading,
      error: statsError,
      refetch: fetchStats,
    },
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useCampaigns(): CampaignsState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useCampaigns must be used within DashboardProvider");
  return ctx.campaigns;
}

export function useDashboardStats(): DashboardStatsState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboardStats must be used within DashboardProvider");
  return ctx.dashboardStats;
}
