import React from 'react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: Array<{
    id: string;
    title: string;
    description: string;
    status: 'completed' | 'current' | 'upcoming';
  }>;
  onStepClick?: (stepId: string) => void;
}

export function StepIndicator({ steps, onStepClick }: StepIndicatorProps) {
  return (
    <nav className="flex items-center justify-center">
      <ol className="flex items-center space-x-2 md:space-x-4">
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-center">
            <button
              onClick={() => onStepClick?.(step.id)}
              className={cn(
                "flex items-center space-x-2 p-2 rounded-lg transition-colors",
                step.status === 'completed' && "text-green-600 hover:bg-green-50",
                step.status === 'current' && "text-blue-600 bg-blue-50",
                step.status === 'upcoming' && "text-gray-400",
                onStepClick && "cursor-pointer"
              )}
              disabled={step.status === 'upcoming'}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  step.status === 'completed' && "bg-green-100 text-green-600",
                  step.status === 'current' && "bg-blue-100 text-blue-600 ring-2 ring-blue-500",
                  step.status === 'upcoming' && "bg-gray-100 text-gray-400"
                )}
              >
                {step.status === 'completed' ? (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
            </button>
            {index < steps.length - 1 && (
              <div className="flex-1 h-px bg-gray-200 w-8 md:w-16" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}