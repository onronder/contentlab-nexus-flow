import { NavLink, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp, 
  Target,
  Settings,
  Home,
  Crown,
  Sparkles,
  Activity,
  Building2
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
    badge: { text: "12", variant: "default" as const }
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
    featured: true,
    description: "Competitor analysis",
    badge: { text: "New", variant: "secondary" as const }
  },
  { 
    title: "Team", 
    url: "/team", 
    icon: Users,
    description: "Team collaboration",
    badge: null
  },
];

const settingsItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const sidebar = useSidebar();
  const collapsed = sidebar?.state === 'collapsed';
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => cn(
    "transition-elegant group",
    isActive(path) 
      ? "bg-primary text-primary-foreground shadow-glow" 
      : "hover:bg-accent hover:text-accent-foreground"
  );

  return (
    <Sidebar className={cn(
      "border-r border-sidebar-border bg-sidebar transition-all duration-300",
      collapsed ? "w-14" : "w-64"
    )}>
      <SidebarHeader className="p-6 border-b border-sidebar-border/50">
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
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center mx-auto shadow-elegant">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-4">
          <SidebarGroupLabel className={cn(
            "text-sidebar-foreground/70 font-medium mb-2 flex items-center gap-2",
            collapsed && "justify-center"
          )}>
            <Activity className="h-4 w-4" />
            {!collapsed && "Main Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-3">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"} 
                      className={cn(
                        "nav-item flex items-center justify-between gap-3 px-4 py-4 rounded-xl transition-all group interactive-lift",
                        isActive(item.url)
                          ? "gradient-primary text-primary-foreground shadow-elegant"
                          : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn(
                          "h-5 w-5",
                          isActive(item.url) 
                            ? 'text-primary-foreground' 
                            : 'text-muted-foreground group-hover:text-primary'
                        )} />
                        {!collapsed && (
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{item.title}</span>
                            <span className={cn(
                              "text-xs",
                              isActive(item.url) 
                                ? 'text-primary-foreground/80' 
                                : 'text-muted-foreground'
                            )}>
                              {item.description}
                            </span>
                          </div>
                        )}
                      </div>
                      {!collapsed && (item.badge || item.featured) && (
                        <div className="flex gap-1">
                          {item.featured && (
                            <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">
                              Featured
                            </Badge>
                          )}
                          {item.badge && (
                            <Badge variant={item.badge.variant} className="text-xs">
                              {item.badge.text}
                            </Badge>
                          )}
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Stats */}
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

        <SidebarGroup className="mt-4 px-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={cn(
                        "nav-item flex items-center gap-3 px-3 py-3 rounded-xl transition-all group interactive-lift",
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
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}