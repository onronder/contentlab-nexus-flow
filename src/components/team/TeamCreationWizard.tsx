import React, { useState } from 'react';
import { useTeamContext } from '@/contexts/TeamContext';
import { TeamService } from '@/services/teamService';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, 
  Users, 
  CheckCircle, 
  Loader2,
  ArrowRight
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { TeamCreateInput, TeamType } from '@/types/team';

interface TeamCreationWizardProps {
  onComplete?: () => void;
}

export function TeamCreationWizard({ onComplete }: TeamCreationWizardProps) {
  const { refreshTeams } = useTeamContext();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<TeamCreateInput>>({
    name: '',
    description: '',
    team_type: 'organization',
    member_limit: 50,
  });

  const handleInputChange = (field: keyof TeamCreateInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateTeam = async () => {
    if (!formData.name) {
      toast({
        title: 'Team name required',
        description: 'Please enter a name for your team.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await TeamService.createTeam({
        name: formData.name,
        description: formData.description || '',
        team_type: formData.team_type as TeamType || 'organization',
        member_limit: formData.member_limit || 50,
      });

      // Refresh teams to get the new team
      await refreshTeams();
      
      setStep(3); // Success step
      
      toast({
        title: 'Team created successfully!',
        description: `Welcome to ${formData.name}. You can now invite team members.`,
      });

      // Complete after a short delay
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: 'Failed to create team',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto gradient-primary rounded-2xl flex items-center justify-center shadow-elegant">
          <Building2 className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Create Your Team</h2>
        <p className="text-muted-foreground">
          Set up your workspace for collaborative content management
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="team-name">Team Name *</Label>
          <Input
            id="team-name"
            placeholder="e.g., Marketing Team, Product Development"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="team-description">Description</Label>
          <Textarea
            id="team-description"
            placeholder="Brief description of your team's purpose..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="team-type">Team Type</Label>
          <Select
            value={formData.team_type}
            onValueChange={(value) => handleInputChange('team_type', value)}
          >
            <SelectTrigger id="team-type">
              <SelectValue placeholder="Select team type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="organization">Organization</SelectItem>
              <SelectItem value="project_team">Project Team</SelectItem>
              <SelectItem value="working_group">Working Group</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-limit">Member Limit</Label>
          <Input
            id="member-limit"
            type="number"
            min="1"
            max="1000"
            value={formData.member_limit}
            onChange={(e) => handleInputChange('member_limit', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          onClick={() => setStep(2)}
          disabled={!formData.name}
          className="flex-1 gradient-primary text-primary-foreground"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto gradient-primary rounded-2xl flex items-center justify-center shadow-elegant">
          <Users className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Review Team Details</h2>
        <p className="text-muted-foreground">
          Please confirm your team information before creating
        </p>
      </div>

      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex justify-between">
          <span className="font-medium">Name:</span>
          <span>{formData.name}</span>
        </div>
        {formData.description && (
          <div className="flex justify-between">
            <span className="font-medium">Description:</span>
            <span className="text-right max-w-[200px]">{formData.description}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="font-medium">Type:</span>
          <span className="capitalize">{formData.team_type?.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Member Limit:</span>
          <span>{formData.member_limit} members</span>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => setStep(1)}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleCreateTeam}
          disabled={isLoading}
          className="flex-1 gradient-primary text-primary-foreground"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Create Team
              <CheckCircle className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <div className="w-16 h-16 mx-auto bg-success/20 rounded-2xl flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-2xl font-bold">Team Created Successfully!</h2>
        <p className="text-muted-foreground">
          Your team "{formData.name}" is now ready. You can start inviting members and managing projects.
        </p>
      </div>

      <div className="text-sm text-muted-foreground">
        Redirecting to your dashboard...
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-elegant">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  step >= stepNumber 
                    ? 'gradient-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-8 h-0.5 mx-1 ${
                    step > stepNumber ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderCurrentStep()}
      </CardContent>
    </Card>
  );
}