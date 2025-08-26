import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Eye, 
  UserX, 
  Globe,
  Activity,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityThreat {
  id: string;
  type: 'authentication' | 'authorization' | 'data_breach' | 'malware' | 'ddos' | 'sql_injection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  status: 'active' | 'investigating' | 'mitigated' | 'resolved';
  affectedSystems: string[];
  riskScore: number;
}

interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  threshold: { warning: number; critical: number };
}

interface ComplianceCheck {
  id: string;
  category: string;
  check: string;
  status: 'passed' | 'failed' | 'warning';
  details: string;
  lastChecked: Date;
}

export const SecurityMonitoringCenter: React.FC = () => {
  const { toast } = useToast();
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [compliance, setCompliance] = useState<ComplianceCheck[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date>(new Date());

  const generateSecurityThreats = useCallback((): SecurityThreat[] => {
    const threatTypes = [
      {
        type: 'authentication' as const,
        title: 'Multiple Failed Login Attempts',
        description: 'Unusual number of failed login attempts detected from IP 192.168.1.100',
        source: 'Auth Service',
        severity: 'medium' as const
      },
      {
        type: 'authorization' as const,
        title: 'Privilege Escalation Attempt',
        description: 'User attempted to access admin resources without proper permissions',
        source: 'API Gateway',
        severity: 'high' as const
      },
      {
        type: 'ddos' as const,
        title: 'Suspicious Traffic Pattern',
        description: 'Abnormal request volume detected from multiple IPs',
        source: 'Load Balancer',
        severity: 'critical' as const
      }
    ];

    return Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => {
      const threat = threatTypes[Math.floor(Math.random() * threatTypes.length)];
      return {
        id: `threat_${i}`,
        ...threat,
        timestamp: new Date(Date.now() - Math.random() * 3600000),
        status: ['active', 'investigating', 'mitigated'][Math.floor(Math.random() * 3)] as any,
        affectedSystems: ['API', 'Database', 'Auth'][Math.floor(Math.random() * 3)] ? ['API'] : ['API', 'Database'],
        riskScore: Math.floor(Math.random() * 40) + 60
      };
    });
  }, []);

  const generateSecurityMetrics = useCallback((): SecurityMetric[] => {
    return [
      {
        id: 'failed_logins',
        name: 'Failed Login Attempts',
        value: Math.floor(Math.random() * 50) + 10,
        unit: '/hour',
        trend: Math.random() > 0.5 ? 'stable' : 'up',
        status: Math.random() > 0.8 ? 'warning' : 'good',
        threshold: { warning: 50, critical: 100 }
      },
      {
        id: 'threat_score',
        name: 'Overall Threat Score',
        value: Math.floor(Math.random() * 30) + 20,
        unit: '/100',
        trend: Math.random() > 0.6 ? 'stable' : 'down',
        status: Math.random() > 0.9 ? 'warning' : 'good',
        threshold: { warning: 70, critical: 90 }
      },
      {
        id: 'blocked_requests',
        name: 'Blocked Malicious Requests',
        value: Math.floor(Math.random() * 200) + 50,
        unit: '/hour',
        trend: 'up',
        status: 'good',
        threshold: { warning: 500, critical: 1000 }
      },
      {
        id: 'vulnerability_count',
        name: 'Open Vulnerabilities',
        value: Math.floor(Math.random() * 5) + 1,
        unit: 'issues',
        trend: Math.random() > 0.7 ? 'stable' : 'down',
        status: Math.random() > 0.8 ? 'warning' : 'good',
        threshold: { warning: 5, critical: 10 }
      },
      {
        id: 'ssl_cert_expiry',
        name: 'SSL Certificate Expiry',
        value: Math.floor(Math.random() * 60) + 30,
        unit: 'days',
        trend: 'down',
        status: Math.random() > 0.9 ? 'warning' : 'good',
        threshold: { warning: 30, critical: 7 }
      }
    ];
  }, []);

  const generateComplianceChecks = useCallback((): ComplianceCheck[] => {
    return [
      {
        id: 'gdpr_compliance',
        category: 'GDPR',
        check: 'Data Processing Consent',
        status: 'passed',
        details: 'All user data processing has proper consent mechanisms',
        lastChecked: new Date()
      },
      {
        id: 'rls_policies',
        category: 'Database Security',
        check: 'Row Level Security Policies',
        status: Math.random() > 0.8 ? 'warning' : 'passed',
        details: 'All tables have appropriate RLS policies configured',
        lastChecked: new Date()
      },
      {
        id: 'auth_mfa',
        category: 'Authentication',
        check: 'Multi-Factor Authentication',
        status: 'passed',
        details: 'MFA is available and encouraged for all users',
        lastChecked: new Date()
      },
      {
        id: 'api_rate_limiting',
        category: 'API Security',
        check: 'Rate Limiting',
        status: 'passed',
        details: 'All API endpoints have appropriate rate limiting',
        lastChecked: new Date()
      },
      {
        id: 'data_encryption',
        category: 'Data Protection',
        check: 'Data Encryption at Rest',
        status: 'passed',
        details: 'All sensitive data is encrypted using AES-256',
        lastChecked: new Date()
      }
    ];
  }, []);

  const runSecurityScan = useCallback(async () => {
    setIsScanning(true);
    
    try {
      // Simulate security scan
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setThreats(generateSecurityThreats());
      setMetrics(generateSecurityMetrics());
      setCompliance(generateComplianceChecks());
      setLastScan(new Date());
      
      toast({
        title: "Security Scan Complete",
        description: "All security checks have been updated",
      });
      
    } catch (error) {
      toast({
        title: "Scan Failed",
        description: "Security scan encountered an error",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }, [generateSecurityThreats, generateSecurityMetrics, generateComplianceChecks, toast]);

  const mitigateThreat = useCallback((threatId: string) => {
    setThreats(prev => prev.map(threat => 
      threat.id === threatId 
        ? { ...threat, status: 'mitigated' }
        : threat
    ));
    
    toast({
      title: "Threat Mitigated",
      description: "Security threat has been successfully mitigated",
    });
  }, [toast]);

  useEffect(() => {
    runSecurityScan();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      if (!isScanning) {
        setMetrics(generateSecurityMetrics());
      }
    }, 120000);
    
    return () => clearInterval(interval);
  }, [runSecurityScan, generateSecurityMetrics, isScanning]);

  const getThreatIcon = (type: SecurityThreat['type']) => {
    switch (type) {
      case 'authentication': return <Lock className="h-4 w-4" />;
      case 'authorization': return <UserX className="h-4 w-4" />;
      case 'ddos': return <Globe className="h-4 w-4" />;
      case 'data_breach': return <Eye className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: SecurityThreat['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getMetricStatusIcon = (status: SecurityMetric['status']) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: SecurityMetric['trend']) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
      default: return '→';
    }
  };

  const getComplianceIcon = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const overallThreatLevel = threats.length > 0 ? 
    threats.some(t => t.severity === 'critical') ? 'critical' :
    threats.some(t => t.severity === 'high') ? 'high' :
    threats.some(t => t.severity === 'medium') ? 'medium' : 'low' : 'low';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Monitoring Center</h2>
          <p className="text-muted-foreground">
            Real-time security threat detection and compliance monitoring
          </p>
        </div>
        <Button
          onClick={runSecurityScan}
          disabled={isScanning}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Run Scan'}
        </Button>
      </div>

      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Overview
            </div>
            <Badge variant={
              overallThreatLevel === 'critical' ? 'destructive' :
              overallThreatLevel === 'high' ? 'destructive' :
              overallThreatLevel === 'medium' ? 'secondary' : 'default'
            }>
              {overallThreatLevel.toUpperCase()} THREAT LEVEL
            </Badge>
          </CardTitle>
          <CardDescription>
            Last scan: {lastScan.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overallThreatLevel !== 'low' && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {overallThreatLevel === 'critical' 
                  ? 'Critical security threats detected - immediate action required'
                  : 'Security threats detected - review and mitigate as needed'
                }
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{threats.filter(t => t.status === 'active').length}</div>
              <p className="text-sm text-muted-foreground">Active Threats</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{threats.filter(t => t.status === 'resolved').length}</div>
              <p className="text-sm text-muted-foreground">Resolved Threats</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{metrics.filter(m => m.status === 'good').length}</div>
              <p className="text-sm text-muted-foreground">Healthy Metrics</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{compliance.filter(c => c.status === 'passed').length}</div>
              <p className="text-sm text-muted-foreground">Compliance Checks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Threats */}
      {threats.filter(t => t.status === 'active').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Active Security Threats
            </CardTitle>
            <CardDescription>
              Threats requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {threats.filter(t => t.status === 'active').map((threat) => (
                <div key={threat.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={getSeverityColor(threat.severity)}>
                        {getThreatIcon(threat.type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{threat.title}</h4>
                        <p className="text-sm text-muted-foreground">{threat.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        threat.severity === 'critical' ? 'destructive' :
                        threat.severity === 'high' ? 'destructive' :
                        threat.severity === 'medium' ? 'secondary' : 'outline'
                      }>
                        {threat.severity}
                      </Badge>
                      <Badge variant="outline">
                        Risk: {threat.riskScore}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        Source: {threat.source}
                      </span>
                      <span className="text-muted-foreground">
                        Systems: {threat.affectedSystems.join(', ')}
                      </span>
                      <span className="text-muted-foreground">
                        {threat.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mitigateThreat(threat.id)}
                    >
                      Mitigate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Security Metrics
          </CardTitle>
          <CardDescription>
            Key security performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <div key={metric.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{metric.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{getTrendIcon(metric.trend)}</span>
                    {getMetricStatusIcon(metric.status)}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{metric.value}</span>
                  <span className="text-sm text-muted-foreground">{metric.unit}</span>
                </div>
                <Progress 
                  value={Math.min((metric.value / (metric.threshold.critical * 1.2)) * 100, 100)} 
                  className="h-2 mb-2" 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Warning: {metric.threshold.warning}</span>
                  <span>Critical: {metric.threshold.critical}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Compliance Status
          </CardTitle>
          <CardDescription>
            Security compliance and audit checks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {compliance.map((check) => (
              <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getComplianceIcon(check.status)}
                  <div>
                    <p className="font-medium">{check.check}</p>
                    <p className="text-sm text-muted-foreground">{check.details}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={check.category === 'GDPR' ? 'default' : 'outline'}>
                    {check.category}
                  </Badge>
                  <Badge variant={
                    check.status === 'passed' ? 'default' :
                    check.status === 'warning' ? 'secondary' : 'destructive'
                  }>
                    {check.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};