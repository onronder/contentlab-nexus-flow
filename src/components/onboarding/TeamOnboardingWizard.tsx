import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, ArrowLeft, Users, Rocket, Settings, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { WelcomeStep } from './steps/WelcomeStep';
import { TeamOverviewStep } from './steps/TeamOverviewStep';
import { RoleIntroductionStep } from './steps/RoleIntroductionStep';
import { PlatformTourStep } from './steps/PlatformTourStep';
import { SetupCompleteStep } from './steps/SetupCompleteStep';

export interface OnboardingStepData {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional: boolean;
  icon: React.ElementType;
}

const ONBOARDING_STEPS: OnboardingStepData[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Get acquainted with your new team',
    completed: false,
    optional: false,
    icon: Users
  },
  {
    id: 'team-overview',
    title: 'Team Overview',
    description: 'Learn about team structure and members',
    completed: false,
    optional: false,
    icon: Users
  },
  {
    id: 'role-introduction',
    title: 'Your Role',
    description: 'Understand your permissions and responsibilities',
    completed: false,
    optional: false,
    icon: Settings
  },
  {
    id: 'platform-tour',
    title: 'Platform Tour',
    description: 'Discover key features and navigation',
    completed: false,
    optional: true,
    icon: BookOpen
  },
  {
    id: 'setup-complete',
    title: 'Get Started',
    description: 'Ready to start collaborating!',
    completed: false,
    optional: false,
    icon: Rocket
  }
];

export function TeamOnboardingWizard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(ONBOARDING_STEPS);
  const [isSkipping, setIsSkipping] = useState(false);

  const teamId = searchParams.get('teamId');
  const invitationId = searchParams.get('invitationId');

  useEffect(() => {
    // Load onboarding progress from localStorage or user metadata
    const savedProgress = localStorage.getItem(`onboarding_progress_${user?.id}`);
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        setSteps(progress.steps || ONBOARDING_STEPS);
        setCurrentStep(progress.currentStep || 0);
      } catch (error) {
        console.error('Error loading onboarding progress:', error);
      }
    }
  }, [user?.id]);

  const saveProgress = (newSteps: OnboardingStepData[], newCurrentStep: number) => {
    const progress = {
      steps: newSteps,
      currentStep: newCurrentStep,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(`onboarding_progress_${user?.id}`, JSON.stringify(progress));
  };

  const markStepCompleted = (stepIndex: number) => {
    const newSteps = [...steps];
    newSteps[stepIndex].completed = true;
    setSteps(newSteps);
    saveProgress(newSteps, currentStep);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      markStepCompleted(currentStep);
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveProgress(steps, nextStep);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsSkipping(true);
    // Mark optional steps as completed if skipping
    const newSteps = steps.map((step, index) => ({
      ...step,
      completed: step.optional ? true : step.completed
    }));
    setSteps(newSteps);
    saveProgress(newSteps, steps.length - 1);
    setCurrentStep(steps.length - 1);
    setIsSkipping(false);
  };

  const handleComplete = () => {
    // Mark all steps as completed
    const completedSteps = steps.map(step => ({ ...step, completed: true }));
    setSteps(completedSteps);
    
    // Clear onboarding progress
    localStorage.removeItem(`onboarding_progress_${user?.id}`);
    
    // Navigate to dashboard or team page
    navigate(teamId ? `/team?id=${teamId}` : '/dashboard');
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];

  const renderCurrentStep = () => {
    const commonProps = {
      teamId: teamId || '',
      invitationId: invitationId || '',
      onNext: handleNext,
      onComplete: handleComplete
    };

    switch (currentStepData.id) {
      case 'welcome':
        return <WelcomeStep {...commonProps} />;
      case 'team-overview':
        return <TeamOverviewStep {...commonProps} />;
      case 'role-introduction':
        return <RoleIntroductionStep {...commonProps} />;
      case 'platform-tour':
        return <PlatformTourStep {...commonProps} />;
      case 'setup-complete':
        return <SetupCompleteStep {...commonProps} />;
      default:
        return <WelcomeStep {...commonProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to Your Team!
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Let's get you set up and familiar with your new workspace. This quick tour will help you understand your role and get started.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = step.completed;
              const isPast = index < currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center relative">
                  {index < steps.length - 1 && (
                    <div className={`absolute top-6 left-full w-full h-0.5 ${
                      isPast || isCompleted ? 'bg-primary' : 'bg-muted'
                    }`} style={{ width: 'calc(100% - 2rem)' }} />
                  )}
                  
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                    isCompleted 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : isActive
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background border-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  
                  <div className="mt-2 text-center max-w-24">
                    <h3 className={`text-sm font-medium ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </h3>
                    {step.optional && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Optional
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <currentStepData.icon className="h-6 w-6 text-primary" />
                {currentStepData.title}
              </CardTitle>
              <p className="text-muted-foreground">
                {currentStepData.description}
              </p>
            </CardHeader>
            <CardContent>
              {renderCurrentStep()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex gap-3">
              {currentStepData.optional && currentStep < steps.length - 1 && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isSkipping}
                  className="flex items-center gap-2"
                >
                  Skip Optional Steps
                </Button>
              )}

              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  className="flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  className="flex items-center gap-2"
                >
                  Complete Setup
                  <Rocket className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}