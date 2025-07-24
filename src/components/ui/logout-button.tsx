import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LogOut, Monitor } from 'lucide-react';
import { useAuthOperations } from '@/hooks';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LogoutButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showConfirmDialog?: boolean;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  variant = 'ghost',
  size = 'default',
  className,
  showConfirmDialog = true,
  showIcon = true,
  children,
}) => {
  const { signOutUser, signOutFromAllDevices, isSubmitting } = useAuthOperations();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleLogout = async (allDevices = false) => {
    const success = allDevices ? await signOutFromAllDevices() : await signOutUser();
    
    if (success) {
      toast({
        title: "Signed out successfully",
        description: allDevices 
          ? "You have been signed out from all devices" 
          : "You have been signed out",
      });
    } else {
      toast({
        title: "Sign out failed",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
    
    setDialogOpen(false);
  };

  const LogoutButtonContent = () => (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      disabled={isSubmitting}
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      {children || "Sign out"}
    </Button>
  );

  if (!showConfirmDialog) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn("gap-2", className)}
        disabled={isSubmitting}
        onClick={() => handleLogout(false)}
      >
        {showIcon && <LogOut className="h-4 w-4" />}
        {children || "Sign out"}
      </Button>
    );
  }

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogTrigger asChild>
        <LogoutButtonContent />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out of your account?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be signed out and redirected to the login page. You can sign back in at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <div className="flex gap-2">
            <AlertDialogAction
              onClick={() => handleLogout(true)}
              disabled={isSubmitting}
              className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              <Monitor className="h-4 w-4" />
              Sign out all devices
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleLogout(false)}
              disabled={isSubmitting}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};