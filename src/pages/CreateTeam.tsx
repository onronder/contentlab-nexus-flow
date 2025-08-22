import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedTeamCreationWizard } from '@/components/team/EnhancedTeamCreationWizard';
import { useTeamContext } from '@/contexts/TeamContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CreateTeam() {
  const navigate = useNavigate();

  const handleTeamCreated = () => {
    // Force immediate refresh of team queries
    navigate('/team');
    // Give a small delay to ensure navigation completes, then refresh
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="mb-4 hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Create Your Team
            </h1>
            <p className="text-muted-foreground mt-2">
              Set up your collaborative workspace in just a few steps
            </p>
          </div>
        </div>

        {/* Enhanced Team Creation Wizard */}
        <EnhancedTeamCreationWizard 
          onComplete={handleTeamCreated} 
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}