import React from 'react';
import { ProjectCreationInput, PROJECT_TYPES } from '@/types/projects';
import { ValidationError } from '@/utils/projectValidation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ReviewStepProps {
  formData: ProjectCreationInput;
  validationErrors: ValidationError[];
}

export function ReviewStep({ formData, validationErrors }: ReviewStepProps) {
  const projectType = PROJECT_TYPES.find(type => type.value === formData.projectType);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Review Project Details
        </h2>
        <p className="text-gray-600">
          Review your project configuration before creating. You can modify these settings later.
        </p>
      </div>

      {/* Validation Status */}
      {validationErrors.length === 0 ? (
        <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
          <span className="text-green-800">All required information is complete and valid.</span>
        </div>
      ) : (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
          <span className="text-red-800">Please fix the validation errors before proceeding.</span>
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900">Project Name</h4>
            <p className="text-gray-600">{formData.name}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900">Industry</h4>
            <p className="text-gray-600">{formData.industry}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900">Project Type</h4>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{projectType?.label}</Badge>
              <span className="text-sm text-gray-600">{projectType?.description}</span>
            </div>
          </div>
          
          {formData.description && (
            <div>
              <h4 className="font-medium text-gray-900">Description</h4>
              <p className="text-gray-600">{formData.description}</p>
            </div>
          )}
          
          {formData.targetMarket && (
            <div>
              <h4 className="font-medium text-gray-900">Target Market</h4>
              <p className="text-gray-600">{formData.targetMarket}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Objectives & Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Objectives & Success Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Primary Objectives ({formData.primaryObjectives.length})
            </h4>
            {formData.primaryObjectives.length > 0 ? (
              <ul className="space-y-1">
                {formData.primaryObjectives.map((objective, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No objectives defined</p>
            )}
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Success Metrics ({formData.successMetrics.length})
            </h4>
            {formData.successMetrics.length > 0 ? (
              <ul className="space-y-1">
                {formData.successMetrics.map((metric, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{metric}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No success metrics defined</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900">Team Access</h4>
              <p className="text-sm text-gray-600">
                {formData.allowTeamAccess ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">Public Project</h4>
              <p className="text-sm text-gray-600">
                {formData.isPublic ? 'Yes' : 'No'}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">Auto Analysis</h4>
              <p className="text-sm text-gray-600">
                {formData.autoAnalysisEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">Notifications</h4>
              <p className="text-sm text-gray-600">
                {formData.notificationSettings.frequency} frequency
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {formData.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}