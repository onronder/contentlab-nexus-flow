import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useUser, useSupabaseClient, useSession } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

import {
  User,
  Settings,
  LogOut,
  Menu,
  Home,
  FolderOpen,
  FileText,
  BarChart3,
  Users,
  Trophy,
  Shield,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requireAuth?: boolean;
  description?: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/projects',
    icon: Home,
    requireAuth: true,
    description: 'Project overview and management'
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderOpen,
    requireAuth: true,
    description: 'Manage your projects'
  },
  {
    name: 'Content',
    href: '/content',
    icon: FileText,
    requireAuth: true,
    description: 'Content management'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    requireAuth: true,
    description: 'Performance insights'
  },
  {
    name: 'Team',
    href: '/team',
    icon: Users,
    requireAuth: true,
    description: 'Team collaboration'
  },
  {
    name: 'Competitive',
    href: '/competitive',
    icon: Trophy,
    requireAuth: true,
    description: 'Competitive analysis'
  }
];

interface AppNavigationProps {
  className?: string;
}

export const AppNavigation: React.FC<AppNavigationProps> = ({ className }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useUser();
  const session = useSession();
  const supabase = useSupabaseClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isAuthenticated = !!user;

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error signing out",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Successfully signed out!",
    });
    navigate('/');
  };


  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const visibleNavigationItems = navigationItems.filter(item => 
    !item.requireAuth || isAuthenticated
  );

  const NavigationList = ({ mobile = false, onItemClick }: { mobile?: boolean; onItemClick?: () => void }) => (
    <nav className={cn("space-y-1", mobile && "px-4")}>
      {visibleNavigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = isActiveRoute(item.href);
        
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground font-medium",
              mobile && "text-base"
            )}
          >
            <Icon className={cn("h-4 w-4", mobile && "h-5 w-5")} />
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
              {mobile && item.description && (
                <div className="text-xs text-muted-foreground">{item.description}</div>
              )}
            </div>
            {mobile && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </Link>
        );
      })}
    </nav>
  );

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={profile?.avatar_url || undefined} 
              alt={profile?.full_name || 'User'} 
            />
            <AvatarFallback className="text-sm">
              {getInitials(profile?.full_name || 'User')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/security" className="cursor-pointer">
            <Shield className="mr-2 h-4 w-4" />
            <span>Security</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => {
            signOut();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const AuthButtons = () => (
    <div className="flex items-center gap-2">
      <Button variant="ghost" asChild>
        <Link to="/login">Sign in</Link>
      </Button>
      <Button asChild>
        <Link to="/signup">Sign up</Link>
      </Button>
    </div>
  );

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <div className="mr-6">
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <span className="hidden sm:inline-block font-bold text-xl">App</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1">
          <NavigationList />
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          
          {/* Mobile menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="md:hidden h-10 w-10 p-0"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="flex items-center gap-2 px-4 py-6 border-b">
                  <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">A</span>
                  </div>
                  <span className="font-bold text-xl">App</span>
                </div>

                {/* Navigation */}
                <div className="flex-1 py-6">
                  <NavigationList 
                    mobile 
                    onItemClick={() => setMobileMenuOpen(false)} 
                  />
                </div>

                {/* Mobile auth section */}
                <div className="border-t p-4">
                  {isAuthenticated ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent">
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={profile?.avatar_url || undefined} 
                            alt={profile?.full_name || 'User'} 
                          />
                          <AvatarFallback className="text-sm">
                            {getInitials(profile?.full_name || 'User')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium leading-none">
                            {profile?.full_name || 'User'}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground mt-1">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start"
                          asChild
                        >
                          <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                            <User className="mr-2 h-4 w-4" />
                            Profile
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start"
                          asChild
                        >
                          <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start"
                          asChild
                        >
                          <Link to="/security" onClick={() => setMobileMenuOpen(false)}>
                            <Shield className="mr-2 h-4 w-4" />
                            Security
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          onClick={() => {
                            signOut();
                            setMobileMenuOpen(false);
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign out
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button 
                        className="w-full" 
                        asChild
                      >
                        <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                          Sign up
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        asChild
                      >
                        <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                          Sign in
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop auth */}
          <div className="hidden md:flex">
            {isAuthenticated ? <UserMenu /> : <AuthButtons />}
          </div>
        </div>
      </div>
    </header>
  );
};