
import { NavLink, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp, 
  Target,
  Settings,
  Home,
  Sparkles,
  Activity,
  Building2
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { mockContentItems, mockUsers } from "@/data/mockData";
import { useMemo } from "react";

const settingsItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const sidebar = useSidebar();
  const collapsed = sidebar?.state === 'collapsed';
  const location = useLocation();
  const currentPath = location.pathname;

  // Memoize dynamic badge counts for performance
  const badgeCounts = useMemo(() => ({
    content: mockContentItems.length,
    team: mockUsers.length,
  }), []);

  const mainNavItems = [
    { 
      title: "Dashboard", 
      url: "/", 
      icon: Home,
      description: "Overview & insights",
      badge: null
    },
    { 
      title: "Projects", 
      url: "/projects", 
      icon: Building2,
      description: "Project management",
      badge: null
    },
    { 
      title: "Content", 
      url: "/content", 
      icon: FileText,
      description: "Content library",
      badge: { text: badgeCounts.content.toString(), variant: "default" as const }
    },
    { 
      title: "Analytics", 
      url: "/analytics", 
      icon: BarChart3,
      description: "Performance data",
      badge: null
    },
    { 
      title: "Competitive", 
      url: "/competitive", 
      icon: Target,
      description: "Competitor analysis",
      badge: null
    },
    { 
      title: "Team", 
      url: "/team", 
      icon: Users,
      description: "Team collaboration",
      badge: { text: badgeCounts.team.toString(), variant: "secondary" as const }
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const NavItem = ({ item }: { item: typeof mainNavItems[0] }) => {
    const content = (
      <NavLink 
        to={item.url} 
        end={item.url === "/"} 
        className={cn(
          "nav-item flex items-center justify-center gap-3 px-4 py-4 rounded-xl transition-all group interactive-lift",
          collapsed ? "w-10 h-10 p-0" : "min-h-[64px]",
          isActive(item.url)
            ? "gradient-primary text-primary-foreground shadow-elegant"
            : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary"
        )}
      >
        <div className={cn(
          "flex items-center gap-4 w-full",
          collapsed && "justify-center"
        )}>
          <item.icon className={cn(
            "h-5 w-5 flex-shrink-0",
            isActive(item.url) 
              ? 'text-primary-foreground' 
              : 'text-muted-foreground group-hover:text-primary'
          )} />
          {!collapsed && (
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm leading-tight">{item.title}</span>
                {item.badge && (
                  <Badge variant={item.badge.variant} className="text-xs flex-shrink-0 z-10">
                    {item.badge.text}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-xs leading-relaxed",
                isActive(item.url) 
                  ? 'text-primary-foreground/80' 
                  : 'text-muted-foreground'
              )}>
                {item.description}
              </span>
            </div>
          )}
        </div>
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            <div className="text-sm">{item.title}</div>
            <div className="text-xs text-muted-foreground">{item.description}</div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const SettingsNavItem = ({ item }: { item: typeof settingsItems[0] }) => {
    const content = (
      <NavLink 
        to={item.url} 
        className={cn(
          "nav-item flex items-center justify-center gap-3 px-3 py-3 rounded-xl transition-all group interactive-lift z-10",
          collapsed ? "w-10 h-10 p-0" : "",
          isActive(item.url)
            ? "gradient-primary text-primary-foreground shadow-elegant"
            : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary"
        )}
      >
        <item.icon className={cn(
          "h-5 w-5",
          isActive(item.url) 
            ? 'text-primary-foreground' 
            : 'text-muted-foreground group-hover:text-primary'
        )} />
        {!collapsed && <span className="font-medium text-sm">{item.title}</span>}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar className={cn(
        "border-r border-sidebar-border bg-sidebar transition-all duration-300 z-40",
        collapsed ? "w-14" : "w-64"
      )}>
        <SidebarHeader className={cn(
          "border-b border-sidebar-border/50 transition-all duration-300",
          collapsed ? "p-2" : "p-6"
        )}>
          <div className="flex items-center gap-3">
            {!collapsed && (
              <>
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-elegant">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="logo-contentlab text-xl font-bold">CONTENTLAB</h2>
                  <p className="text-xs text-sidebar-foreground/60">Nexus Platform</p>
                </div>
              </>
            )}
            {collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center mx-auto shadow-elegant cursor-pointer">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  <div className="text-sm">CONTENTLAB</div>
                  <div className="text-xs text-muted-foreground">Nexus Platform</div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className={cn(
            "transition-all duration-300",
            collapsed ? "px-2" : "px-4"
          )}>
            <SidebarGroupContent>
              <SidebarMenu className={cn(
                "transition-all duration-300",
                collapsed ? "space-y-2" : "space-y-3"
              )}>
                {mainNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavItem item={item} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Quick Stats - only show when expanded */}
          {!collapsed && (
            <div className="p-4 mt-auto border-t border-sidebar-border/50">
              <div className="glass-card p-4 rounded-xl">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Quick Stats
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Competitors</span>
                    <span className="font-medium">24</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Alerts</span>
                    <span className="font-medium text-warning">8</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Performance</span>
                    <span className="font-medium text-success">+12%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <SidebarGroup className={cn(
            "mt-4 transition-all duration-300",
            collapsed ? "px-2" : "px-4"
          )}>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <SettingsNavItem item={item} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}
