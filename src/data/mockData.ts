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

export const mockCompetitors: Competitor[] = [
  {
    id: "1",
    name: "Apple Inc.",
    domain: "apple.com",
    website_url: "https://apple.com",
    industry: "technology",
    market_size: "enterprise",
    description: "Consumer electronics and software company",
    monitoring_enabled: true,
    alert_frequency: "weekly",
    priority_level: "high",
    tags: ["mobile", "hardware", "software"],
    added_date: "2024-01-15",
    status: "active",
    metrics: {
      market_share: 23.5,
      content_velocity: 45,
      social_engagement: 89.2,
      seo_score: 92.1
    },
    recent_activities: [
      {
        type: "content_published",
        title: "New iPhone 16 Launch",
        date: "2024-01-20",
        impact: "high"
      }
    ]
  },
  {
    id: "2",
    name: "Microsoft Corporation",
    domain: "microsoft.com",
    website_url: "https://microsoft.com",
    industry: "technology",
    market_size: "enterprise",
    description: "Software and cloud computing services",
    monitoring_enabled: true,
    alert_frequency: "daily",
    priority_level: "high",
    tags: ["cloud", "software", "enterprise"],
    added_date: "2024-01-10",
    status: "active",
    metrics: {
      market_share: 19.8,
      content_velocity: 62,
      social_engagement: 75.4,
      seo_score: 88.7
    },
    recent_activities: [
      {
        type: "feature_update",
        title: "Azure AI Updates",
        date: "2024-01-18",
        impact: "medium"
      }
    ]
  },
  {
    id: "3",
    name: "Shopify Inc.",
    domain: "shopify.com",
    website_url: "https://shopify.com",
    industry: "retail",
    market_size: "large",
    description: "E-commerce platform for businesses",
    monitoring_enabled: false,
    alert_frequency: "weekly",
    priority_level: "medium",
    tags: ["ecommerce", "platform", "saas"],
    added_date: "2024-01-05",
    status: "active",
    metrics: {
      market_share: 12.3,
      content_velocity: 38,
      social_engagement: 67.8,
      seo_score: 85.2
    },
    recent_activities: [
      {
        type: "partnership",
        title: "New Payment Integration",
        date: "2024-01-16",
        impact: "low"
      }
    ]
  }
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