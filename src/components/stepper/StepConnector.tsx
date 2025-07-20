import { cn } from "@/lib/utils";

interface StepConnectorProps {
  isCompleted?: boolean;
  className?: string;
}

export const StepConnector = ({ isCompleted = false, className }: StepConnectorProps) => (
  <div className={cn(
    "h-px bg-muted-foreground/30 flex-1 mx-4 mt-5 transition-elegant",
    isCompleted && "bg-gradient-primary shadow-glow",
    className
  )} />
);