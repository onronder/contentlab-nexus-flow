import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth, useAuthOperations, useAuthGuard, useProfileImage } from '@/hooks';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Camera, 
  Upload, 
  X, 
  Check, 
  Edit2, 
  Save, 
  ArrowLeft,
  Shield,
  Mail,
  Phone,
  Calendar,
  Lock,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ProfileFormData {
  full_name: string;
  email: string;
  bio: string;
  phone: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, refreshProfile } = useAuth();
  const { updateUserProfile, isSubmitting: isUpdatingProfile } = useAuthOperations();
  const { uploadImage, deleteImage, isUploading: isUploadingImage, uploadError } = useProfileImage();
  const { shouldRender } = useAuthGuard({ requireAuth: true });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    bio: '',
    phone: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Partial<ProfileFormData>>({});

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        phone: profile.phone || ''
      });
    }
  }, [profile]);

  // Calculate profile completion
  useEffect(() => {
    if (profile) {
      const fields = [
        profile.full_name,
        profile.email,
        profile.bio,
        profile.phone,
        profile.avatar_url
      ];
      const completedFields = fields.filter(field => field && field.trim()).length;
      const completion = Math.round((completedFields / fields.length) * 100);
      setProfileCompletion(completion);
    }
  }, [profile]);

  const validateField = (name: keyof ProfileFormData, value: string) => {
    let error = '';
    
    switch (name) {
      case 'full_name':
        if (!value.trim()) error = 'Full name is required';
        else if (value.trim().length < 2) error = 'Full name must be at least 2 characters';
        else if (value.length > 100) error = 'Full name must be less than 100 characters';
        break;
      case 'email':
        if (!value.trim()) error = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Please enter a valid email address';
        break;
      case 'bio':
        if (value.length > 500) error = 'Bio must be less than 500 characters';
        break;
      case 'phone':
        if (value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
          error = 'Please enter a valid phone number';
        }
        break;
    }
    
    setValidationErrors(prev => ({ ...prev, [name]: error }));
    return error === '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name as keyof ProfileFormData]) {
      validateField(name as keyof ProfileFormData, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    validateField(name as keyof ProfileFormData, value);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);

      // Upload image
      const publicUrl = await uploadImage(file);

      if (publicUrl) {
        // Update profile with new avatar URL
        const success = await updateUserProfile({ avatar_url: publicUrl });

        if (success) {
          await refreshProfile();
          toast({
            title: "Avatar updated",
            description: "Your profile picture has been updated successfully",
          });
        } else {
          throw new Error('Failed to update profile');
        }
      } else if (uploadError) {
        throw new Error(uploadError);
      }

    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive"
      });
      setAvatarPreview(null);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar_url) return;

    try {
      // Delete image
      const success = await deleteImage(profile.avatar_url);

      if (success) {
        // Update profile to remove avatar URL
        const updateSuccess = await updateUserProfile({ avatar_url: null });

        if (updateSuccess) {
          await refreshProfile();
          setAvatarPreview(null);
          toast({
            title: "Avatar removed",
            description: "Your profile picture has been removed",
          });
        }
      } else if (uploadError) {
        throw new Error(uploadError);
      }

    } catch (error: any) {
      console.error('Avatar removal error:', error);
      toast({
        title: "Failed to remove avatar",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    // Validate all fields
    const isValid = Object.keys(formData).every(key => 
      validateField(key as keyof ProfileFormData, formData[key as keyof ProfileFormData])
    );

    if (!isValid) {
      toast({
        title: "Validation errors",
        description: "Please fix the errors before saving",
        variant: "destructive"
      });
      return;
    }

    const success = await updateUserProfile(formData);

    if (success) {
      await refreshProfile();
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } else {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        phone: profile.phone || ''
      });
    }
    setValidationErrors({});
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!shouldRender) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>Unable to load your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account information and preferences</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Overview Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="relative mx-auto w-24 h-24 mb-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage 
                      src={avatarPreview || profile.avatar_url || undefined} 
                      alt={profile.full_name || 'User'} 
                    />
                    <AvatarFallback className="text-lg">
                      {getInitials(profile.full_name || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Upload overlay */}
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                    {isUploadingImage ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera 
                        className="h-6 w-6 text-white" 
                        onClick={handleAvatarClick}
                      />
                    )}
                  </div>
                </div>
                
                <CardTitle className="text-xl">{profile.full_name || 'User'}</CardTitle>
                <CardDescription>{profile.email}</CardDescription>
                
                {/* Avatar actions */}
                <div className="flex gap-2 justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarClick}
                    disabled={isUploadingImage}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Upload
                  </Button>
                  {profile.avatar_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingImage}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Profile completion */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Profile Completion</span>
                    <span className="font-medium">{profileCompletion}%</span>
                  </div>
                  <Progress value={profileCompletion} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {profileCompletion === 100 
                      ? 'Your profile is complete!' 
                      : 'Complete your profile to improve your experience'
                    }
                  </p>
                </div>

                <Separator className="my-4" />

                {/* Account info */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Member since</p>
                      <p className="text-muted-foreground">
                        {new Date(profile.created_at || '').toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Account Status</p>
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Update your personal details and contact information
                    </CardDescription>
                  </div>
                  
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="shrink-0"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isUpdatingProfile}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isUpdatingProfile}
                      >
                        {isUpdatingProfile ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    disabled={!isEditing}
                    className={cn(
                      validationErrors.full_name && "border-destructive focus-visible:ring-destructive"
                    )}
                    placeholder="Enter your full name"
                  />
                  {validationErrors.full_name && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.full_name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    disabled={!isEditing}
                    className={cn(
                      validationErrors.email && "border-destructive focus-visible:ring-destructive"
                    )}
                    placeholder="Enter your email address"
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.email}
                    </p>
                  )}
                  {!isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Email changes require verification through both old and new email addresses
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    disabled={!isEditing}
                    className={cn(
                      validationErrors.phone && "border-destructive focus-visible:ring-destructive"
                    )}
                    placeholder="Enter your phone number"
                  />
                  {validationErrors.phone && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.phone}
                    </p>
                  )}
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="flex items-center gap-2">
                    <Edit2 className="h-4 w-4" />
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    disabled={!isEditing}
                    className={cn(
                      "min-h-[100px]",
                      validationErrors.bio && "border-destructive focus-visible:ring-destructive"
                    )}
                    placeholder="Tell us about yourself..."
                  />
                  <div className="flex justify-between">
                    {validationErrors.bio && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.bio}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground ml-auto">
                      {formData.bio.length}/500 characters
                    </p>
                  </div>
                </div>

                {/* Security Section */}
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Security & Privacy
                  </h3>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/forgot-password')}
                      className="justify-start"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Feature coming soon",
                          description: "Two-factor authentication will be available soon",
                        });
                      }}
                      className="justify-start"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Two-Factor Auth
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default Profile;