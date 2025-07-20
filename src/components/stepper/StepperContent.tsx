import { cn } from "@/lib/utils";

interface StepperContentProps {
  children: React.ReactNode;
  className?: string;
}

export const StepperContent = ({ children, className }: StepperContentProps) => (
  <div className={cn("stepper-content animate-fade-in", className)}>
    {children}
  </div>
);