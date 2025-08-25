
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AnalyticsPageTracker } from "./AnalyticsPageTracker";
import { MobileBottomNavigation } from "@/components/mobile/MobileNavigation";
import { useEnhancedMobileDetection } from "@/hooks/useEnhancedMobileDetection";
import { TeamSwitcher } from "@/components/team/TeamSwitcher";
import { LayoutErrorBoundary } from "./LayoutErrorBoundary";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isMobile } = useEnhancedMobileDetection();
  
  return (
    <LayoutErrorBoundary>
      <SidebarProvider defaultOpen={!isMobile}>
        <AnalyticsPageTracker />
        <div className="min-h-screen flex w-full gradient-mesh">
          {!isMobile && (
            <LayoutErrorBoundary>
              <AppSidebar />
            </LayoutErrorBoundary>
          )}
          
          <div className="flex-1 flex flex-col">
            <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 glass-card">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-8 w-8 hover:bg-primary/10 rounded-lg transition-colors" />
                <div className="h-6 w-px bg-border/60" />
              </div>
              
              <div className="flex items-center gap-4">
                {isMobile && (
                  <LayoutErrorBoundary>
                    <TeamSwitcher />
                  </LayoutErrorBoundary>
                )}
                <div className="hidden sm:block text-sm text-muted-foreground">
                  Welcome back to <span className="logo-contentlab font-medium">ContentLab Nexus</span>
                </div>
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-elegant">
                  <span className="text-primary-foreground font-medium text-sm">U</span>
                </div>
              </div>
            </header>
            
            <main className={cn(
              "flex-1 gradient-subtle min-h-0 overflow-auto",
              isMobile ? "p-4 pb-20" : "p-6"
            )}>
              <div className="max-w-7xl mx-auto">
                <LayoutErrorBoundary>
                  {children}
                </LayoutErrorBoundary>
              </div>
            </main>
          </div>
        </div>
        
        {/* Mobile bottom navigation */}
        <LayoutErrorBoundary>
          <MobileBottomNavigation />
        </LayoutErrorBoundary>
      </SidebarProvider>
    </LayoutErrorBoundary>
  );
}
