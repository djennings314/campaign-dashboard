// ─── Common ───────────────────────────────────────────────────────────────────

export type Platform = "heyreach" | "smartlead";

// ─── HeyReach Types (matched to actual API responses) ───────────────────────

export type HeyReachCampaignStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "PAUSED"
  | "FINISHED"
  | "CANCELED"
  | "FAILED"
  | "STARTING";

export interface HeyReachProgressStats {
  totalUsers: number;
  totalUsersInProgress: number;
  totalUsersPending: number;
  totalUsersFinished: number;
  totalUsersFailed: number;
  totalUsersManuallyStopped: number;
  totalUsersExcluded: number;
}

export interface HeyReachCampaign {
  id: number;
  name: string;
  status: HeyReachCampaignStatus;
  creationTime: string;
  linkedInUserListName: string;
  linkedInUserListId: number;
  campaignAccountIds: number[];
  progressStats: HeyReachProgressStats;
  organizationUnitId: number;
  [key: string]: unknown;
}

export interface HeyReachDayStats {
  profileViews: number;
  postLikes: number;
  follows: number;
  messagesSent: number;
  totalMessageStarted: number;
  totalMessageReplies: number;
  inmailMessagesSent: number;
  totalInmailStarted: number;
  totalInmailReplies: number;
  connectionsSent: number;
  connectionsAccepted: number;
  messageReplyRate: number;
  inMailReplyRate: number;
  connectionAcceptanceRate: number;
}

export interface HeyReachOverallStats {
  byDayStats: Record<string, HeyReachDayStats>;
}

// ─── Smartlead Types (matched to actual API responses) ──────────────────────

export interface SmartleadCampaign {
  id: number;
  name: string;
  status: string; // ACTIVE, DRAFTED, PAUSED, COMPLETED, STOPPED
  created_at: string;
  updated_at: string;
  user_id: number;
  client_id: number | null;
  max_leads_per_day: number;
  [key: string]: unknown;
}

export interface SmartleadOverallStats {
  sent: number;
  opened: number;
  replied: number;
  bounced: number;
}

export interface SmartleadCampaignStatusStats {
  status: string;
  total_count: string;
}

export interface SmartleadLeadCategoryResponse {
  total_response: number;
  name: string;
  sentiment_type?: string;
  percentage: string;
}

// ─── Unified / Dashboard Types ───────────────────────────────────────────────

export type CampaignCategory = "email" | "direct-mail";

export interface UnifiedCampaign {
  id: string;          // prefixed: "hr_123" or "sl_456"
  platformId: number;
  platform: Platform;
  name: string;
  status: string;
  createdAt: string;
  category?: CampaignCategory;
  // HeyReach-specific: lead progress stats
  leadStats?: HeyReachProgressStats;
}

export interface DashboardStats {
  // HeyReach aggregate
  heyreach: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalLeads: number;
    leadsByStatus: {
      pending: number;
      inProgress: number;
      finished: number;
      failed: number;
      stopped: number;
      excluded: number;
    };
    // Aggregated from byDayStats
    connectionsSent: number;
    connectionsAccepted: number;
    messagesSent: number;
    messageReplies: number;
  };
  // Smartlead aggregate
  smartlead: {
    totalCampaigns: number;
    campaignsByStatus: Record<string, number>; // ACTIVE: 195, PAUSED: 83, etc.
    overallStats: SmartleadOverallStats;
    activeCampaignLeads: number;
    leadCategories: SmartleadLeadCategoryResponse[];
  };
}

// ─── API Response Wrapper ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error?: string;
}
