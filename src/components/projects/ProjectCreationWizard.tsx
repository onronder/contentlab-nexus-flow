import React, { useState } from 'react';
import { ProjectCreationInput, PROJECT_TYPES } from '@/types/projects';
import { validateProjectCreation } from '@/utils/projectValidation';
import { BasicInfoStep } from './creation-steps/BasicInfoStep';
import { ObjectivesStep } from './creation-steps/ObjectivesStep';
import { ConfigurationStep } from './creation-steps/ConfigurationStep';
import { ReviewStep } from './creation-steps/ReviewStep';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Button } from '@/components/ui/button';
import { ValidationError } from '@/utils/projectValidation';

type CreationStep = 'basic_info' | 'objectives' | 'configuration' | 'review';

interface ProjectCreationWizardProps {
  onProjectCreated: (projectData: ProjectCreationInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ProjectCreationWizard({ 
  onProjectCreated, 
  onCancel, 
  isSubmitting = false 
}: ProjectCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<CreationStep>('basic_info');
  const [formData, setFormData] = useState<ProjectCreationInput>({
    name: '',
    description: '',
    industry: '',
    projectType: 'competitive_analysis',
    targetMarket: '',
    primaryObjectives: [],
    successMetrics: [],
    isPublic: false,
    allowTeamAccess: true,
    autoAnalysisEnabled: true,
    notificationSettings: {
      email: true,
      inApp: true,
      frequency: 'daily'
    },
    customFields: {},
    tags: []
  });
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const steps: Array<{key: CreationStep, title: string, description: string}> = [
    {
      key: 'basic_info',
      title: 'Basic Information',
      description: 'Project name, industry, and type'
    },
    {
      key: 'objectives',
      title: 'Objectives & Goals',
      description: 'Define success metrics and objectives'
    },
    {
      key: 'configuration',
      title: 'Configuration',
      description: 'Settings and preferences'
    },
    {
      key: 'review',
      title: 'Review & Create',
      description: 'Review and finalize project'
    }
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  const handleFormDataChange = (updates: Partial<ProjectCreationInput>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
    
    // Clear validation errors when user makes changes
    setValidationErrors([]);
  };

  const validateCurrentStep = (): boolean => {
    const validation = validateProjectCreation(formData);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return false;
    }
    
    setValidationErrors([]);
    return true;
  };

  const handleNext = () => {
    if (currentStep === 'review') {
      handleSubmit();
      return;
    }

    if (validateCurrentStep()) {
      const nextStepIndex = currentStepIndex + 1;
      if (nextStepIndex < steps.length) {
        setCurrentStep(steps[nextStepIndex].key);
      }
    }
  };

  const handlePrevious = () => {
    const prevStepIndex = currentStepIndex - 1;
    if (prevStepIndex >= 0) {
      setCurrentStep(steps[prevStepIndex].key);
    }
  };

  const handleStepClick = (stepKey: string) => {
    const targetIndex = steps.findIndex(step => step.key === stepKey);
    const currentIndex = currentStepIndex;
    
    // Allow going back to previous steps
    if (targetIndex <= currentIndex) {
      setCurrentStep(stepKey as CreationStep);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    try {
      await onProjectCreated(formData);
    } catch (error) {
      console.error('Error in project creation:', error);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'basic_info':
        return !!(formData.name && formData.industry && formData.projectType);
      case 'objectives':
        return formData.primaryObjectives.length > 0;
      case 'configuration':
        return true; // Configuration step is optional
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="project-creation-wizard">
      {/* Step Indicator */}
      <div className="mb-8">
        <StepIndicator
          steps={steps.map(step => ({
            id: step.key,
            title: step.title,
            description: step.description,
            status: step.key === currentStep ? 'current' : 
                   steps.findIndex(s => s.key === step.key) < currentStepIndex ? 'completed' : 'upcoming'
          }))}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Step Content */}
      <div className="step-content mb-8">
        {currentStep === 'basic_info' && (
          <BasicInfoStep
            formData={formData}
            validationErrors={validationErrors}
            onChange={handleFormDataChange}
          />
        )}

        {currentStep === 'objectives' && (
          <ObjectivesStep
            formData={formData}
            validationErrors={validationErrors}
            onChange={handleFormDataChange}
          />
        )}

        {currentStep === 'configuration' && (
          <ConfigurationStep
            formData={formData}
            validationErrors={validationErrors}
            onChange={handleFormDataChange}
          />
        )}

        {currentStep === 'review' && (
          <ReviewStep
            formData={formData}
            validationErrors={validationErrors}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <div>
          {currentStepIndex > 0 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isSubmitting}
            >
              Previous
            </Button>
          )}
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : currentStep === 'review' ? (
              'Create Project'
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            Please fix the following errors:
          </h4>
          <ul className="text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}