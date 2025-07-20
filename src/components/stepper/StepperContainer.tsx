import { cn } from "@/lib/utils";

interface StepperContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const StepperContainer = ({ children, className }: StepperContainerProps) => (
  <div className={cn("stepper-container max-w-4xl mx-auto p-6 space-y-8", className)}>
    {children}
  </div>
);