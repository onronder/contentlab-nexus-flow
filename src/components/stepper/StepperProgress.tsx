import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StepperProgressProps {
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
  className?: string;
}

export const StepperProgress = ({ 
  currentStep, 
  totalSteps, 
  children, 
  className 
}: StepperProgressProps) => (
  <div className={cn("stepper-progress", className)}>
    <div className="flex items-center justify-between mb-6">
      {children}
    </div>
    <div className="space-y-2">
      <Progress 
        value={(currentStep / totalSteps) * 100} 
        className="h-2 bg-gradient-primary shadow-glow"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
      </div>
    </div>
  </div>
);