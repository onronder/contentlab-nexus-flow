import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumbs component for navigation hierarchy
 * Automatically generates breadcrumbs from current route if no items provided
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  const location = useLocation();

  // Auto-generate breadcrumbs from current route if no items provided
  const breadcrumbItems = items || generateBreadcrumbsFromRoute(location.pathname);

  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumbs for single-level routes
  }

  return (
    <nav 
      className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />
              )}
              
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              ) : (
                <span 
                  className={cn(
                    "flex items-center gap-1",
                    isLast && "text-foreground font-medium"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/**
 * Generate breadcrumbs from route path
 */
function generateBreadcrumbsFromRoute(pathname: string): BreadcrumbItem[] {
  const pathSegments = pathname.split('/').filter(Boolean);
  
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: 'Home',
      href: '/',
      icon: Home
    }
  ];

  // Route-specific breadcrumb mapping
  const routeMapping: Record<string, string> = {
    'profile': 'Profile',
    'settings': 'Settings',
    'projects': 'Projects',
    'content': 'Content',
    'analytics': 'Analytics',
    'team': 'Team',
    'competitive': 'Competitive Analysis'
  };

  let currentPath = '';
  
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    
    breadcrumbs.push({
      label: routeMapping[segment] || capitalizeFirst(segment),
      href: isLast ? undefined : currentPath
    });
  });

  return breadcrumbs;
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}