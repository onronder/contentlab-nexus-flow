
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={true} collapsible="icon">
      <div className="min-h-screen flex w-full gradient-mesh">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 glass-card">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-8 w-8 hover:bg-primary/10 rounded-lg transition-colors" />
              <div className="h-6 w-px bg-border/60" />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-sm text-muted-foreground">
                Welcome back to <span className="logo-contentlab font-medium">ContentLab Nexus</span>
              </div>
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-elegant">
                <span className="text-primary-foreground font-medium text-sm">U</span>
              </div>
            </div>
          </header>
          
          <main className="flex-1 p-6 gradient-subtle min-h-0 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
