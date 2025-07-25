import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "gradient-primary text-primary-foreground shadow-elegant hover:shadow-glow hover:scale-[1.02] border border-primary/20",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive-glow shadow-elegant hover:shadow-glow hover:scale-[1.02]",
        outline:
          "border-2 border-border bg-background/80 hover:bg-primary/5 hover:text-primary hover:border-primary/70 backdrop-blur-sm",
        secondary:
          "gradient-secondary text-secondary-foreground hover:opacity-90 shadow-card hover:shadow-card-hover hover:scale-[1.02]",
        ghost: "hover:bg-muted/50 hover:text-foreground transition-colors",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-variant",
        hero: "gradient-hero text-primary-foreground shadow-glow hover:shadow-elegant hover:scale-[1.02] border border-white/20 backdrop-blur-sm",
        success: "bg-success text-success-foreground hover:bg-success-glow shadow-elegant hover:shadow-glow hover:scale-[1.02]",
        premium: "gradient-primary-intense text-primary-foreground shadow-glow hover:shadow-elegant hover:scale-[1.02] border border-primary/30",
        glass: "glass-card text-foreground hover:bg-muted/10 shadow-glass hover:scale-[1.02]",
        gradient: "gradient-hero text-primary-foreground shadow-glow hover:opacity-90 hover:scale-[1.02] border border-white/10",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-sm",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
        xl: "h-14 rounded-2xl px-10 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
