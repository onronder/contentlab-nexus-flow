import { SecurityDashboard } from '@/components/security/SecurityDashboard';

export default function Security() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Security</h1>
        <p className="text-muted-foreground">
          Monitor and manage your account security and active sessions
        </p>
      </div>
      
      <SecurityDashboard />
    </div>
  );
}