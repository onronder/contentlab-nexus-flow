import React, { useState, useEffect } from 'react';
import { ProjectCreationInput, PROJECT_TYPES } from '@/types/projects';
import { ValidationError } from '@/utils/projectValidation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BasicInfoStepProps {
  formData: ProjectCreationInput;
  validationErrors: ValidationError[];
  onChange: (updates: Partial<ProjectCreationInput>) => void;
}

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing',
  'Education', 'Real Estate', 'Automotive', 'Energy', 'Media',
  'Telecommunications', 'Transportation', 'Food & Beverage',
  'Fashion', 'Sports', 'Travel', 'Gaming', 'Consulting'
];

export function BasicInfoStep({ formData, validationErrors, onChange }: BasicInfoStepProps) {
  const [nameAvailability, setNameAvailability] = useState<'unknown' | 'checking' | 'available' | 'unavailable'>('unknown');

  const getFieldError = (fieldName: string): string | undefined => {
    return validationErrors.find(error => error.field === fieldName)?.message;
  };

  const handleNameChange = (name: string) => {
    onChange({ name });
    setNameAvailability('checking');
    
    // Simulate name availability check
    setTimeout(() => {
      setNameAvailability(name.length > 0 ? 'available' : 'unknown');
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Project Information
        </h2>
        <p className="text-gray-600">
          Provide basic information about your competitive intelligence project.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Name */}
        <div className="md:col-span-2">
          <Label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
            Project Name *
          </Label>
          <Input
            id="project-name"
            type="text"
            placeholder="Enter a descriptive project name"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className={getFieldError('name') ? 'border-red-500' : ''}
            maxLength={200}
          />
          {nameAvailability === 'checking' && (
            <p className="text-sm text-gray-500 mt-1">Checking availability...</p>
          )}
          {nameAvailability === 'available' && formData.name && (
            <p className="text-sm text-green-600 mt-1">✓ Project name is available</p>
          )}
          {getFieldError('name') && (
            <p className="text-sm text-red-600 mt-1">{getFieldError('name')}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Choose a clear, descriptive name that identifies the project's focus and scope.
          </p>
        </div>

        {/* Industry */}
        <div>
          <Label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
            Industry *
          </Label>
          <Select value={formData.industry} onValueChange={(value) => onChange({ industry: value })}>
            <SelectTrigger className={getFieldError('industry') ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map(industry => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFieldError('industry') && (
            <p className="text-sm text-red-600 mt-1">{getFieldError('industry')}</p>
          )}
        </div>

        {/* Project Type */}
        <div className="md:col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-2">Project Type *</Label>
          <div className="grid grid-cols-1 gap-3 mt-2">
            {PROJECT_TYPES.map(type => (
              <Card 
                key={type.value}
                className={`cursor-pointer transition-all ${
                  formData.projectType === type.value 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onChange({ projectType: type.value })}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 ${
                      formData.projectType === type.value 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {formData.projectType === type.value && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{type.label}</h4>
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="Describe the project's goals, scope, and expected outcomes"
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className={getFieldError('description') ? 'border-red-500' : ''}
          rows={4}
          maxLength={2000}
        />
        {getFieldError('description') && (
          <p className="text-sm text-red-600 mt-1">{getFieldError('description')}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Provide context about the project's purpose and competitive intelligence objectives.
        </p>
      </div>

      {/* Target Market */}
      <div>
        <Label htmlFor="target-market" className="block text-sm font-medium text-gray-700 mb-1">
          Target Market
        </Label>
        <Input
          id="target-market"
          type="text"
          placeholder="Describe your target market or customer segment"
          value={formData.targetMarket}
          onChange={(e) => onChange({ targetMarket: e.target.value })}
          className={getFieldError('targetMarket') ? 'border-red-500' : ''}
          maxLength={500}
        />
        {getFieldError('targetMarket') && (
          <p className="text-sm text-red-600 mt-1">{getFieldError('targetMarket')}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Define the market segment or customer base for competitive analysis.
        </p>
      </div>
    </div>
  );
}