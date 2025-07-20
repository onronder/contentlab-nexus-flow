import { Check, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  step?: number;
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isCompleted?: boolean;
  className?: string;
}

export const StepIndicator = ({ 
  icon: Icon, 
  label, 
  isActive = false, 
  isCompleted = false,
  className 
}: StepIndicatorProps) => (
  <div className={cn("flex flex-col items-center space-y-2", className)}>
    <div className={cn(
      "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-elegant duration-200",
      isCompleted && "bg-primary border-primary text-primary-foreground shadow-glow",
      isActive && !isCompleted && "border-primary text-primary bg-gradient-hero/10 shadow-elegant",
      !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
    )}>
      {isCompleted ? (
        <Check className="h-5 w-5" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
    </div>
    <span className={cn(
      "text-sm font-medium transition-elegant text-center",
      isActive && "text-primary",
      isCompleted && "text-primary",
      !isActive && !isCompleted && "text-muted-foreground"
    )}>
      {label}
    </span>
  </div>
);