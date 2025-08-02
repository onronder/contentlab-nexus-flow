// ==================== COMPETITOR INTERFACES ====================

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  website_url: string;
  industry: string;
  market_size: string;
  description?: string;
  monitoring_enabled: boolean;
  alert_frequency: string;
  priority_level: string;
  tags: string[];
  added_date: string;
  status: string;
  metrics: {
    market_share: number;
    content_velocity: number;
    social_engagement: number;
    seo_score: number;
  };
  recent_activities: Array<{
    type: string;
    title: string;
    date: string;
    impact: string;
  }>;
}

export interface Industry {
  value: string;
  label: string;
  icon: string;
  color: string;
}

export const industries: Industry[] = [
  { value: "technology", label: "Technology", icon: "laptop", color: "blue" },
  { value: "healthcare", label: "Healthcare", icon: "heart", color: "red" },
  { value: "financial", label: "Financial Services", icon: "dollar-sign", color: "green" },
  { value: "retail", label: "Retail & E-commerce", icon: "shopping-cart", color: "purple" },
  { value: "manufacturing", label: "Manufacturing", icon: "factory", color: "orange" },
  { value: "education", label: "Education", icon: "graduation-cap", color: "indigo" },
  { value: "media", label: "Media & Entertainment", icon: "tv", color: "pink" },
  { value: "real_estate", label: "Real Estate", icon: "home", color: "yellow" },
  { value: "automotive", label: "Automotive", icon: "car", color: "gray" },
  { value: "energy", label: "Energy & Utilities", icon: "zap", color: "amber" },
  { value: "telecommunications", label: "Telecommunications", icon: "phone", color: "cyan" },
  { value: "hospitality", label: "Hospitality & Travel", icon: "plane", color: "teal" },
  { value: "food_beverage", label: "Food & Beverage", icon: "coffee", color: "brown" },
  { value: "fashion", label: "Fashion & Apparel", icon: "shirt", color: "rose" },
  { value: "sports", label: "Sports & Recreation", icon: "trophy", color: "emerald" },
  { value: "non_profit", label: "Non-Profit", icon: "heart-handshake", color: "violet" },
  { value: "other", label: "Other", icon: "more-horizontal", color: "slate" }
];

export interface AddCompetitorData {
  name: string;
  domain: string;
  website_url: string;
  industry: string;
  market_size: string;
  description: string;
  tags: string[];
  monitoring_enabled: boolean;
  alert_frequency: string;
  priority_level: string;
}

export const initialAddCompetitorData: AddCompetitorData = {
  name: "",
  domain: "",
  website_url: "",
  industry: "",
  market_size: "",
  description: "",
  tags: [],
  monitoring_enabled: true,
  alert_frequency: "weekly",
  priority_level: "medium",
};