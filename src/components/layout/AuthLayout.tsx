import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Authentication layout for login, signup, forgot password pages
 * Provides a clean, focused layout without main navigation
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {children}
    </div>
  );
};