import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectCreationWizard } from '@/components/projects/ProjectCreationWizard';
import { ProjectCreationInput } from '@/types/projects';
import { createProject } from '@/services/projectService';
import { useToast } from '@/hooks/use-toast';

export function CreateProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const handleProjectCreation = async (projectData: ProjectCreationInput) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a project.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      const project = await createProject(user.id, projectData);
      
      toast({
        title: "Project Created Successfully",
        description: `${project.name} has been created and is ready for competitive intelligence.`,
        variant: "default"
      });

      // Navigate to the new project
      navigate(`/projects/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Project Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    navigate('/projects');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-card shadow-lg rounded-lg border">
          <div className="px-6 py-4 border-b">
            <h1 className="text-2xl font-bold text-foreground">
              Create New Project
            </h1>
            <p className="mt-2 text-muted-foreground">
              Set up a new competitive intelligence project to track competitors and analyze market opportunities.
            </p>
          </div>

          <div className="p-6">
            <ProjectCreationWizard
              onProjectCreated={handleProjectCreation}
              onCancel={handleCancel}
              isSubmitting={isCreating}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateProjectPage;