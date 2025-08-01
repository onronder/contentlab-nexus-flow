import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  Mail,
  Users,
  Shield,
  Check,
  X,
  AlertCircle,
  FileText,
  Plus,
  Trash2
} from 'lucide-react';
import { useAvailableRoles } from '@/hooks/useTeamQueries';
import { useSendInvitation, useBulkInvitation } from '@/hooks/useInvitationMutations';
import { UserRole } from '@/types/team';
import { useToast } from '@/hooks/use-toast';

const singleInviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  roleId: z.string().min(1, 'Please select a role'),
  message: z.string().optional(),
});

const bulkInviteSchema = z.object({
  invitations: z.array(z.object({
    email: z.string().email(),
    roleId: z.string().min(1),
  })).min(1, 'At least one invitation is required'),
  message: z.string().optional(),
});

type SingleInviteForm = z.infer<typeof singleInviteSchema>;
type BulkInviteForm = z.infer<typeof bulkInviteSchema>;

interface AddMemberDialogProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddMemberDialog({
  teamId,
  open,
  onOpenChange,
  onSuccess,
}: AddMemberDialogProps) {
  const [inviteMode, setInviteMode] = useState<'single' | 'bulk'>('single');
  const [bulkEmails, setBulkEmails] = useState<Array<{ email: string; roleId: string; status: 'pending' | 'valid' | 'invalid' | 'duplicate' }>>([]);
  const [csvProcessing, setCsvProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { toast } = useToast();
  const { data: roles, isLoading: rolesLoading } = useAvailableRoles();
  const sendInvitationMutation = useSendInvitation();
  const bulkInvitationMutation = useBulkInvitation();

  const singleForm = useForm<SingleInviteForm>({
    resolver: zodResolver(singleInviteSchema),
    defaultValues: {
      email: '',
      roleId: '',
      message: '',
    },
  });

  const bulkForm = useForm<BulkInviteForm>({
    resolver: zodResolver(bulkInviteSchema),
    defaultValues: {
      invitations: [],
      message: '',
    },
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addBulkEmail = useCallback(() => {
    setBulkEmails(prev => [...prev, { email: '', roleId: '', status: 'pending' }]);
  }, []);

  const updateBulkEmail = useCallback((index: number, field: 'email' | 'roleId', value: string) => {
    setBulkEmails(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value };
        
        if (field === 'email') {
          const isValid = validateEmail(value);
          const isDuplicate = prev.some((other, otherIndex) => 
            otherIndex !== index && other.email === value && value !== ''
          );
          
          updated.status = value === '' ? 'pending' : 
                          isDuplicate ? 'duplicate' :
                          isValid ? 'valid' : 'invalid';
        }
        
        return updated;
      }
      return item;
    }));
  }, []);

  const removeBulkEmail = useCallback((index: number) => {
    setBulkEmails(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processCsvFile = useCallback((file: File) => {
    setCsvProcessing(true);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));
        const roleIndex = headers.findIndex(h => h.toLowerCase().includes('role'));
        
        if (emailIndex === -1) {
          toast({
            title: "Invalid CSV",
            description: "CSV file must contain an email column",
            variant: "destructive",
          });
          setCsvProcessing(false);
          return;
        }

        const newEmails: typeof bulkEmails = [];
        const defaultRoleId = roles?.find(r => r.slug === 'member')?.id || '';

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const email = values[emailIndex];
          const roleSlug = roleIndex !== -1 ? values[roleIndex] : 'member';
          const roleId = roles?.find(r => r.slug === roleSlug)?.id || defaultRoleId;

          if (email) {
            const isValid = validateEmail(email);
            const isDuplicate = newEmails.some(item => item.email === email);
            
            newEmails.push({
              email,
              roleId,
              status: isDuplicate ? 'duplicate' : isValid ? 'valid' : 'invalid'
            });
          }

          setUploadProgress((i / (lines.length - 1)) * 100);
        }

        setBulkEmails(newEmails);
        toast({
          title: "CSV Processed",
          description: `Processed ${newEmails.length} email addresses`,
        });
      } catch (error) {
        toast({
          title: "CSV Processing Error",
          description: "Failed to process CSV file. Please check the format.",
          variant: "destructive",
        });
      } finally {
        setCsvProcessing(false);
        setUploadProgress(0);
      }
    };

    reader.readAsText(file);
  }, [roles, toast]);

  const handleSingleSubmit = async (data: SingleInviteForm) => {
    try {
      await sendInvitationMutation.mutateAsync({
        team_id: teamId,
        email: data.email,
        role_id: data.roleId,
        message: data.message,
      });

      singleForm.reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const handleBulkSubmit = async () => {
    const validEmails = bulkEmails.filter(item => item.status === 'valid' && item.email && item.roleId);
    
    if (validEmails.length === 0) {
      toast({
        title: "No valid invitations",
        description: "Please add at least one valid email address with a role",
        variant: "destructive",
      });
      return;
    }

    try {
      await bulkInvitationMutation.mutateAsync({
        team_id: teamId,
        emails: validEmails.map(item => item.email),
        role_id: validEmails[0].roleId, // Assuming all emails get same role for bulk
        message: bulkForm.getValues('message'),
      });

      setBulkEmails([]);
      bulkForm.reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to send invitations",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const getRolePermissionPreview = (roleId: string) => {
    const role = roles?.find(r => r.id === roleId);
    if (!role) return null;

    const permissions = [
      { name: 'View team', enabled: true },
      { name: 'View members', enabled: true },
      { name: 'Invite members', enabled: role.hierarchy_level >= 6 },
      { name: 'Manage members', enabled: role.hierarchy_level >= 8 },
      { name: 'Delete team', enabled: role.hierarchy_level >= 10 },
    ];

    return (
      <Card className="mt-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {permissions.map((permission) => (
              <div key={permission.name} className="flex items-center gap-2">
                {permission.enabled ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={`text-sm ${permission.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {permission.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <Check className="h-4 w-4 text-success" />;
      case 'invalid':
        return <X className="h-4 w-4 text-destructive" />;
      case 'duplicate':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite Team Members
          </DialogTitle>
          <DialogDescription>
            Add new members to your team by sending them an invitation email.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={inviteMode} onValueChange={(value) => setInviteMode(value as 'single' | 'bulk')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Invitation</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Invitations</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <Form {...singleForm}>
              <form onSubmit={singleForm.handleSubmit(handleSingleSubmit)} className="space-y-4">
                <FormField
                  control={singleForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Enter email address"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={singleForm.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles?.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                <span>{role.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  Level {role.hierarchy_level}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {singleForm.watch('roleId') && getRolePermissionPreview(singleForm.watch('roleId'))}

                <FormField
                  control={singleForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add a personal message to the invitation..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This message will be included in the invitation email.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={sendInvitationMutation.isPending}>
                    {sendInvitationMutation.isPending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload CSV File
                  </CardTitle>
                  <CardDescription>
                    Upload a CSV file with email addresses and roles. The file should have 'email' and optionally 'role' columns.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop a CSV file here, or click to browse
                    </p>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processCsvFile(file);
                      }}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button variant="outline" asChild>
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        Choose File
                      </label>
                    </Button>
                  </div>
                  {csvProcessing && (
                    <div className="mt-4">
                      <Progress value={uploadProgress} />
                      <p className="text-sm text-muted-foreground mt-1">
                        Processing CSV file...
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Manual Entry</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBulkEmail}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Email
                </Button>
              </div>

              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {bulkEmails.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <div className="relative">
                            <Input
                              placeholder="Email address"
                              value={item.email}
                              onChange={(e) => updateBulkEmail(index, 'email', e.target.value)}
                              className={`text-sm ${
                                item.status === 'invalid' ? 'border-destructive' :
                                item.status === 'duplicate' ? 'border-warning' :
                                item.status === 'valid' ? 'border-success' : ''
                              }`}
                            />
                            <div className="absolute right-2 top-2">
                              {getStatusIcon(item.status)}
                            </div>
                          </div>
                          {item.status === 'invalid' && (
                            <p className="text-xs text-destructive">Invalid email</p>
                          )}
                          {item.status === 'duplicate' && (
                            <p className="text-xs text-warning">Duplicate email</p>
                          )}
                        </div>
                        <Select
                          value={item.roleId}
                          onValueChange={(value) => updateBulkEmail(index, 'roleId', value)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles?.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBulkEmail(index)}
                        className="h-8 w-8 p-0 text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {bulkEmails.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No email addresses added yet</p>
                      <p className="text-xs">Upload a CSV file or add emails manually</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {bulkEmails.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <FormField
                    control={bulkForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Message (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add a personal message to all invitations..."
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {bulkEmails.filter(item => item.status === 'valid').length} of {bulkEmails.length} email(s) are valid and will be sent invitations.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkSubmit}
                  disabled={bulkInvitationMutation.isPending || bulkEmails.filter(item => item.status === 'valid').length === 0}
                >
                  {bulkInvitationMutation.isPending ? 'Sending...' : `Send ${bulkEmails.filter(item => item.status === 'valid').length} Invitation(s)`}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}