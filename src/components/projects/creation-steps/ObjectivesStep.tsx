import React, { useState } from 'react';
import { ProjectCreationInput } from '@/types/projects';
import { ValidationError } from '@/utils/projectValidation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

interface ObjectivesStepProps {
  formData: ProjectCreationInput;
  validationErrors: ValidationError[];
  onChange: (updates: Partial<ProjectCreationInput>) => void;
}

const SUGGESTED_OBJECTIVES = [
  'Identify main competitors and their market positioning',
  'Analyze competitor pricing strategies and models',
  'Evaluate competitor product features and differentiators',
  'Monitor competitor marketing and messaging strategies',
  'Track competitor technology and innovation trends',
  'Assess competitor customer sentiment and reviews',
  'Identify market gaps and opportunities',
  'Benchmark performance against industry leaders'
];

const SUGGESTED_METRICS = [
  'Market share percentage',
  'Customer acquisition cost comparison',
  'Price competitiveness ratio',
  'Feature completeness score',
  'Customer satisfaction ratings',
  'Social media engagement rates',
  'Website traffic and conversion rates',
  'Product release frequency'
];

export function ObjectivesStep({ formData, validationErrors, onChange }: ObjectivesStepProps) {
  const [newObjective, setNewObjective] = useState('');
  const [newMetric, setNewMetric] = useState('');

  const getFieldError = (fieldName: string): string | undefined => {
    return validationErrors.find(error => error.field === fieldName)?.message;
  };

  const addObjective = (objective?: string) => {
    const objectiveText = objective || newObjective.trim();
    if (objectiveText && !formData.primaryObjectives.includes(objectiveText)) {
      onChange({
        primaryObjectives: [...formData.primaryObjectives, objectiveText]
      });
      setNewObjective('');
    }
  };

  const removeObjective = (index: number) => {
    const updatedObjectives = formData.primaryObjectives.filter((_, i) => i !== index);
    onChange({ primaryObjectives: updatedObjectives });
  };

  const addMetric = (metric?: string) => {
    const metricText = metric || newMetric.trim();
    if (metricText && !formData.successMetrics.includes(metricText)) {
      onChange({
        successMetrics: [...formData.successMetrics, metricText]
      });
      setNewMetric('');
    }
  };

  const removeMetric = (index: number) => {
    const updatedMetrics = formData.successMetrics.filter((_, i) => i !== index);
    onChange({ successMetrics: updatedMetrics });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Objectives & Success Metrics
        </h2>
        <p className="text-gray-600">
          Define what you want to achieve with this competitive intelligence project.
        </p>
      </div>

      {/* Primary Objectives */}
      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Objectives *
          </Label>
          <p className="text-sm text-gray-600 mb-4">
            What specific goals do you want to accomplish? Add at least one objective.
          </p>
        </div>

        {/* Add new objective */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter a project objective"
            value={newObjective}
            onChange={(e) => setNewObjective(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addObjective()}
            maxLength={500}
          />
          <Button
            type="button"
            onClick={() => addObjective()}
            disabled={!newObjective.trim()}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Current objectives */}
        {formData.primaryObjectives.length > 0 && (
          <div className="space-y-2">
            {formData.primaryObjectives.map((objective, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{objective}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeObjective(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Suggested objectives */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Suggested Objectives
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SUGGESTED_OBJECTIVES.map((suggestion, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addObjective(suggestion)}
                disabled={formData.primaryObjectives.includes(suggestion)}
                className="justify-start text-left h-auto p-3 whitespace-normal"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        {getFieldError('primaryObjectives') && (
          <p className="text-sm text-red-600">{getFieldError('primaryObjectives')}</p>
        )}
      </div>

      {/* Success Metrics */}
      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Success Metrics
          </Label>
          <p className="text-sm text-gray-600 mb-4">
            How will you measure the success of this project? Define key performance indicators.
          </p>
        </div>

        {/* Add new metric */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter a success metric"
            value={newMetric}
            onChange={(e) => setNewMetric(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addMetric()}
            maxLength={200}
          />
          <Button
            type="button"
            onClick={() => addMetric()}
            disabled={!newMetric.trim()}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Current metrics */}
        {formData.successMetrics.length > 0 && (
          <div className="space-y-2">
            {formData.successMetrics.map((metric, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{metric}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMetric(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Suggested metrics */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Suggested Metrics
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SUGGESTED_METRICS.map((suggestion, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addMetric(suggestion)}
                disabled={formData.successMetrics.includes(suggestion)}
                className="justify-start text-left h-auto p-3 whitespace-normal"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        {getFieldError('successMetrics') && (
          <p className="text-sm text-red-600">{getFieldError('successMetrics')}</p>
        )}
      </div>
    </div>
  );
}