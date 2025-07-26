import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useProject, useUpdateProject } from '@/hooks';
import { BasicInfoStep } from '@/components/projects/creation-steps/BasicInfoStep';
import { ObjectivesStep } from '@/components/projects/creation-steps/ObjectivesStep';
import { ConfigurationStep } from '@/components/projects/creation-steps/ConfigurationStep';
import { ProjectCreationInput, ProjectUpdateInput } from '@/types/projects';
import { useToast } from '@/hooks/use-toast';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function EditProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: project, isLoading, error } = useProject(projectId);
  const updateProject = useUpdateProject();

  const [formData, setFormData] = useState<ProjectCreationInput>({
    name: '',
    description: '',
    industry: '',
    projectType: 'competitive_analysis',
    targetMarket: '',
    primaryObjectives: [],
    successMetrics: [],
    startDate: null,
    targetEndDate: null,
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

  // Update form data when project loads
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        industry: project.industry,
        projectType: project.projectType,
        targetMarket: project.targetMarket || '',
        primaryObjectives: Array.isArray(project.primaryObjectives) 
          ? project.primaryObjectives 
          : [],
        successMetrics: Array.isArray(project.successMetrics) 
          ? project.successMetrics 
          : [],
        startDate: project.startDate,
        targetEndDate: project.targetEndDate,
        isPublic: project.isPublic,
        allowTeamAccess: project.allowTeamAccess,
        autoAnalysisEnabled: project.autoAnalysisEnabled,
        notificationSettings: project.notificationSettings,
        customFields: project.customFields,
        tags: project.tags || []
      });
    }
  }, [project]);

  const handleFormDataChange = (updates: Partial<ProjectCreationInput>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleSave = async () => {
    if (!projectId) return;

    try {
      const updates: ProjectUpdateInput = {
        name: formData.name,
        description: formData.description,
        industry: formData.industry,
        targetMarket: formData.targetMarket,
        primaryObjectives: formData.primaryObjectives,
        successMetrics: formData.successMetrics,
        startDate: formData.startDate,
        targetEndDate: formData.targetEndDate,
        isPublic: formData.isPublic,
        allowTeamAccess: formData.allowTeamAccess,
        autoAnalysisEnabled: formData.autoAnalysisEnabled,
        notificationSettings: formData.notificationSettings,
        customFields: formData.customFields,
        tags: formData.tags
      };

      await updateProject.mutateAsync({
        projectId,
        updates
      });
      
      toast({
        title: "Project Updated",
        description: "Your project has been successfully updated.",
      });
      
      navigate(`/projects/${projectId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update project. Please try again.",
      });
    }
  };

  const handleCancel = () => {
    navigate(`/projects/${projectId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Project Not Found</CardTitle>
            <CardDescription>
              The project you're trying to edit could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/projects')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/projects/${projectId}`}>
                {project.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Edit Project</h1>
            <p className="text-muted-foreground mt-2">
              Update your project details and configuration
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateProject.isPending}>
              {updateProject.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="objectives">Objectives & Goals</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-6">
          <BasicInfoStep
            formData={formData}
            validationErrors={[]}
            onChange={handleFormDataChange}
          />
        </TabsContent>
        
        <TabsContent value="objectives" className="space-y-6">
          <ObjectivesStep
            formData={formData}
            validationErrors={[]}
            onChange={handleFormDataChange}
          />
        </TabsContent>
        
        <TabsContent value="configuration" className="space-y-6">
          <ConfigurationStep
            formData={formData}
            validationErrors={[]}
            onChange={handleFormDataChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}