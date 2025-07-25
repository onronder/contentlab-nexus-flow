// Complete UI Component Export List
// Copy these files to your src/components/ui/ directory

export const UI_COMPONENTS = [
  // Core Components
  'accordion.tsx',
  'alert-dialog.tsx', 
  'alert.tsx',
  'aspect-ratio.tsx',
  'avatar.tsx',
  'badge.tsx',
  'breadcrumb.tsx',
  'button.tsx',
  'calendar.tsx',
  'card.tsx',
  'carousel.tsx',
  'chart.tsx',
  'checkbox.tsx',
  'collapsible.tsx',
  'command.tsx',
  'context-menu.tsx',
  'dialog.tsx',
  'drawer.tsx',
  'dropdown-menu.tsx',
  'form.tsx',
  'hover-card.tsx',
  'input.tsx',
  'input-otp.tsx',
  'label.tsx',
  'menubar.tsx',
  'navigation-menu.tsx',
  'pagination.tsx',
  'popover.tsx',
  'progress.tsx',
  'radio-group.tsx',
  'resizable.tsx',
  'scroll-area.tsx',
  'select.tsx',
  'separator.tsx',
  'sheet.tsx',
  'sidebar.tsx',
  'skeleton.tsx',
  'slider.tsx',
  'sonner.tsx',
  'switch.tsx',
  'table.tsx',
  'tabs.tsx',
  'textarea.tsx',
  'toast.tsx',
  'toaster.tsx',
  'toggle.tsx',
  'toggle-group.tsx',
  'tooltip.tsx',
  
  // Custom Components
  'access-denied.tsx',
  'accessible-button.tsx',
  'accessible-card.tsx',
  'error-alert.tsx',
  'loading-skeletons.tsx',
  'loading-spinner.tsx',
  'logout-button.tsx',
  'skip-links.tsx',
  'step-indicator.tsx',
  'use-toast.ts'
];

// Layout Components
export const LAYOUT_COMPONENTS = [
  'Layout.tsx',
  'AppSidebar.tsx',
  'AppLayout.tsx',
  'AuthLayout.tsx'
];

// Hook Files
export const HOOK_FILES = [
  'use-mobile.tsx',
  'use-toast.ts'
];

// Key Variant Examples
export const BUTTON_VARIANTS = {
  default: "gradient-primary text-primary-foreground shadow-elegant hover:shadow-glow",
  hero: "gradient-hero text-primary-foreground shadow-glow hover:shadow-elegant",
  glass: "glass-card text-foreground hover:bg-muted/10 shadow-glass",
  premium: "gradient-primary-intense text-primary-foreground shadow-glow",
  outline: "border-2 border-border bg-background/80 hover:bg-primary/5",
  ghost: "hover:bg-muted/50 hover:text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-glow",
  secondary: "gradient-secondary text-secondary-foreground hover:opacity-90",
  success: "bg-success text-success-foreground hover:bg-success-glow"
};

export const CARD_VARIANTS = {
  default: "rounded-xl border bg-card text-card-foreground shadow-card",
  glass: "glass-card rounded-xl",
  elegant: "rounded-xl border bg-card shadow-elegant",
  interactive: "rounded-xl border bg-card hover:shadow-card-hover interactive-lift"
};

// Color Palette Reference
export const COLOR_PALETTE = {
  primary: "hsl(200 98% 39%)",
  primaryVariant: "hsl(210 98% 55%)", 
  primaryGlow: "hsl(200 98% 65%)",
  success: "hsl(120 60% 40%)",
  warning: "hsl(45 93% 47%)",
  destructive: "hsl(0 62.8% 30.6%)",
  info: "hsl(200 98% 39%)"
};

export const GRADIENTS = {
  primary: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-variant)))",
  hero: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))",
  mesh: "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%)",
  text: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-variant)))"
};