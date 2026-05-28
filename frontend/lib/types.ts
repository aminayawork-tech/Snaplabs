export type View = "home" | "running" | "results" | "saved";

export interface Client {
  id: number;
  name: string;
  website_url: string;
  created_at: string;
  score?: number;
  industry?: string;
}

export interface Keyword {
  keyword: string;
  intent?: string;
  difficulty?: string;
  monthly_searches?: string;
}

export interface Competitor {
  name?: string;
  competitor_name?: string;
  url?: string;
  website?: string;
  strengths?: string;
  key_strength?: string;
  strength?: string;
  weaknesses?: string;
  weakness?: string;
  top_ranking_keywords?: string[];
  estimated_traffic?: string;
}

export interface QuickWin {
  tactic?: string;
  title?: string;
  opportunity?: string;
  effort?: string;
  expected_impact?: string;
  impact?: string;
  timeline?: string;
  how_to_steps?: string[];
}

export interface AudiencePersona {
  persona_name?: string;
  demographics?: string;
  pain_points?: string[];
  where_to_reach?: string;
}

export interface ResearchData {
  business_name?: string;
  industry?: string;
  location?: string;
  overall_marketing_score?: { score: number; rationale?: string } | number;
  services_offered?: string[];
  current_marketing_strengths?: string[];
  current_marketing_gaps?: string[];
  seo_analysis?: {
    target_keywords?: (string | { keyword: string })[];
    technical_issues?: string[];
  };
  top_10_longtail_keywords?: (string | Keyword)[];
  target_keywords?: string[];
  technical_seo_issues?: string[];
  competitor_analysis?: Competitor[];
  competitors?: Competitor[];
  quick_win_opportunities?: QuickWin[];
  target_audience?: AudiencePersona[];
}

export interface AuditResult {
  data: ResearchData;
  pages_crawled: number;
  client_id?: number;
}

export interface AgentOutput {
  output: string;
  timestamp: string;
  saved?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentInfo {
  id: string;
  label: string;
}

export const AGENTS: AgentInfo[] = [
  { id: "content_engine",  label: "Content" },
  { id: "seo",             label: "SEO" },
  { id: "paid_ads",        label: "Paid Ads" },
  { id: "social_media",    label: "Social Media" },
  { id: "email_sms",       label: "Email / SMS" },
  { id: "lead_gen",        label: "Lead Gen" },
  { id: "review_referral", label: "Reviews" },
];
