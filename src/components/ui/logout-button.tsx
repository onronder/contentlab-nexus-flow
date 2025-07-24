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
import { useAuth } from '@/hooks/useAuth';
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
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async (allDevices = false) => {
    setIsLoading(true);
    const { error } = await signOut();
    
    if (!error) {
      toast({
        title: "Signed out successfully",
        description: "You have been signed out",
      });
    } else {
      toast({
        title: "Sign out failed",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
    
    setDialogOpen(false);
    setIsLoading(false);
  };

  const LogoutButtonContent = () => (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      disabled={isLoading}
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
        disabled={isLoading}
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
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleLogout(false)}
            disabled={isLoading}
            className="gap-2"
          >
              <LogOut className="h-4 w-4" />
              Sign out
            </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};