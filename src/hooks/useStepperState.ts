import { useState, useCallback } from 'react';

interface StepperState<T = any> {
  currentStep: number;
  totalSteps: number;
  formData: T;
  validation: Record<number, { isValid: boolean; errors: Record<string, string> }>;
  isSubmitting: boolean;
  canNavigate: boolean[];
}

export const useStepperState = <T>(initialData: T, totalSteps: number) => {
  const [state, setState] = useState<StepperState<T>>({
    currentStep: 1,
    totalSteps,
    formData: initialData,
    validation: {},
    isSubmitting: false,
    canNavigate: new Array(totalSteps).fill(false),
  });

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setState(prev => ({ ...prev, currentStep: step }));
    }
  }, [totalSteps]);

  const nextStep = useCallback(() => {
    if (state.currentStep < totalSteps && state.canNavigate[state.currentStep - 1]) {
      goToStep(state.currentStep + 1);
    }
  }, [state.currentStep, state.canNavigate, totalSteps, goToStep]);

  const prevStep = useCallback(() => {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1);
    }
  }, [state.currentStep, goToStep]);

  const updateFormData = useCallback((updates: Partial<T>) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...updates }
    }));
  }, []);

  const setStepValidation = useCallback((step: number, isValid: boolean, errors: Record<string, string> = {}) => {
    setState(prev => ({
      ...prev,
      validation: { ...prev.validation, [step]: { isValid, errors } },
      canNavigate: prev.canNavigate.map((nav, index) => 
        index === step - 1 ? isValid : nav
      )
    }));
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setState(prev => ({ ...prev, isSubmitting }));
  }, []);

  return {
    ...state,
    goToStep,
    nextStep,
    prevStep,
    updateFormData,
    setStepValidation,
    setSubmitting,
    isCurrentStepValid: state.canNavigate[state.currentStep - 1] || false,
    currentStepErrors: state.validation[state.currentStep]?.errors || {},
  };
};