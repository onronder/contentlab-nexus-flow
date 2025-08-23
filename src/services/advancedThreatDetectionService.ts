import { supabase } from '@/integrations/supabase/client';
import { securityMonitoringService } from './securityMonitoringService';

// ============================================================================
// ADVANCED THREAT DETECTION SERVICE - ML-Based Security Analytics
// ============================================================================

export interface ThreatPattern {
  id: string;
  pattern_name: string;
  pattern_type: 'behavioral' | 'statistical' | 'temporal' | 'geospatial';
  severity_weight: number;
  detection_rules: Record<string, any>;
  confidence_threshold: number;
}

export interface BehavioralProfile {
  user_id: string;
  typical_login_times: number[];
  typical_locations: string[];
  typical_devices: string[];
  activity_patterns: Record<string, any>;
  risk_baseline: number;
  last_updated: string;
}

export interface SecurityAnomaly {
  id: string;
  user_id: string;
  anomaly_type: string;
  severity_score: number;
  confidence_score: number;
  detected_patterns: ThreatPattern[];
  contextual_data: Record<string, any>;
  ml_prediction: Record<string, any>;
  requires_investigation: boolean;
}

export class AdvancedThreatDetectionService {
  private static instance: AdvancedThreatDetectionService;
  private behavioralProfiles: Map<string, BehavioralProfile> = new Map();
  private threatPatterns: ThreatPattern[] = [];

  public static getInstance(): AdvancedThreatDetectionService {
    if (!this.instance) {
      this.instance = new AdvancedThreatDetectionService();
    }
    return this.instance;
  }

  constructor() {
    this.initializeThreatPatterns();
  }

  // ============================================================================
  // ML-BASED ANOMALY DETECTION
  // ============================================================================

  /**
   * Analyze user behavior for anomalies using ML algorithms
   */
  async analyzeUserBehavior(userId: string, sessionData: Record<string, any>): Promise<SecurityAnomaly | null> {
    try {
      const profile = await this.getUserBehavioralProfile(userId);
      const anomalies = await this.detectBehavioralAnomalies(profile, sessionData);
      
      if (anomalies.length > 0) {
        const severityScore = this.calculateAnomalySeverity(anomalies);
        const confidenceScore = this.calculateConfidenceScore(anomalies);
        
        const anomaly: SecurityAnomaly = {
          id: crypto.randomUUID(),
          user_id: userId,
          anomaly_type: 'behavioral_deviation',
          severity_score: severityScore,
          confidence_score: confidenceScore,
          detected_patterns: anomalies,
          contextual_data: sessionData,
          ml_prediction: await this.generateMLPrediction(profile, sessionData),
          requires_investigation: severityScore > 70
        };

        if (anomaly.requires_investigation) {
          await this.triggerSecurityAlert(anomaly);
        }

        return anomaly;
      }

      return null;
    } catch (error) {
      console.error('Behavioral analysis error:', error);
      return null;
    }
  }

  /**
   * Detect temporal anomalies in user activity
   */
  async analyzeTemporalPatterns(userId: string, activityData: any[]): Promise<SecurityAnomaly | null> {
    try {
      const profile = await this.getUserBehavioralProfile(userId);
      
      // Analyze login time patterns
      const currentHour = new Date().getHours();
      const typicalHours = profile?.typical_login_times || [];
      
      if (typicalHours.length > 0) {
        const isUnusualTime = !typicalHours.some(hour => Math.abs(hour - currentHour) <= 2);
        
        if (isUnusualTime) {
          const anomaly: SecurityAnomaly = {
            id: crypto.randomUUID(),
            user_id: userId,
            anomaly_type: 'temporal_anomaly',
            severity_score: 45,
            confidence_score: 85,
            detected_patterns: this.threatPatterns.filter(p => p.pattern_type === 'temporal'),
            contextual_data: {
              current_hour: currentHour,
              typical_hours: typicalHours,
              deviation_score: Math.min(Math.abs(currentHour - typicalHours[0]), 12) / 12 * 100
            },
            ml_prediction: { unusual_time_access: true, risk_level: 'medium' },
            requires_investigation: false
          };

          await securityMonitoringService.monitorSecurityEvent(
            'temporal_anomaly',
            anomaly.contextual_data,
            'warning'
          );

          return anomaly;
        }
      }

      return null;
    } catch (error) {
      console.error('Temporal analysis error:', error);
      return null;
    }
  }

  /**
   * Analyze geographical access patterns
   */
  async analyzeGeospatialPatterns(userId: string, ipAddress: string): Promise<SecurityAnomaly | null> {
    try {
      const profile = await this.getUserBehavioralProfile(userId);
      const locationInfo = await this.getLocationFromIP(ipAddress);
      
      if (profile?.typical_locations && locationInfo) {
        const isUnusualLocation = !profile.typical_locations.some(loc => 
          this.calculateDistance(loc, locationInfo.location) < 100 // 100km threshold
        );
        
        if (isUnusualLocation) {
          const anomaly: SecurityAnomaly = {
            id: crypto.randomUUID(),
            user_id: userId,
            anomaly_type: 'geospatial_anomaly',
            severity_score: 60,
            confidence_score: 90,
            detected_patterns: this.threatPatterns.filter(p => p.pattern_type === 'geospatial'),
            contextual_data: {
              current_location: locationInfo.location,
              typical_locations: profile.typical_locations,
              distance_from_nearest: Math.min(...profile.typical_locations.map(loc => 
                this.calculateDistance(loc, locationInfo.location)
              ))
            },
            ml_prediction: { 
              location_risk: 'high',
              vpn_detected: locationInfo.is_vpn,
              country_risk_score: locationInfo.risk_score
            },
            requires_investigation: true
          };

          await securityMonitoringService.monitorSecurityEvent(
            'geospatial_anomaly',
            anomaly.contextual_data,
            'critical'
          );

          return anomaly;
        }
      }

      return null;
    } catch (error) {
      console.error('Geospatial analysis error:', error);
      return null;
    }
  }

  // ============================================================================
  // PREDICTIVE ANALYTICS
  // ============================================================================

  /**
   * Generate ML-based threat predictions
   */
  async generateThreatPredictions(userId: string): Promise<any> {
    try {
      const recentEvents = await this.getRecentSecurityEvents(userId);
      const profile = await this.getUserBehavioralProfile(userId);
      
      // Simple ML prediction algorithm (in production, use proper ML models)
      const threatFactors = {
        failed_logins: recentEvents.filter(e => e.event_type === 'login_failed').length,
        permission_denials: recentEvents.filter(e => e.event_type === 'permission_denied').length,
        unusual_locations: recentEvents.filter(e => e.event_type === 'geospatial_anomaly').length,
        session_anomalies: recentEvents.filter(e => e.event_type === 'behavioral_deviation').length
      };

      const riskScore = (
        threatFactors.failed_logins * 15 +
        threatFactors.permission_denials * 20 +
        threatFactors.unusual_locations * 25 +
        threatFactors.session_anomalies * 10
      );

      const prediction = {
        risk_score: Math.min(riskScore, 100),
        risk_level: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
        predicted_threats: this.predictLikelyThreats(threatFactors),
        recommended_actions: this.generateSecurityRecommendations(riskScore),
        confidence: this.calculatePredictionConfidence(recentEvents.length)
      };

      // Store prediction for trend analysis
      await this.storeThreatPrediction(userId, prediction);

      return prediction;
    } catch (error) {
      console.error('Threat prediction error:', error);
      throw error;
    }
  }

  // ============================================================================
  // BEHAVIORAL PROFILING
  // ============================================================================

  /**
   * Update user behavioral profile with new activity
   */
  async updateBehavioralProfile(userId: string, activityData: Record<string, any>): Promise<void> {
    try {
      let profile = await this.getUserBehavioralProfile(userId);
      
      if (!profile) {
        profile = {
          user_id: userId,
          typical_login_times: [],
          typical_locations: [],
          typical_devices: [],
          activity_patterns: {},
          risk_baseline: 50,
          last_updated: new Date().toISOString()
        };
      }

      // Update login times
      if (activityData.login_time) {
        const hour = new Date(activityData.login_time).getHours();
        profile.typical_login_times = this.updateTimePattern(profile.typical_login_times, hour);
      }

      // Update locations
      if (activityData.location) {
        profile.typical_locations = this.updateLocationPattern(profile.typical_locations, activityData.location);
      }

      // Update devices
      if (activityData.device_info) {
        profile.typical_devices = this.updateDevicePattern(profile.typical_devices, activityData.device_info);
      }

      // Calculate new risk baseline
      profile.risk_baseline = this.calculateRiskBaseline(profile);
      profile.last_updated = new Date().toISOString();

      // Store updated profile
      await this.storeBehavioralProfile(profile);
      this.behavioralProfiles.set(userId, profile);
    } catch (error) {
      console.error('Profile update error:', error);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getUserBehavioralProfile(userId: string): Promise<BehavioralProfile | null> {
    if (this.behavioralProfiles.has(userId)) {
      return this.behavioralProfiles.get(userId)!;
    }

    try {
      const { data } = await supabase
        .from('behavioral_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        const profile: BehavioralProfile = {
          user_id: userId,
          typical_login_times: data.behavior_data?.typical_login_times || [],
          typical_locations: data.behavior_data?.typical_locations || [],
          typical_devices: data.behavior_data?.typical_devices || [],
          activity_patterns: data.behavior_data?.activity_patterns || {},
          risk_baseline: data.behavior_data?.risk_baseline || 50,
          last_updated: data.created_at
        };

        this.behavioralProfiles.set(userId, profile);
        return profile;
      }
    } catch (error) {
      console.error('Failed to load behavioral profile:', error);
    }

    return null;
  }

  private async detectBehavioralAnomalies(profile: BehavioralProfile | null, sessionData: Record<string, any>): Promise<ThreatPattern[]> {
    const anomalies: ThreatPattern[] = [];

    if (!profile) return anomalies;

    // Device anomaly detection
    if (sessionData.device_info && !profile.typical_devices.some(device => 
      this.deviceSimilarity(device, sessionData.device_info) > 0.8)) {
      anomalies.push({
        id: 'device_anomaly',
        pattern_name: 'Unknown Device Access',
        pattern_type: 'behavioral',
        severity_weight: 0.6,
        detection_rules: { new_device: true },
        confidence_threshold: 0.8
      });
    }

    return anomalies;
  }

  private calculateAnomalySeverity(anomalies: ThreatPattern[]): number {
    return Math.min(anomalies.reduce((sum, a) => sum + (a.severity_weight * 100), 0), 100);
  }

  private calculateConfidenceScore(anomalies: ThreatPattern[]): number {
    if (anomalies.length === 0) return 0;
    return anomalies.reduce((sum, a) => sum + a.confidence_threshold, 0) / anomalies.length * 100;
  }

  private async generateMLPrediction(profile: BehavioralProfile | null, sessionData: Record<string, any>): Promise<Record<string, any>> {
    // Simplified ML prediction - in production, use trained models
    return {
      account_takeover_probability: profile ? 0.15 : 0.8,
      insider_threat_risk: 0.1,
      automated_attack_likelihood: 0.05,
      recommendation: 'monitor_closely'
    };
  }

  private async triggerSecurityAlert(anomaly: SecurityAnomaly): Promise<void> {
    await securityMonitoringService.monitorSecurityEvent(
      'security_anomaly_detected',
      {
        anomaly_type: anomaly.anomaly_type,
        severity_score: anomaly.severity_score,
        confidence_score: anomaly.confidence_score,
        detected_patterns: anomaly.detected_patterns.length
      },
      anomaly.severity_score > 80 ? 'critical' : 'warning'
    );
  }

  private async getLocationFromIP(ipAddress: string): Promise<any> {
    // Simplified location detection - in production, use geolocation services
    return {
      location: 'Unknown',
      is_vpn: false,
      risk_score: 30
    };
  }

  private calculateDistance(loc1: string, loc2: string): number {
    // Simplified distance calculation - in production, use proper geolocation
    return loc1 === loc2 ? 0 : 1000;
  }

  private async getRecentSecurityEvents(userId: string): Promise<any[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('security_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false });

    return data || [];
  }

  private predictLikelyThreats(factors: Record<string, number>): string[] {
    const threats: string[] = [];
    
    if (factors.failed_logins > 3) threats.push('brute_force_attack');
    if (factors.permission_denials > 2) threats.push('privilege_escalation');
    if (factors.unusual_locations > 0) threats.push('account_compromise');
    
    return threats;
  }

  private generateSecurityRecommendations(riskScore: number): string[] {
    if (riskScore > 70) {
      return ['force_password_reset', 'require_2fa', 'suspend_account'];
    } else if (riskScore > 40) {
      return ['increase_monitoring', 'require_verification', 'log_activities'];
    }
    return ['routine_monitoring'];
  }

  private calculatePredictionConfidence(eventCount: number): number {
    return Math.min(eventCount * 10, 90); // More events = higher confidence
  }

  private async storeThreatPrediction(userId: string, prediction: any): Promise<void> {
    await supabase
      .from('analytics_predictions')
      .insert({
        team_id: null, // User-level prediction
        prediction_type: 'security_threat',
        input_data: { user_id: userId },
        prediction_data: prediction,
        confidence_level: prediction.confidence / 100,
        model_version: '1.0'
      });
  }

  private updateTimePattern(existingTimes: number[], newHour: number): number[] {
    const updated = [...existingTimes, newHour];
    // Keep only last 30 login times for pattern analysis
    return updated.slice(-30);
  }

  private updateLocationPattern(existingLocations: string[], newLocation: string): string[] {
    if (!existingLocations.includes(newLocation)) {
      return [...existingLocations, newLocation].slice(-10); // Keep last 10 locations
    }
    return existingLocations;
  }

  private updateDevicePattern(existingDevices: string[], newDevice: string): string[] {
    if (!existingDevices.some(device => this.deviceSimilarity(device, newDevice) > 0.9)) {
      return [...existingDevices, newDevice].slice(-5); // Keep last 5 devices
    }
    return existingDevices;
  }

  private deviceSimilarity(device1: string, device2: string): number {
    // Simplified device similarity - in production, use proper fingerprinting
    return device1 === device2 ? 1 : 0;
  }

  private calculateRiskBaseline(profile: BehavioralProfile): number {
    // Calculate based on behavior consistency
    const locationConsistency = profile.typical_locations.length < 3 ? 20 : 40;
    const timeConsistency = profile.typical_login_times.length < 5 ? 20 : 40;
    const deviceConsistency = profile.typical_devices.length < 3 ? 20 : 40;
    
    return Math.min(locationConsistency + timeConsistency + deviceConsistency, 100);
  }

  private async storeBehavioralProfile(profile: BehavioralProfile): Promise<void> {
    await supabase
      .from('behavioral_analytics')
      .upsert({
        user_id: profile.user_id,
        behavior_type: 'user_profile',
        behavior_data: {
          typical_login_times: profile.typical_login_times,
          typical_locations: profile.typical_locations,
          typical_devices: profile.typical_devices,
          activity_patterns: profile.activity_patterns,
          risk_baseline: profile.risk_baseline
        },
        risk_score: profile.risk_baseline / 100,
        anomaly_detected: false
      });
  }

  private initializeThreatPatterns(): void {
    this.threatPatterns = [
      {
        id: 'brute_force_pattern',
        pattern_name: 'Brute Force Attack',
        pattern_type: 'behavioral',
        severity_weight: 0.9,
        detection_rules: { failed_attempts_threshold: 5, time_window: '10min' },
        confidence_threshold: 0.85
      },
      {
        id: 'privilege_escalation_pattern',
        pattern_name: 'Privilege Escalation Attempt',
        pattern_type: 'behavioral',
        severity_weight: 0.95,
        detection_rules: { permission_denials_threshold: 3, admin_resources: true },
        confidence_threshold: 0.9
      },
      {
        id: 'unusual_time_pattern',
        pattern_name: 'Unusual Access Time',
        pattern_type: 'temporal',
        severity_weight: 0.4,
        detection_rules: { outside_normal_hours: true, deviation_threshold: 3 },
        confidence_threshold: 0.7
      },
      {
        id: 'geo_anomaly_pattern',
        pattern_name: 'Geographical Anomaly',
        pattern_type: 'geospatial',
        severity_weight: 0.7,
        detection_rules: { distance_threshold: 100, vpn_detection: true },
        confidence_threshold: 0.8
      }
    ];
  }
}

export const advancedThreatDetectionService = AdvancedThreatDetectionService.getInstance();
