import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ProjectCreationWizard } from '@/components/projects/ProjectCreationWizard';
import { ProjectCreationInput } from '@/types/projects';
import { createProject } from '@/services/projectService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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
      
      let errorMessage = "Failed to create project. Please try again.";
      
      if (error instanceof Error) {
        // Handle specific error cases with more helpful messages
        if (error.message.includes('Authentication failed') || error.message.includes('session')) {
          errorMessage = "Your session has expired. Please refresh the page and try again.";
        } else if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          errorMessage = "A project with this name already exists. Please choose a different name.";
        } else if (error.message.includes('Invalid project data')) {
          errorMessage = "Some project information is invalid. Please check your inputs and try again.";
        } else if (error.message.includes('mismatch')) {
          errorMessage = "Authentication error. Please refresh the page and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Project Creation Failed",
        description: errorMessage,
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
      <div className="p-6 lg:p-8">
        {/* Back Navigation */}
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Create New Project
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Set up a new competitive intelligence project to track competitors and analyze market opportunities.
          </p>
        </div>

        {/* Project Creation Wizard */}
        <ProjectCreationWizard
          onProjectCreated={handleProjectCreation}
          onCancel={handleCancel}
          isSubmitting={isCreating}
        />
      </div>
    </div>
  );
}

export default CreateProjectPage;