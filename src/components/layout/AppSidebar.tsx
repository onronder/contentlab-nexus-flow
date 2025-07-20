import { NavLink, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp, 
  Target,
  Settings,
  Home,
  Crown
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
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Projects", url: "/projects", icon: FileText },
  { title: "Content", url: "/content", icon: FileText },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Competitive", url: "/competitive", icon: Target, featured: true },
  { title: "Team", url: "/team", icon: Users },
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
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          {!collapsed && (
            <>
              <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                <Crown className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-sidebar-foreground text-lg">ContentLab</h2>
                <p className="text-xs text-sidebar-foreground/60">Nexus</p>
              </div>
            </>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center mx-auto">
              <Crown className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "text-sidebar-foreground/70 font-semibold",
            collapsed && "sr-only"
          )}>
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"} 
                      className={getNavClassName(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <div className="flex items-center justify-between flex-1">
                          <span>{item.title}</span>
                          {item.featured && (
                            <Badge variant="secondary" className="ml-2 text-xs bg-primary/20 text-primary border-primary/30">
                              Featured
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

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className={cn(
            "text-sidebar-foreground/70 font-semibold",
            collapsed && "sr-only"
          )}>
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClassName(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
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