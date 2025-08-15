import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { securityDocumentationService, SecurityMetrics, SecurityFinding } from '@/services/securityDocumentationService';

interface SecurityMonitoringConfig {
  scanInterval?: number; // milliseconds
  alertThreshold?: number; // number of issues before alerting
  enableRealTimeMonitoring?: boolean;
}

interface SecurityScanResult {
  scanId: string;
  timestamp: Date;
  metrics: SecurityMetrics;
  findings: SecurityFinding[];
  newIssues: SecurityFinding[];
  resolvedIssues: SecurityFinding[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export function useSecurityMonitoring(config: SecurityMonitoringConfig = {}) {
  const { toast } = useToast();
  const {
    scanInterval = 6 * 60 * 60 * 1000, // 6 hours
    alertThreshold = 1,
    enableRealTimeMonitoring = true
  } = config;

  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<SecurityScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<SecurityScanResult[]>([]);
  const [monitoringActive, setMonitoringActive] = useState(enableRealTimeMonitoring);

  /**
   * Perform a comprehensive security scan
   */
  const runSecurityScan = useCallback(async (): Promise<SecurityScanResult> => {
    setIsScanning(true);
    
    try {
      // Get current security state
      const findings = securityDocumentationService.getSecurityFindings();
      const metrics = securityDocumentationService.calculateSecurityMetrics();
      
      // Compare with last scan to find changes
      const newIssues: SecurityFinding[] = [];
      const resolvedIssues: SecurityFinding[] = [];
      
      if (lastScan) {
        // Find new issues
        findings.forEach(finding => {
          const existingIssue = lastScan.findings.find(f => f.id === finding.id);
          if (!existingIssue && finding.status !== 'resolved') {
            newIssues.push(finding);
          }
        });

        // Find resolved issues
        lastScan.findings.forEach(oldFinding => {
          const currentIssue = findings.find(f => f.id === oldFinding.id);
          if (currentIssue && oldFinding.status !== 'resolved' && currentIssue.status === 'resolved') {
            resolvedIssues.push(currentIssue);
          }
        });
      }

      // Determine risk level
      const criticalCount = findings.filter(f => f.severity === 'critical' && f.status !== 'resolved').length;
      const highCount = findings.filter(f => f.severity === 'high' && f.status !== 'resolved').length;
      
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (criticalCount > 0) riskLevel = 'critical';
      else if (highCount > 0) riskLevel = 'high';
      else if (findings.filter(f => f.severity === 'medium' && f.status !== 'resolved').length > 2) riskLevel = 'medium';

      const result: SecurityScanResult = {
        scanId: `scan_${Date.now()}`,
        timestamp: new Date(),
        metrics,
        findings,
        newIssues,
        resolvedIssues,
        riskLevel
      };

      // Update scan history
      setScanHistory(prev => [...prev.slice(-9), result]); // Keep last 10 scans
      setLastScan(result);

      // Alert on significant changes
      if (newIssues.length >= alertThreshold) {
        toast({
          title: "New Security Issues Detected",
          description: `${newIssues.length} new security issue(s) found during automated scan.`,
          variant: "destructive"
        });
      }

      if (resolvedIssues.length > 0) {
        toast({
          title: "Security Issues Resolved",
          description: `${resolvedIssues.length} security issue(s) have been resolved.`,
        });
      }

      return result;
    } catch (error) {
      console.error('Security scan failed:', error);
      throw error;
    } finally {
      setIsScanning(false);
    }
  }, [lastScan, alertThreshold, toast]);

  /**
   * Generate security alert based on scan results
   */
  const generateSecurityAlert = useCallback((scanResult: SecurityScanResult) => {
    const { riskLevel, newIssues, metrics } = scanResult;
    
    if (riskLevel === 'critical' || riskLevel === 'high') {
      return {
        title: `${riskLevel.toUpperCase()} Security Risk Detected`,
        message: `Security scan identified ${newIssues.length} new ${riskLevel} severity issues. Immediate attention required.`,
        severity: riskLevel,
        actionRequired: true
      };
    }

    if (metrics.compliancePercentage < 80) {
      return {
        title: 'Security Compliance Below Threshold',
        message: `Current compliance at ${metrics.compliancePercentage}%. Review and address outstanding security issues.`,
        severity: 'medium' as const,
        actionRequired: true
      };
    }

    return null;
  }, []);

  /**
   * Start automated monitoring
   */
  const startMonitoring = useCallback(() => {
    setMonitoringActive(true);
  }, []);

  /**
   * Stop automated monitoring
   */
  const stopMonitoring = useCallback(() => {
    setMonitoringActive(false);
  }, []);

  /**
   * Get security trend analysis
   */
  const getSecurityTrend = useCallback(() => {
    if (scanHistory.length < 2) return null;

    const recent = scanHistory.slice(-5); // Last 5 scans
    const complianceScores = recent.map(scan => scan.metrics.compliancePercentage);
    const avgCompliance = complianceScores.reduce((sum, score) => sum + score, 0) / complianceScores.length;
    
    const latestCompliance = complianceScores[complianceScores.length - 1];
    const previousCompliance = complianceScores[complianceScores.length - 2];
    
    const trend = latestCompliance > previousCompliance ? 'improving' : 
                  latestCompliance < previousCompliance ? 'declining' : 'stable';

    return {
      trend,
      averageCompliance: avgCompliance,
      latestCompliance,
      previousCompliance,
      scanCount: recent.length
    };
  }, [scanHistory]);

  /**
   * Export monitoring data
   */
  const exportMonitoringData = useCallback((format: 'json' | 'csv' = 'json') => {
    const data = {
      monitoringPeriod: {
        start: scanHistory[0]?.timestamp || new Date(),
        end: lastScan?.timestamp || new Date()
      },
      totalScans: scanHistory.length,
      currentMetrics: lastScan?.metrics,
      securityTrend: getSecurityTrend(),
      scanHistory: scanHistory.map(scan => ({
        scanId: scan.scanId,
        timestamp: scan.timestamp,
        riskLevel: scan.riskLevel,
        compliancePercentage: scan.metrics.compliancePercentage,
        issueCount: scan.findings.filter(f => f.status !== 'resolved').length
      }))
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // Simple CSV export
    const headers = ['Scan ID', 'Timestamp', 'Risk Level', 'Compliance %', 'Open Issues'];
    const rows = data.scanHistory.map(scan => [
      scan.scanId,
      scan.timestamp.toISOString(),
      scan.riskLevel,
      scan.compliancePercentage,
      scan.issueCount
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }, [scanHistory, lastScan, getSecurityTrend]);

  // Set up automated scanning
  useEffect(() => {
    if (!monitoringActive) return;

    const interval = setInterval(() => {
      runSecurityScan().catch(error => {
        console.error('Automated security scan failed:', error);
        toast({
          title: "Security Scan Failed",
          description: "Automated security monitoring encountered an error.",
          variant: "destructive"
        });
      });
    }, scanInterval);

    // Run initial scan
    if (!lastScan) {
      runSecurityScan();
    }

    return () => clearInterval(interval);
  }, [monitoringActive, scanInterval, runSecurityScan, lastScan, toast]);

  return {
    // State
    isScanning,
    lastScan,
    scanHistory,
    monitoringActive,
    
    // Actions
    runSecurityScan,
    startMonitoring,
    stopMonitoring,
    
    // Utilities
    generateSecurityAlert,
    getSecurityTrend,
    exportMonitoringData,
    
    // Computed values
    currentRiskLevel: lastScan?.riskLevel || 'low',
    compliancePercentage: lastScan?.metrics.compliancePercentage || 0,
    openIssuesCount: lastScan?.findings.filter(f => f.status !== 'resolved').length || 0,
    platformLimitationsCount: lastScan?.findings.filter(f => f.status === 'platform_limitation').length || 0
  };
}