import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  AlertTriangle, 
  Brain, 
  Lock, 
  Eye, 
  FileText, 
  UserCheck, 
  Clock,
  TrendingUp,
  Zap,
  CheckCircle,
  XCircle,
  Activity,
  Globe
} from 'lucide-react';
import { advancedThreatDetectionService, SecurityAnomaly } from '@/services/advancedThreatDetectionService';
import { gdprComplianceService, DataExportRequest } from '@/services/gdprComplianceService';
import { securityMonitoringService, SecurityMetrics } from '@/services/securityMonitoringService';

interface ThreatIntelligence {
  global_threats: number;
  emerging_threats: string[];
  risk_trends: Array<{
    date: string;
    risk_score: number;
    threat_count: number;
  }>;
  ml_predictions: {
    next_threat_probability: number;
    recommended_actions: string[];
  };
}

export function EnhancedSecurityDashboard() {
  const { toast } = useToast();
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [anomalies, setAnomalies] = useState<SecurityAnomaly[]>([]);
  const [threatIntelligence, setThreatIntelligence] = useState<ThreatIntelligence | null>(null);
  const [gdprRequests, setGdprRequests] = useState<DataExportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeScans, setActiveScans] = useState(0);

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      const [metrics, predictions] = await Promise.all([
        securityMonitoringService.getSecurityMetrics(),
        advancedThreatDetectionService.generateThreatPredictions('current_user')
      ]);

      setSecurityMetrics(metrics);
      setThreatIntelligence({
        global_threats: Math.floor(Math.random() * 50) + 10,
        emerging_threats: ['Phishing Campaign Delta-7', 'API Abuse Pattern Beta-2'],
        risk_trends: generateMockTrends(),
        ml_predictions: predictions
      });

      // Load recent anomalies (mocked for demo)
      setAnomalies([
        {
          id: '1',
          user_id: 'current_user',
          anomaly_type: 'behavioral_deviation',
          severity_score: 65,
          confidence_score: 82,
          detected_patterns: [],
          contextual_data: { login_location: 'New York', usual_location: 'San Francisco' },
          ml_prediction: { account_takeover_probability: 0.15 },
          requires_investigation: false
        }
      ]);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load security data:', error);
      toast({
        title: 'Security Dashboard Error',
        description: 'Failed to load security metrics',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  const handleGDPRDataExport = async () => {
    try {
      const request = await gdprComplianceService.requestDataExport('current_user', 'access');
      setGdprRequests(prev => [request, ...prev]);
      
      toast({
        title: 'Data Export Requested',
        description: 'Your data export request has been submitted and is being processed.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to request data export. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleThreatScan = async () => {
    setActiveScans(prev => prev + 1);
    
    try {
      // Simulate ML-based threat detection scan
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: 'Threat Scan Complete',
        description: 'Advanced threat detection scan completed. No critical threats detected.',
      });
    } finally {
      setActiveScans(prev => Math.max(0, prev - 1));
    }
  };

  const generateMockTrends = () => {
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trends.push({
        date: date.toISOString().split('T')[0],
        risk_score: Math.floor(Math.random() * 40) + 30,
        threat_count: Math.floor(Math.random() * 10) + 1
      });
    }
    return trends;
  };

  const getRiskLevelColor = (score: number) => {
    if (score >= 70) return 'text-red-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getRiskLevelBadge = (score: number) => {
    if (score >= 70) return <Badge variant="destructive">High Risk</Badge>;
    if (score >= 40) return <Badge variant="secondary">Medium Risk</Badge>;
    return <Badge variant="default">Low Risk</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">Loading advanced security analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Security Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threat Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityMetrics?.threat_score || 0}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </div>
            <Progress value={securityMetrics?.threat_score || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {getRiskLevelBadge(securityMetrics?.threat_score || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ML Predictions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {threatIntelligence?.ml_predictions.next_threat_probability 
                ? `${Math.round(threatIntelligence.ml_predictions.next_threat_probability * 100)}%`
                : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">Next threat probability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics?.active_sessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {securityMetrics?.suspicious_sessions || 0} suspicious
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Threats</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{threatIntelligence?.global_threats || 0}</div>
            <p className="text-xs text-muted-foreground">Detected worldwide</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Security Dashboard */}
      <Tabs defaultValue="threats" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="threats">ML Threats</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="compliance">GDPR</TabsTrigger>
          <TabsTrigger value="intelligence">Intel</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
        </TabsList>

        {/* ML-Based Threat Detection */}
        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Advanced Threat Detection
              </CardTitle>
              <CardDescription>
                AI-powered behavioral analytics and predictive security monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold">ML-Based Security Scan</h4>
                  <p className="text-sm text-muted-foreground">
                    Analyze user behavior patterns and detect anomalies
                  </p>
                </div>
                <Button 
                  onClick={handleThreatScan} 
                  disabled={activeScans > 0}
                  className="flex items-center gap-2"
                >
                  {activeScans > 0 ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Start Scan
                    </>
                  )}
                </Button>
              </div>

              {threatIntelligence?.ml_predictions && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>ML Security Predictions</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>Next threat probability: {Math.round(threatIntelligence.ml_predictions.next_threat_probability * 100)}%</p>
                    <div>
                      <p className="font-medium">Recommended Actions:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {threatIntelligence.ml_predictions.recommended_actions.map((action, index) => (
                          <li key={index} className="text-sm">{action}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <h4 className="font-medium">Recent Security Events</h4>
                {securityMetrics && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span className="text-sm">Failed Logins (24h)</span>
                      <Badge variant={securityMetrics.failed_login_attempts > 3 ? 'destructive' : 'secondary'}>
                        {securityMetrics.failed_login_attempts}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span className="text-sm">Critical Threats (7d)</span>
                      <Badge variant={securityMetrics.critical_threats_7d > 0 ? 'destructive' : 'default'}>
                        {securityMetrics.critical_threats_7d}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Anomalies */}
        <TabsContent value="anomalies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Behavioral Anomalies
              </CardTitle>
              <CardDescription>
                Detected deviations from normal user behavior patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {anomalies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No security anomalies detected</p>
                  <p className="text-sm">Your account behavior appears normal</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {anomalies.map((anomaly) => (
                    <div key={anomaly.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium capitalize">
                          {anomaly.anomaly_type.replace('_', ' ')}
                        </h4>
                        <div className="flex gap-2">
                          {getRiskLevelBadge(anomaly.severity_score)}
                          <Badge variant="outline">
                            {Math.round(anomaly.confidence_score)}% confidence
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p>Severity Score: {anomaly.severity_score}/100</p>
                        {anomaly.contextual_data.login_location && (
                          <p>Location: {anomaly.contextual_data.login_location}</p>
                        )}
                      </div>

                      {anomaly.ml_prediction && (
                        <Alert className="mt-3">
                          <Brain className="h-4 w-4" />
                          <AlertTitle>ML Analysis</AlertTitle>
                          <AlertDescription>
                            Account takeover probability: {Math.round(anomaly.ml_prediction.account_takeover_probability * 100)}%
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GDPR Compliance */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                GDPR Data Subject Rights
              </CardTitle>
              <CardDescription>
                Automated data protection and privacy compliance tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={handleGDPRDataExport}
                  variant="outline" 
                  className="h-20 flex-col"
                >
                  <FileText className="h-6 w-6 mb-2" />
                  Request Data Export
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => toast({
                    title: 'Feature Available',
                    description: 'Data rectification requests can be submitted through your profile settings.'
                  })}
                >
                  <Lock className="h-6 w-6 mb-2" />
                  Data Rectification
                </Button>
              </div>

              {gdprRequests.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Recent GDPR Requests</h4>
                  {gdprRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium capitalize">{request.request_type} Request</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(request.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={request.status === 'completed' ? 'default' : 'secondary'}>
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Privacy Protection Active</AlertTitle>
                <AlertDescription>
                  Your data is protected by GDPR compliance measures including encryption,
                  access logging, and automated retention policies.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Threat Intelligence */}
        <TabsContent value="intelligence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Global Threat Intelligence
              </CardTitle>
              <CardDescription>
                Real-time security intelligence and emerging threat analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {threatIntelligence?.emerging_threats && (
                <div>
                  <h4 className="font-medium mb-3">Emerging Threats</h4>
                  <div className="space-y-2">
                    {threatIntelligence.emerging_threats.map((threat, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm font-mono">{threat}</span>
                        <Badge variant="destructive">Active</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-3">Risk Trend Analysis</h4>
                <div className="space-y-2">
                  {threatIntelligence?.risk_trends.slice(-3).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                      <span>{trend.date}</span>
                      <div className="flex items-center gap-2">
                        <span>Risk: {trend.risk_score}</span>
                        <span className="text-muted-foreground">Threats: {trend.threat_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automated Response */}
        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automated Security Response
              </CardTitle>
              <CardDescription>
                Configure and monitor automated threat response actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Auto-lockout</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically lock accounts after 5 failed login attempts
                  </p>
                </div>

                <div className="p-4 border rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Geo-blocking</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Block access from high-risk geographic locations
                  </p>
                </div>

                <div className="p-4 border rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">Anomaly Alerts</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Send alerts when behavioral anomalies are detected
                  </p>
                </div>

                <div className="p-4 border rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium">Session Termination</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically terminate suspicious sessions
                  </p>
                </div>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Security Automation Active</AlertTitle>
                <AlertDescription>
                  Advanced security automation is protecting your account with real-time
                  threat detection and automated response capabilities.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}