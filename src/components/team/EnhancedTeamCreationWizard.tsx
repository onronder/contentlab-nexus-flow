import React, { useState, useEffect } from 'react';
import { useTeamContext } from '@/contexts/TeamContext';
import { TeamService } from '@/services/teamService';
import { useAuth } from '@/hooks/useAuth';
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building2, 
  Users, 
  CheckCircle, 
  Loader2,
  ArrowRight,
  ArrowLeft,
  Mail,
  Settings,
  Globe
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import type { TeamCreateInput, TeamType } from '@/types/team';

interface EnhancedTeamCreationWizardProps {
  onComplete?: (team: any) => void;
  onCancel?: () => void;
}

export function EnhancedTeamCreationWizard({ onComplete, onCancel }: EnhancedTeamCreationWizardProps) {
  const { user } = useAuth();
  const { refreshTeams, setCurrentTeam } = useTeamContext();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [createdTeam, setCreatedTeam] = useState<any>(null);
  
  const [formData, setFormData] = useState<Partial<TeamCreateInput & {
    auto_setup: boolean;
    create_default_project: boolean;
    invite_members: boolean;
    member_emails: string[];
  }>>({
    name: '',
    description: '',
    team_type: 'organization',
    member_limit: 50,
    auto_setup: true,
    create_default_project: false,
    invite_members: false,
    member_emails: [],
  });

  const totalSteps = 4;
  const progressPercentage = (step / totalSteps) * 100;

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateCurrentStep = (): boolean => {
    switch (step) {
      case 1:
        return !!(formData.name && formData.name.trim().length >= 2);
      case 2:
        return true; // Settings are optional
      case 3:
        return true; // Review step
      case 4:
        return true; // Success step
      default:
        return true;
    }
  };

  const handleCreateTeam = async () => {
    if (!formData.name || !user?.id) {
      toast({
        title: 'Validation Error',
        description: 'Team name is required and user must be authenticated.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create the team with full integration
      const newTeam = await TeamService.createTeamWithIntegration({
        name: formData.name,
        description: formData.description || '',
        team_type: formData.team_type as TeamType || 'organization',
        member_limit: formData.member_limit || 50,
        auto_setup: formData.auto_setup || true,
        settings: {
          auto_invite: true,
          public_join: false,
          default_permissions: ['view', 'edit'],
          created_with_wizard: true,
          create_default_project: formData.create_default_project || false,
        }
      });

      setCreatedTeam(newTeam);

      // Refresh teams and set as current
      await refreshTeams();
      setCurrentTeam(newTeam);
      
      setStep(4); // Success step
      
      toast({
        title: 'Team created successfully!',
        description: `Welcome to ${formData.name}. Your workspace is ready!`,
      });

      // Complete after showing success
      setTimeout(() => {
        onComplete?.(newTeam);
      }, 3000);
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
        <h2 className="text-2xl font-bold">Team Information</h2>
        <p className="text-muted-foreground">
          Tell us about your team and its purpose
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
            required
          />
          {formData.name && formData.name.length < 2 && (
            <p className="text-sm text-destructive">Team name must be at least 2 characters</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="team-description">Description</Label>
          <Textarea
            id="team-description"
            placeholder="Brief description of your team's purpose and goals..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full min-h-[100px]"
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
              <SelectItem value="organization">
                <div className="flex flex-col">
                  <span>Organization</span>
                  <span className="text-xs text-muted-foreground">Large company or organization</span>
                </div>
              </SelectItem>
              <SelectItem value="project_team">
                <div className="flex flex-col">
                  <span>Project Team</span>
                  <span className="text-xs text-muted-foreground">Focused project group</span>
                </div>
              </SelectItem>
              <SelectItem value="working_group">
                <div className="flex flex-col">
                  <span>Working Group</span>
                  <span className="text-xs text-muted-foreground">Collaborative working group</span>
                </div>
              </SelectItem>
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
            onChange={(e) => handleInputChange('member_limit', parseInt(e.target.value) || 50)}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of team members (can be changed later)
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto gradient-primary rounded-2xl flex items-center justify-center shadow-elegant">
          <Settings className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Team Settings</h2>
        <p className="text-muted-foreground">
          Configure your team's initial setup and preferences
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-setup"
              checked={formData.auto_setup}
              onCheckedChange={(checked) => handleInputChange('auto_setup', checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="auto-setup" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Enable automatic setup
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically create default channels and setup team structure
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="default-project"
              checked={formData.create_default_project}
              onCheckedChange={(checked) => handleInputChange('create_default_project', checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="default-project" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Create default project
              </Label>
              <p className="text-xs text-muted-foreground">
                Start with a sample project to get your team going
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="invite-members"
              checked={formData.invite_members}
              onCheckedChange={(checked) => handleInputChange('invite_members', checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="invite-members" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Invite team members now
              </Label>
              <p className="text-xs text-muted-foreground">
                Send invitations to team members after creation
              </p>
            </div>
          </div>
        </div>

        {formData.invite_members && (
          <div className="space-y-2">
            <Label>Member Email Addresses</Label>
            <Textarea
              placeholder="Enter email addresses, one per line..."
              value={formData.member_emails?.join('\n') || ''}
              onChange={(e) => {
                const emails = e.target.value.split('\n').filter(email => email.trim());
                handleInputChange('member_emails', emails);
              }}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Enter one email address per line. Invitations will be sent after team creation.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto gradient-primary rounded-2xl flex items-center justify-center shadow-elegant">
          <CheckCircle className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Review & Create</h2>
        <p className="text-muted-foreground">
          Please review your team configuration before creating
        </p>
      </div>

      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-sm">Name:</span>
            <p className="text-sm">{formData.name}</p>
          </div>
          <div>
            <span className="font-medium text-sm">Type:</span>
            <p className="text-sm capitalize">{formData.team_type?.replace('_', ' ')}</p>
          </div>
          <div>
            <span className="font-medium text-sm">Member Limit:</span>
            <p className="text-sm">{formData.member_limit} members</p>
          </div>
          <div>
            <span className="font-medium text-sm">Auto Setup:</span>
            <p className="text-sm">{formData.auto_setup ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>

        {formData.description && (
          <div>
            <span className="font-medium text-sm">Description:</span>
            <p className="text-sm mt-1">{formData.description}</p>
          </div>
        )}

        {formData.invite_members && formData.member_emails?.length > 0 && (
          <div>
            <span className="font-medium text-sm">Invited Members:</span>
            <div className="mt-1 space-y-1">
              {formData.member_emails.slice(0, 3).map((email, idx) => (
                <p key={idx} className="text-sm">{email}</p>
              ))}
              {formData.member_emails.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  +{formData.member_emails.length - 3} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-sm">Ready to Launch</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Your team will be created with the selected configuration. You can modify settings and invite more members after creation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <div className="w-16 h-16 mx-auto bg-success/20 rounded-2xl flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-2xl font-bold">Team Created Successfully!</h2>
        <p className="text-muted-foreground">
          Your team "{formData.name}" is now ready and fully configured.
        </p>
      </div>

      {createdTeam && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
          <h4 className="font-medium text-sm mb-2">What's Next?</h4>
          <ul className="text-sm text-muted-foreground space-y-1 text-left">
            <li>• Default team channel created</li>
            <li>• You've been assigned as team owner</li>
            {formData.create_default_project && <li>• Default project initialized</li>}
            {formData.invite_members && <li>• Member invitations will be sent</li>}
            <li>• Team workspace is ready to use</li>
          </ul>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Redirecting to your team workspace...
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
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  const nextStep = () => {
    if (validateCurrentStep() && step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-elegant">
      <CardHeader>
        <div className="space-y-4">
          <div className="text-center">
            <CardTitle className="text-lg">Create Your Team</CardTitle>
            <CardDescription>
              Step {step} of {totalSteps}
            </CardDescription>
          </div>
          
          <div className="space-y-2">
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Team Info</span>
              <span>Settings</span>
              <span>Review</span>
              <span>Complete</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {renderCurrentStep()}
        
        {step < 4 && (
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            
            {step === 1 && onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            
            {step < 3 ? (
              <Button
                onClick={nextStep}
                disabled={!validateCurrentStep()}
                className="flex-1 gradient-primary text-primary-foreground"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateTeam}
                disabled={isLoading || !validateCurrentStep()}
                className="flex-1 gradient-primary text-primary-foreground"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Team...
                  </>
                ) : (
                  <>
                    Create Team
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}