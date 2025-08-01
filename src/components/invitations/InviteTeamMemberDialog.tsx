import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, X, UserPlus, Users, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSendInvitation, useBulkInvitation } from '@/hooks/useInvitationMutations';
import { useAvailableRoles } from '@/hooks/useTeamQueries';
import { InvitationCreateInput, BulkInvitationInput } from '@/types/invitations';

// Validation schema
const invitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  role_id: z.string().min(1, 'Role is required'),
  message: z.string().max(500, 'Message cannot exceed 500 characters').optional(),
  expires_in_days: z.number().min(1).max(30).optional()
});

const bulkInvitationSchema = z.object({
  emails: z.array(z.string().email()).min(1, 'At least one email is required'),
  role_id: z.string().min(1, 'Role is required'),
  message: z.string().max(500, 'Message cannot exceed 500 characters').optional(),
  expires_in_days: z.number().min(1).max(30).optional()
});

type InvitationFormData = z.infer<typeof invitationSchema>;
type BulkInvitationFormData = z.infer<typeof bulkInvitationSchema>;

interface InviteTeamMemberDialogProps {
  teamId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function InviteTeamMemberDialog({ teamId, trigger, onSuccess }: InviteTeamMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);

  const sendInvitation = useSendInvitation();
  const bulkInvitation = useBulkInvitation();
  const { data: roles = [] } = useAvailableRoles();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      expires_in_days: 7
    }
  });

  const selectedRoleId = watch('role_id');

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (email && !emailList.includes(email)) {
      try {
        z.string().email().parse(email);
        setEmailList([...emailList, email]);
        setEmailInput('');
      } catch {
        // Invalid email format
      }
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmailList(emailList.filter(e => e !== email));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const onSubmit = async (data: InvitationFormData) => {
    try {
      if (mode === 'single') {
        const invitationData: InvitationCreateInput = {
          team_id: teamId,
          email: data.email,
          role_id: data.role_id,
          message: data.message,
          expires_in_days: data.expires_in_days
        };

        await sendInvitation.mutateAsync(invitationData);
      } else {
        if (emailList.length === 0) return;

        const bulkData: BulkInvitationInput = {
          team_id: teamId,
          emails: emailList,
          role_id: data.role_id,
          message: data.message,
          expires_in_days: data.expires_in_days
        };

        await bulkInvitation.mutateAsync(bulkData);
      }

      // Reset form and close dialog
      reset();
      setEmailList([]);
      setEmailInput('');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const handleClose = () => {
    setOpen(false);
    reset();
    setEmailList([]);
    setEmailInput('');
    setMode('single');
  };

  const isLoading = sendInvitation.isPending || bulkInvitation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite Team Members
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Mode Selection */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={mode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('single')}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Single
            </Button>
            <Button
              type="button"
              variant={mode === 'bulk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('bulk')}
            >
              <Users className="h-4 w-4 mr-1" />
              Bulk
            </Button>
          </div>

          <Separator />

          {/* Email Input */}
          {mode === 'single' ? (
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Email Addresses</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddEmail}
                  disabled={!emailInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Email List */}
              {emailList.length > 0 && (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {emailList.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      <Mail className="h-3 w-3" />
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                {emailList.length} email{emailList.length !== 1 ? 's' : ''} added
              </p>
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedRoleId}
              onValueChange={(value) => setValue('role_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{role.name}</span>
                      {role.description && (
                        <span className="text-sm text-muted-foreground">
                          {role.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role_id && (
              <p className="text-sm text-destructive">{errors.role_id.message}</p>
            )}
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              {...register('message')}
              className="min-h-[80px]"
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label htmlFor="expires_in_days">Expires In (Days)</Label>
            <Input
              id="expires_in_days"
              type="number"
              min="1"
              max="30"
              {...register('expires_in_days', { valueAsNumber: true })}
            />
            {errors.expires_in_days && (
              <p className="text-sm text-destructive">{errors.expires_in_days.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isValid || (mode === 'bulk' && emailList.length === 0)}
            >
              {isLoading ? 'Sending...' : mode === 'single' ? 'Send Invitation' : `Send ${emailList.length} Invitations`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}