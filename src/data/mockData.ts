// ==================== USER & TEAM INTERFACES ====================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'online' | 'offline' | 'away';
  lastActive: string;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  activeUsers: number;
  pendingInvitations: number;
}

// ==================== PROJECT INTERFACES ====================

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold' | 'archived';
  progress: number;
  teamMembers: User[];
  createdAt: string;
  updatedAt: string;
  thumbnail: string;
  deadline?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// ==================== CONTENT INTERFACES ====================

export interface ContentItem {
  id: string;
  title: string;
  type: 'blog-post' | 'social-media' | 'video' | 'document' | 'image';
  author: User;
  createdAt: string;
  updatedAt: string;
  fileSize: string;
  thumbnail: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  engagement?: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
}

// ==================== ANALYTICS INTERFACES ====================

export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  timestamp: string;
  category: string;
}

export interface ChartData {
  name: string;
  value: number;
  date: string;
  category?: string;
  color?: string;
}

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

// ==================== MOCK DATA ====================

// Mock Users
export const mockUsers: User[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@contentlab.com",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b5e5?w=150&h=150&fit=crop&crop=face",
    role: "admin",
    status: "online",
    lastActive: "2024-01-21T10:30:00Z",
    joinedAt: "2023-06-15T09:00:00Z"
  },
  {
    id: "2", 
    name: "Marcus Rodriguez",
    email: "marcus.r@contentlab.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    role: "editor",
    status: "online",
    lastActive: "2024-01-21T10:15:00Z",
    joinedAt: "2023-08-22T14:30:00Z"
  },
  {
    id: "3",
    name: "Emily Watson",
    email: "emily.watson@contentlab.com", 
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    role: "editor",
    status: "away",
    lastActive: "2024-01-21T09:45:00Z",
    joinedAt: "2023-09-10T11:20:00Z"
  },
  {
    id: "4",
    name: "James Kim",
    email: "james.kim@contentlab.com",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    role: "viewer",
    status: "offline",
    lastActive: "2024-01-20T17:30:00Z",
    joinedAt: "2023-11-05T16:45:00Z"
  },
  {
    id: "5",
    name: "Alex Morgan",
    email: "alex.morgan@contentlab.com",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    role: "editor",
    status: "online",
    lastActive: "2024-01-21T10:20:00Z",
    joinedAt: "2023-12-01T10:00:00Z"
  }
];

// Mock Team
export const mockTeam: Team = {
  id: "team-1",
  name: "ContentLab Nexus",
  description: "Strategic competitive intelligence team focused on content marketing and digital presence analysis",
  memberCount: 5,
  activeUsers: 3,
  pendingInvitations: 2
};

// Mock Projects
export const mockProjects: Project[] = [
  {
    id: "1",
    name: "Q1 Content Strategy Analysis",
    description: "Comprehensive analysis of competitor content strategies for Q1 2024 planning",
    status: "active",
    progress: 75,
    teamMembers: [mockUsers[0], mockUsers[1], mockUsers[2]],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-20T15:30:00Z",
    thumbnail: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=300&fit=crop",
    deadline: "2024-01-31T23:59:59Z",
    category: "Strategy",
    priority: "high"
  },
  {
    id: "2", 
    name: "Social Media Competitive Audit",
    description: "Deep dive into competitor social media presence and engagement strategies",
    status: "active",
    progress: 45,
    teamMembers: [mockUsers[1], mockUsers[4]],
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-21T09:15:00Z",
    thumbnail: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop",
    deadline: "2024-02-15T23:59:59Z",
    category: "Social Media",
    priority: "medium"
  },
  {
    id: "3",
    name: "SEO Performance Benchmarking",
    description: "Monthly SEO competitive analysis and keyword gap identification",
    status: "completed",
    progress: 100,
    teamMembers: [mockUsers[0], mockUsers[2]],
    createdAt: "2023-12-15T00:00:00Z",
    updatedAt: "2024-01-15T12:00:00Z",
    thumbnail: "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=400&h=300&fit=crop",
    category: "SEO",
    priority: "medium"
  },
  {
    id: "4",
    name: "Product Launch Intelligence",
    description: "Tracking competitor product launches and market positioning strategies",
    status: "on-hold",
    progress: 20,
    teamMembers: [mockUsers[3], mockUsers[4]],
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-18T14:20:00Z",
    thumbnail: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop",
    deadline: "2024-03-01T23:59:59Z",
    category: "Product Intelligence",
    priority: "low"
  },
  {
    id: "5",
    name: "Video Content Analysis",
    description: "Analyzing competitor video marketing strategies and performance metrics",
    status: "active",
    progress: 60,
    teamMembers: [mockUsers[1], mockUsers[2], mockUsers[4]],
    createdAt: "2024-01-12T00:00:00Z",
    updatedAt: "2024-01-21T11:00:00Z",
    thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=300&fit=crop",
    deadline: "2024-02-28T23:59:59Z",
    category: "Video Marketing",
    priority: "high"
  },
  {
    id: "6",
    name: "Brand Positioning Study",
    description: "Comprehensive analysis of competitor brand positioning and messaging strategies",
    status: "active",
    progress: 30,
    teamMembers: [mockUsers[0], mockUsers[3]],
    createdAt: "2024-01-08T00:00:00Z",
    updatedAt: "2024-01-19T16:45:00Z",
    thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
    deadline: "2024-02-20T23:59:59Z",
    category: "Brand Strategy",
    priority: "medium"
  }
];

// Mock Content Items
export const mockContentItems: ContentItem[] = [
  {
    id: "1",
    title: "Competitor Analysis Report - Q4 2023",
    type: "document",
    author: mockUsers[0],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
    fileSize: "2.4 MB",
    thumbnail: "https://images.unsplash.com/photo-1568239503534-bb5a35e54e9b?w=400&h=300&fit=crop",
    tags: ["analysis", "quarterly", "strategy"],
    status: "published",
    engagement: {
      views: 245,
      likes: 32,
      shares: 18,
      comments: 12
    }
  },
  {
    id: "2",
    title: "Social Media Competitive Insights",
    type: "blog-post",
    author: mockUsers[1],
    createdAt: "2024-01-18T09:30:00Z",
    updatedAt: "2024-01-19T11:15:00Z",
    fileSize: "1.8 MB",
    thumbnail: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop",
    tags: ["social-media", "insights", "engagement"],
    status: "published",
    engagement: {
      views: 189,
      likes: 27,
      shares: 15,
      comments: 8
    }
  },
  {
    id: "3",
    title: "Competitor Video Strategy Analysis",
    type: "video",
    author: mockUsers[2],
    createdAt: "2024-01-12T14:20:00Z",
    updatedAt: "2024-01-18T16:45:00Z",
    fileSize: "156 MB",
    thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=300&fit=crop",
    tags: ["video", "strategy", "content-marketing"],
    status: "published",
    engagement: {
      views: 412,
      likes: 68,
      shares: 34,
      comments: 23
    }
  },
  {
    id: "4",
    title: "Brand Positioning Infographic",
    type: "image",
    author: mockUsers[4],
    createdAt: "2024-01-10T11:00:00Z",
    updatedAt: "2024-01-16T13:20:00Z",
    fileSize: "3.2 MB",
    thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
    tags: ["infographic", "branding", "positioning"],
    status: "draft",
    engagement: {
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0
    }
  },
  {
    id: "5",
    title: "Weekly Market Intelligence Update",
    type: "social-media",
    author: mockUsers[1],
    createdAt: "2024-01-19T08:45:00Z",
    updatedAt: "2024-01-19T09:30:00Z",
    fileSize: "0.5 MB",
    thumbnail: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop",
    tags: ["weekly-update", "market-intelligence", "social"],
    status: "published",
    engagement: {
      views: 134,
      likes: 21,
      shares: 9,
      comments: 5
    }
  },
  {
    id: "6",
    title: "SEO Competitive Analysis Dashboard",
    type: "document",
    author: mockUsers[0],
    createdAt: "2024-01-08T13:15:00Z",
    updatedAt: "2024-01-14T15:50:00Z",
    fileSize: "4.1 MB",
    thumbnail: "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=400&h=300&fit=crop",
    tags: ["seo", "dashboard", "competitive-analysis"],
    status: "published",
    engagement: {
      views: 298,
      likes: 45,
      shares: 22,
      comments: 16
    }
  }
];

// Mock Analytics Data
export const mockAnalyticsMetrics: AnalyticsMetric[] = [
  {
    id: "1",
    name: "Content Performance Score",
    value: 87.5,
    change: 5.2,
    changeType: "increase",
    timestamp: "2024-01-21T10:00:00Z",
    category: "content"
  },
  {
    id: "2",
    name: "Competitor Tracking Score",
    value: 92.1,
    change: 2.8,
    changeType: "increase",
    timestamp: "2024-01-21T10:00:00Z",
    category: "competitive"
  },
  {
    id: "3",
    name: "Social Engagement Rate",
    value: 4.3,
    change: -0.5,
    changeType: "decrease",
    timestamp: "2024-01-21T10:00:00Z",
    category: "social"
  },
  {
    id: "4",
    name: "SEO Visibility Index",
    value: 78.9,
    change: 3.1,
    changeType: "increase",
    timestamp: "2024-01-21T10:00:00Z",
    category: "seo"
  },
  {
    id: "5",
    name: "Market Share Growth",
    value: 12.4,
    change: 1.7,
    changeType: "increase",
    timestamp: "2024-01-21T10:00:00Z",
    category: "market"
  },
  {
    id: "6",
    name: "Content Velocity",
    value: 45,
    change: 0,
    changeType: "neutral",
    timestamp: "2024-01-21T10:00:00Z",
    category: "content"
  }
];

// Mock Chart Data for Dashboard
export const mockPerformanceData: ChartData[] = [
  { name: "Jan 1", value: 65, date: "2024-01-01" },
  { name: "Jan 5", value: 72, date: "2024-01-05" },
  { name: "Jan 10", value: 68, date: "2024-01-10" },
  { name: "Jan 15", value: 78, date: "2024-01-15" },
  { name: "Jan 20", value: 85, date: "2024-01-20" },
  { name: "Jan 21", value: 87, date: "2024-01-21" }
];

// Mock Recent Activities
export const mockRecentActivities = [
  {
    id: "1",
    user: mockUsers[0],
    action: "created project",
    target: "Q1 Content Strategy Analysis",
    timestamp: "2024-01-21T09:30:00Z",
    type: "project"
  },
  {
    id: "2", 
    user: mockUsers[1],
    action: "uploaded content",
    target: "Social Media Competitive Insights",
    timestamp: "2024-01-21T09:15:00Z",
    type: "content"
  },
  {
    id: "3",
    user: mockUsers[2],
    action: "added competitor",
    target: "TechCorp Solutions",
    timestamp: "2024-01-21T08:45:00Z",
    type: "competitor"
  },
  {
    id: "4",
    user: mockUsers[4],
    action: "completed analysis",
    target: "Video Content Analysis",
    timestamp: "2024-01-21T08:20:00Z",
    type: "analysis"
  },
  {
    id: "5",
    user: mockUsers[0],
    action: "shared report",
    target: "Competitor Analysis Report - Q4 2023",
    timestamp: "2024-01-20T17:30:00Z",
    type: "report"
  }
];