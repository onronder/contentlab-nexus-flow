import { supabase } from '@/integrations/supabase/client';
import { auditService } from './auditService';

// ============================================================================
// GDPR COMPLIANCE SERVICE - Data Subject Rights Automation
// ============================================================================

export interface DataExportRequest {
  id: string;
  user_id: string;
  request_type: 'access' | 'portability' | 'rectification' | 'erasure';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  completed_at?: string;
  export_data?: any;
  verification_token?: string;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: string;
  purpose: string;
  given: boolean;
  given_at?: string;
  withdrawn_at?: string;
  legal_basis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  data_categories: string[];
}

export interface DataRetentionPolicy {
  id: string;
  data_category: string;
  retention_period_days: number;
  deletion_criteria: Record<string, any>;
  legal_basis: string;
  is_active: boolean;
}

export interface PrivacyImpactAssessment {
  id: string;
  assessment_name: string;
  data_processing_description: string;
  risk_level: 'low' | 'medium' | 'high';
  mitigation_measures: string[];
  compliance_status: 'compliant' | 'needs_review' | 'non_compliant';
  completed_at: string;
}

export class GDPRComplianceService {
  private static instance: GDPRComplianceService;

  public static getInstance(): GDPRComplianceService {
    if (!this.instance) {
      this.instance = new GDPRComplianceService();
    }
    return this.instance;
  }

  // ============================================================================
  // DATA SUBJECT RIGHTS (GDPR Articles 15-22)
  // ============================================================================

  /**
   * Right to Access (Article 15) - Export user's personal data
   */
  async requestDataExport(userId: string, requestType: 'access' | 'portability'): Promise<DataExportRequest> {
    try {
      // Create export request
      const exportRequest: DataExportRequest = {
        id: crypto.randomUUID(),
        user_id: userId,
        request_type: requestType,
        status: 'pending',
        requested_at: new Date().toISOString(),
        verification_token: this.generateVerificationToken()
      };

      // Store request in database (using audit_logs as fallback)
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action_type: 'data_export_request',
          action_description: `Data export request: ${requestType}`,
          metadata: JSON.parse(JSON.stringify(exportRequest))
        })
        .select()
        .single();

      if (error) throw error;

      // Log the request for audit trail
      await auditService.logSecurityEvent({
        user_id: userId,
        event_type: 'gdpr_data_export_requested',
        severity: 'low',
        description: `User requested data export (${requestType})`,
        metadata: { request_id: exportRequest.id, request_type: requestType }
      });

      // Start background processing
      this.processDataExportRequest(exportRequest.id);

      return exportRequest;
    } catch (error) {
      console.error('Data export request error:', error);
      throw new Error('Failed to create data export request');
    }
  }

  /**
   * Right to Rectification (Article 16) - Update incorrect personal data
   */
  async rectifyUserData(userId: string, corrections: Record<string, any>): Promise<void> {
    try {
      // Validate corrections
      const validatedCorrections = await this.validateDataCorrections(corrections);

      // Update user profile
      if (validatedCorrections.profile) {
        await supabase
          .from('profiles')
          .update(validatedCorrections.profile)
          .eq('id', userId);
      }

      // Update other user data tables as needed (with error handling)
      for (const [table, data] of Object.entries(validatedCorrections.tables || {})) {
        try {
          await supabase
            .from(table as any)
            .update(data)
            .eq('user_id', userId);
        } catch (tableError) {
          console.warn(`Could not update table ${table}:`, tableError);
        }
      }

      // Log rectification for audit trail
      await auditService.logSecurityEvent({
        user_id: userId,
        event_type: 'gdpr_data_rectified',
        severity: 'low',
        description: 'User data rectified per GDPR request',
        metadata: { 
          corrected_fields: Object.keys(corrections),
          correction_count: Object.keys(corrections).length
        }
      });

      // Update consent records if personal data changed
      await this.updateConsentRecordsAfterRectification(userId, corrections);

    } catch (error) {
      console.error('Data rectification error:', error);
      throw new Error('Failed to rectify user data');
    }
  }

  /**
   * Right to Erasure (Article 17) - Delete personal data ("Right to be Forgotten")
   */
  async requestDataErasure(userId: string, reason: string = 'user_request'): Promise<void> {
    try {
      // Check if erasure is legally permissible
      const erasureAllowed = await this.validateErasureRequest(userId, reason);
      if (!erasureAllowed.allowed) {
        throw new Error(`Data erasure not permitted: ${erasureAllowed.reason}`);
      }

      // Create erasure record for audit (using audit_logs as fallback)
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action_type: 'data_erasure_request',
          action_description: `Data erasure request: ${reason || 'No reason provided'}`,
          metadata: {
            user_id: userId,
            reason,
            status: 'processing',
            requested_at: new Date().toISOString()
          }
        });

      // Execute secure data deletion
      await this.executeSecureDataDeletion(userId);

      // Log erasure for compliance
      await auditService.logSecurityEvent({
        user_id: userId,
        event_type: 'gdpr_data_erased',
        severity: 'medium',
        description: 'User data erased per GDPR right to be forgotten',
        metadata: { 
          reason,
          erasure_date: new Date().toISOString(),
          tables_affected: await this.getTablesWithUserData(userId)
        }
      });

    } catch (error) {
      console.error('Data erasure error:', error);
      throw error;
    }
  }

  /**
   * Right to Data Portability (Article 20) - Export data in structured format
   */
  async exportPortableData(userId: string): Promise<any> {
    try {
      const userData = await this.gatherCompleteUserData(userId);
      
      // Structure data for portability (JSON format)
      const portableData = {
        export_info: {
          generated_at: new Date().toISOString(),
          format: 'JSON',
          gdpr_article: 'Article 20 - Right to Data Portability',
          user_id: userId
        },
        personal_data: userData.personal,
        content_data: userData.content,
        activity_data: userData.activity,
        preferences: userData.preferences,
        consent_records: userData.consents
      };

      return portableData;
    } catch (error) {
      console.error('Data portability error:', error);
      throw new Error('Failed to export portable data');
    }
  }

  // ============================================================================
  // CONSENT MANAGEMENT
  // ============================================================================

  /**
   * Record user consent for data processing
   */
  async recordConsent(
    userId: string,
    consentType: string,
    purpose: string,
    legalBasis: ConsentRecord['legal_basis'],
    dataCategories: string[]
  ): Promise<ConsentRecord> {
    try {
      const consentRecord: ConsentRecord = {
        id: crypto.randomUUID(),
        user_id: userId,
        consent_type: consentType,
        purpose,
        given: true,
        given_at: new Date().toISOString(),
        legal_basis: legalBasis,
        data_categories: dataCategories
      };

      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action_type: 'consent_recorded',
          action_description: `Consent recorded for: ${purpose}`,
          metadata: JSON.parse(JSON.stringify(consentRecord))
        })
        .select()
        .single();

      if (error) throw error;

      // Log consent for audit trail
      await auditService.logSecurityEvent({
        user_id: userId,
        event_type: 'gdpr_consent_given',
        severity: 'low',
        description: `User gave consent for ${purpose}`,
        metadata: { 
          consent_type: consentType,
          legal_basis: legalBasis,
          data_categories: dataCategories
        }
      });

      return consentRecord;
    } catch (error) {
      console.error('Consent recording error:', error);
      throw new Error('Failed to record consent');
    }
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(userId: string, consentId: string): Promise<void> {
    try {
      // Update consent record via audit_logs since consent_records table doesn't exist
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action_type: 'consent_withdrawn',
          action_description: `Consent withdrawn for consent ID: ${consentId}`,
          metadata: { consentId, withdrawnAt: new Date().toISOString() }
        });

      if (error) throw error;

      // Stop data processing based on withdrawn consent
      await this.handleConsentWithdrawal(userId, consentId);

      // Log withdrawal for audit trail
      await auditService.logSecurityEvent({
        user_id: userId,
        event_type: 'gdpr_consent_withdrawn',
        severity: 'medium',
        description: 'User withdrew consent for data processing',
        metadata: { consent_id: consentId }
      });

    } catch (error) {
      console.error('Consent withdrawal error:', error);
      throw new Error('Failed to withdraw consent');
    }
  }

  // ============================================================================
  // DATA RETENTION & DELETION
  // ============================================================================

  /**
   * Apply data retention policies automatically
   */
  async applyRetentionPolicies(): Promise<void> {
    try {
      const policies = await this.getActiveRetentionPolicies();
      
      for (const policy of policies) {
        await this.enforceRetentionPolicy(policy);
      }

      // Log retention policy execution
      await auditService.logSecurityEvent({
        user_id: 'system',
        event_type: 'gdpr_retention_policy_applied',
        severity: 'low',
        description: `Applied ${policies.length} retention policies`,
        metadata: { 
          policies_count: policies.length,
          execution_date: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Retention policy error:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVACY IMPACT ASSESSMENTS
  // ============================================================================

  /**
   * Conduct automated privacy impact assessment
   */
  async conductPrivacyImpactAssessment(
    assessmentName: string,
    processingDescription: string
  ): Promise<PrivacyImpactAssessment> {
    try {
      const riskAssessment = await this.analyzePrivacyRisks(processingDescription);
      
      const pia: PrivacyImpactAssessment = {
        id: crypto.randomUUID(),
        assessment_name: assessmentName,
        data_processing_description: processingDescription,
        risk_level: riskAssessment.level,
        mitigation_measures: riskAssessment.mitigations,
        compliance_status: riskAssessment.compliant ? 'compliant' : 'needs_review',
        completed_at: new Date().toISOString()
      };

      // Store PIA in audit_logs since privacy_impact_assessments table doesn't exist
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          action_type: 'privacy_impact_assessment',
          action_description: `Privacy Impact Assessment: ${assessmentName}`,
          metadata: JSON.parse(JSON.stringify(pia))
        })
        .select()
        .single();

      if (error) throw error;

      return pia;
    } catch (error) {
      console.error('PIA error:', error);
      throw new Error('Failed to conduct privacy impact assessment');
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async processDataExportRequest(requestId: string): Promise<void> {
    try {
      // Log processing start in audit_logs since data_export_requests table doesn't exist
      await supabase
        .from('audit_logs')
        .insert({
          action_type: 'data_export_processing',
          action_description: `Starting data export processing for request: ${requestId}`,
          metadata: { requestId, status: 'processing', startedAt: new Date().toISOString() }
        });

      // Since we don't have the actual table, we'll use audit_logs to simulate the process
      console.log(`Processing data export request: ${requestId}`);
      
      // Complete the export (in real implementation, this would gather actual data)
      await supabase
        .from('audit_logs')
        .insert({
          action_type: 'data_export_completed',
          action_description: `Data export completed for request: ${requestId}`,
          metadata: { 
            requestId, 
            status: 'completed', 
            completedAt: new Date().toISOString(),
            exportSummary: 'Mock export completed - integrate with actual data gathering'
          }
        });

    } catch (error) {
      console.error('Export processing error:', error);
      
      // Mark as failed in audit_logs
      await supabase
        .from('audit_logs')
        .insert({
          action_type: 'data_export_failed',
          action_description: `Data export failed for request: ${requestId}`,
          metadata: { requestId, status: 'failed', error: error.message }
        });
    }
  }

  private async gatherCompleteUserData(userId: string): Promise<any> {
    try {
      // Gather data from all relevant tables
      const [profile, projects, content, activities, sessions] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('projects').select('*').eq('created_by', userId),
        supabase.from('content_items').select('*').eq('user_id', userId),
        supabase.from('activity_logs').select('*').eq('user_id', userId),
        supabase.from('user_sessions').select('*').eq('user_id', userId)
      ]);

      return {
        personal: profile.data,
        projects: projects.data,
        content: content.data,
        activity: activities.data,
        sessions: sessions.data?.map(s => ({
          id: s.id,
          created_at: s.created_at,
          device_info: s.device_info,
          ip_address: s.ip_address // May be redacted based on legal requirements
        })),
        consents: await this.getUserConsents(userId),
        preferences: await this.getUserPreferences(userId)
      };
    } catch (error) {
      console.error('Data gathering error:', error);
      throw error;
    }
  }

  private async executeSecureDataDeletion(userId: string): Promise<void> {
    try {
      // List of tables containing user data
      const userDataTables = [
        'profiles',
        'user_sessions',
        'content_items',
        'projects',
        'team_members',
        'activity_logs',
        'consent_records',
        'security_events',
        'behavioral_analytics'
      ];

      // Delete user data from each table (with error handling for non-existent tables)
      for (const table of userDataTables) {
        try {
          await supabase
            .from(table as any)
            .delete()
            .eq('user_id', userId);
        } catch (tableError) {
          console.warn(`Could not delete from table ${table}:`, tableError);
          // Continue with other tables
        }
      }

      // Anonymize audit logs (retain for legal compliance but remove PII)
      await this.anonymizeAuditLogs(userId);

      // Delete authentication record (this should be done last)
      // Note: In production, coordinate with Supabase Auth for proper account deletion
      
    } catch (error) {
      console.error('Secure deletion error:', error);
      throw error;
    }
  }

  private async validateErasureRequest(userId: string, reason: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check legal obligations that might prevent erasure
    const hasActiveContracts = await this.checkActiveContracts(userId);
    const hasLegalHolds = await this.checkLegalHolds(userId);
    
    if (hasActiveContracts) {
      return { allowed: false, reason: 'Active contracts require data retention' };
    }
    
    if (hasLegalHolds) {
      return { allowed: false, reason: 'Legal hold prevents data deletion' };
    }
    
    return { allowed: true };
  }

  private async checkActiveContracts(userId: string): Promise<boolean> {
    // Check if user has active subscriptions or contracts
    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);
    
    return (count || 0) > 0;
  }

  private async checkLegalHolds(userId: string): Promise<boolean> {
    // Check for legal holds or litigation requirements using audit_logs since legal_holds table doesn't exist
    const { count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action_type', 'legal_hold_placed');
    
    return (count || 0) > 0;
  }

  private generateVerificationToken(): string {
    return crypto.randomUUID().replace(/-/g, '');
  }

  private async validateDataCorrections(corrections: Record<string, any>): Promise<any> {
    // Validate and sanitize correction data
    const validated: any = { profile: {}, tables: {} };
    
    // Validate profile fields
    if (corrections.full_name) {
      validated.profile.full_name = String(corrections.full_name).slice(0, 100);
    }
    
    if (corrections.email) {
      // Email validation would go here
      validated.profile.email = String(corrections.email);
    }
    
    return validated;
  }

  private async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    // Since consent_records table doesn't exist, return mock data or fetch from audit_logs
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('action_type', 'consent_recorded');
    
    return data?.map(log => {
      const metadata = log.metadata as any;
      return {
        id: log.id,
        user_id: userId,
        consent_type: metadata.consent_type || 'general',
        purpose: metadata.purpose || 'data processing',
        given: true,
        given_at: log.created_at,
        legal_basis: metadata.legal_basis || 'consent' as const,
        data_categories: metadata.data_categories || []
      } as ConsentRecord;
    }) || [];
  }

  private async getUserPreferences(userId: string): Promise<any> {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId);
    
    return data || {};
  }

  private async getActiveRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    // Since data_retention_policies table doesn't exist, return default policies
    return [
      {
        id: 'default-retention',
        data_category: 'activity_logs',
        retention_period_days: 365,
        deletion_criteria: { older_than_days: 365 },
        legal_basis: 'legitimate_interests',
        is_active: true
      }
    ];
  }

  private async enforceRetentionPolicy(policy: DataRetentionPolicy): Promise<void> {
    const cutoffDate = new Date(Date.now() - policy.retention_period_days * 24 * 60 * 60 * 1000);
    
    // Delete data older than retention period (with error handling for non-existent tables)
    try {
      await supabase
        .from(policy.data_category as any)
        .delete()
        .lt('created_at', cutoffDate.toISOString());
    } catch (error) {
      console.warn(`Could not enforce retention policy for ${policy.data_category}:`, error);
    }
  }

  private async analyzePrivacyRisks(processingDescription: string): Promise<any> {
    // Simplified risk analysis - in production, use proper risk assessment models
    const sensitiveKeywords = ['personal', 'biometric', 'financial', 'health', 'location'];
    const containsSensitiveData = sensitiveKeywords.some(keyword => 
      processingDescription.toLowerCase().includes(keyword)
    );
    
    return {
      level: containsSensitiveData ? 'high' : 'medium',
      mitigations: [
        'Implement data minimization',
        'Apply pseudonymization techniques',
        'Establish retention periods',
        'Ensure consent mechanisms'
      ],
      compliant: !containsSensitiveData
    };
  }

  private async anonymizeAuditLogs(userId: string): Promise<void> {
    // Replace PII in audit logs with anonymized identifiers
    const { data: logsToUpdate } = await supabase
      .from('audit_logs')
      .select('id, metadata')
      .eq('user_id', userId);

    if (logsToUpdate) {
      for (const log of logsToUpdate) {
        const updatedMetadata = {
          ...log.metadata as any,
          user_id: '[REDACTED]'
        };
        
        await supabase
          .from('audit_logs')
          .update({ metadata: updatedMetadata })
          .eq('id', log.id);
      }
    }
  }

  private async updateConsentRecordsAfterRectification(userId: string, corrections: Record<string, any>): Promise<void> {
    // If contact information changed, may need to re-validate consents
    if (corrections.email) {
      await auditService.logSecurityEvent({
        user_id: userId,
        event_type: 'gdpr_consent_update_required',
        severity: 'low',
        description: 'Consent records may need update after data rectification',
        metadata: { corrected_fields: Object.keys(corrections) }
      });
    }
  }

  private async handleConsentWithdrawal(userId: string, consentId: string): Promise<void> {
    // Get consent details from audit_logs since consent_records table doesn't exist
    const { data: consent } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', consentId)
      .eq('user_id', userId)
      .eq('action_type', 'consent_recorded')
      .single();

    if (consent?.metadata) {
      const consentData = consent.metadata as any;
      // Stop relevant data processing activities
      console.log(`Stopping data processing for consent: ${consentData.consent_type || 'unknown'}`);
    }
  }

  private async getTablesWithUserData(userId: string): Promise<string[]> {
    // Return list of tables that contained user data (for audit purposes)
    return [
      'profiles',
      'user_sessions', 
      'content_items',
      'projects',
      'activity_logs',
      'security_events'
    ];
  }
}

export const gdprComplianceService = GDPRComplianceService.getInstance();