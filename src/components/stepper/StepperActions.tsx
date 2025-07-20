import { cn } from "@/lib/utils";

interface StepperActionsProps {
  children: React.ReactNode;
  className?: string;
}

export const StepperActions = ({ children, className }: StepperActionsProps) => (
  <div className={cn(
    "flex items-center justify-between gap-4 pt-6 border-t border-border",
    className
  )}>
    {children}
  </div>
);