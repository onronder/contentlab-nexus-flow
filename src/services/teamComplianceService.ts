import { supabase } from "@/integrations/supabase/client";

export interface TeamCompliance {
  id: string;
  team_id: string;
  compliance_framework: 'gdpr' | 'soc2' | 'hipaa' | 'iso27001';
  status: 'compliant' | 'in_progress' | 'non_compliant' | 'under_review';
  last_audit_date?: string;
  next_audit_date?: string;
  findings: any[];
  remediation_plan: Record<string, any>;
  evidence_documents: any[];
  audit_score?: number;
  created_at: string;
  updated_at: string;
}

export interface ComplianceReport {
  framework: string;
  overall_score: number;
  compliance_areas: Array<{
    area: string;
    score: number;
    status: string;
    requirements: Array<{
      requirement: string;
      met: boolean;
      evidence?: string;
      notes?: string;
    }>;
  }>;
  recommendations: string[];
  next_actions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    deadline?: string;
  }>;
}

export class TeamComplianceService {
  /**
   * Get team compliance records
   */
  static async getTeamCompliance(teamId: string): Promise<TeamCompliance[]> {
    try {
      const { data, error } = await supabase
        .from('team_compliance')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team compliance:', error);
        throw new Error(`Failed to fetch team compliance: ${error.message}`);
      }

      return (data || []) as TeamCompliance[];
    } catch (error) {
      console.error('TeamComplianceService.getTeamCompliance error:', error);
      throw error;
    }
  }

  /**
   * Create or update compliance record
   */
  static async updateCompliance(
    teamId: string,
    framework: TeamCompliance['compliance_framework'],
    data: Partial<TeamCompliance>
  ): Promise<TeamCompliance> {
    try {
      const { data: existing } = await supabase
        .from('team_compliance')
        .select('*')
        .eq('team_id', teamId)
        .eq('compliance_framework', framework)
        .single();

      if (existing) {
        // Update existing record
        const { data: updated, error } = await supabase
          .from('team_compliance')
          .update(data)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update compliance: ${error.message}`);
        }
        return updated as TeamCompliance;
      } else {
        // Create new record
        const { data: created, error } = await supabase
          .from('team_compliance')
          .insert({
            team_id: teamId,
            compliance_framework: framework,
            ...data
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create compliance record: ${error.message}`);
        }
        return created as TeamCompliance;
      }
    } catch (error) {
      console.error('TeamComplianceService.updateCompliance error:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(
    teamId: string,
    framework: TeamCompliance['compliance_framework']
  ): Promise<ComplianceReport> {
    try {
      // Get compliance requirements based on framework
      const requirements = this.getFrameworkRequirements(framework);
      
      // Assess current compliance status
      const assessment = await this.assessCompliance(teamId, framework, requirements);
      
      // Generate report
      return {
        framework,
        overall_score: assessment.overall_score,
        compliance_areas: assessment.areas,
        recommendations: assessment.recommendations,
        next_actions: assessment.next_actions
      };
    } catch (error) {
      console.error('TeamComplianceService.generateComplianceReport error:', error);
      throw error;
    }
  }

  /**
   * Get framework requirements
   */
  private static getFrameworkRequirements(framework: TeamCompliance['compliance_framework']): any {
    const requirements = {
      gdpr: {
        'Data Protection': [
          'Data processing lawful basis documented',
          'Privacy notices in place',
          'Data subject rights procedures established',
          'Data protection impact assessments conducted',
          'Data retention policies defined'
        ],
        'Security': [
          'Technical and organizational measures implemented',
          'Encryption in transit and at rest',
          'Access controls and authentication',
          'Regular security assessments',
          'Incident response procedures'
        ],
        'Governance': [
          'Data protection officer appointed',
          'Staff training on data protection',
          'Regular compliance audits',
          'Third-party processor agreements',
          'Data breach notification procedures'
        ]
      },
      soc2: {
        'Security': [
          'Logical and physical access controls',
          'System operations monitoring',
          'Change management procedures',
          'Risk assessment and mitigation',
          'Vendor and third party management'
        ],
        'Availability': [
          'System availability monitoring',
          'Backup and recovery procedures',
          'Incident response and escalation',
          'Capacity management',
          'Service level agreements'
        ],
        'Processing Integrity': [
          'Data validation and verification',
          'Error handling procedures',
          'System processing controls',
          'Data integrity monitoring',
          'Quality assurance processes'
        ],
        'Confidentiality': [
          'Data classification policies',
          'Information handling procedures',
          'Secure data transmission',
          'Data destruction policies',
          'Non-disclosure agreements'
        ]
      },
      hipaa: {
        'Administrative Safeguards': [
          'Security officer designated',
          'Workforce training and access management',
          'Information access management',
          'Security awareness and training',
          'Security incident procedures'
        ],
        'Physical Safeguards': [
          'Facility access controls',
          'Workstation use restrictions',
          'Device and media controls',
          'Equipment disposal procedures',
          'Physical access monitoring'
        ],
        'Technical Safeguards': [
          'Access control and unique user identification',
          'Automatic logoff and encryption',
          'Audit controls and integrity',
          'Person or entity authentication',
          'Transmission security'
        ]
      },
      iso27001: {
        'Information Security Policies': [
          'Information security policy documented',
          'Review of information security policy',
          'Management direction for information security',
          'Contact with authorities and special interest groups'
        ],
        'Organization of Information Security': [
          'Internal organization structure',
          'Mobile devices and teleworking',
          'Information security in project management',
          'Segregation of duties'
        ],
        'Human Resource Security': [
          'Prior to employment screening',
          'Terms and conditions of employment',
          'Disciplinary process for security violations',
          'Information security awareness and training'
        ],
        'Asset Management': [
          'Responsibility for assets',
          'Information classification and handling',
          'Media handling and secure disposal',
          'Acceptable use of assets'
        ],
        'Access Control': [
          'Business requirements for access control',
          'User access management',
          'User responsibilities and system access rights',
          'Application and information access restriction'
        ]
      }
    };

    return requirements[framework] || {};
  }

  /**
   * Assess current compliance status
   */
  private static async assessCompliance(
    teamId: string,
    framework: TeamCompliance['compliance_framework'],
    requirements: any
  ): Promise<any> {
    try {
      const areas = [];
      let totalScore = 0;
      let areaCount = 0;

      for (const [areaName, areaRequirements] of Object.entries(requirements)) {
        const assessedRequirements = [];
        let areaScore = 0;

        for (const requirement of areaRequirements as string[]) {
          // Assess each requirement (simplified implementation)
          const met = await this.checkRequirement(teamId, framework, requirement);
          assessedRequirements.push({
            requirement,
            met,
            evidence: met ? 'Requirement verification completed' : undefined,
            notes: met ? undefined : 'Requires attention'
          });

          if (met) areaScore += 1;
        }

        const areaPercentage = (areaScore / (areaRequirements as string[]).length) * 100;
        areas.push({
          area: areaName,
          score: areaPercentage,
          status: areaPercentage >= 80 ? 'compliant' : areaPercentage >= 60 ? 'in_progress' : 'non_compliant',
          requirements: assessedRequirements
        });

        totalScore += areaPercentage;
        areaCount += 1;
      }

      const overall_score = areaCount > 0 ? totalScore / areaCount : 0;

      // Generate recommendations and next actions
      const recommendations = this.generateRecommendations(areas);
      const next_actions = this.generateNextActions(areas);

      return {
        overall_score,
        areas,
        recommendations,
        next_actions
      };
    } catch (error) {
      console.error('Error assessing compliance:', error);
      throw error;
    }
  }

  /**
   * Check if a specific requirement is met (simplified)
   */
  private static async checkRequirement(
    teamId: string,
    framework: string,
    requirement: string
  ): Promise<boolean> {
    // Simplified implementation - in production, this would check actual implementation
    // For now, return a random compliance status for demo purposes
    
    // Check if there are any related policies
    const { count: policyCount } = await supabase
      .from('team_policies')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('is_active', true);

    // Check if there are any security events that might indicate non-compliance
    const { count: securityEventCount } = await supabase
      .from('team_security_events')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .in('severity', ['high', 'critical'])
      .eq('resolution_status', 'open');

    // Simple heuristic: more policies = better compliance, fewer open security issues = better compliance
    const complianceScore = (policyCount || 0) * 10 - (securityEventCount || 0) * 20;
    return complianceScore > 30; // Threshold for compliance
  }

  /**
   * Generate recommendations based on assessment
   */
  private static generateRecommendations(areas: any[]): string[] {
    const recommendations = [];
    
    for (const area of areas) {
      if (area.score < 80) {
        recommendations.push(`Improve ${area.area} to meet compliance requirements`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current compliance levels through regular monitoring');
    }

    return recommendations;
  }

  /**
   * Generate next actions based on assessment
   */
  private static generateNextActions(areas: any[]): any[] {
    const actions = [];
    
    for (const area of areas) {
      if (area.score < 60) {
        actions.push({
          action: `Address critical gaps in ${area.area}`,
          priority: 'high' as const,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      } else if (area.score < 80) {
        actions.push({
          action: `Improve ${area.area} compliance`,
          priority: 'medium' as const,
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }
    }

    if (actions.length === 0) {
      actions.push({
        action: 'Schedule next compliance review',
        priority: 'low' as const,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }

    return actions;
  }

  /**
   * Schedule audit
   */
  static async scheduleAudit(
    teamId: string,
    framework: TeamCompliance['compliance_framework'],
    auditDate: string
  ): Promise<void> {
    try {
      await this.updateCompliance(teamId, framework, {
        next_audit_date: auditDate,
        status: 'under_review'
      });

      // Create notification for team members (simplified - would need recipient_id in production)
      console.log(`Audit scheduled for team ${teamId}, framework: ${framework}, date: ${auditDate}`);
    } catch (error) {
      console.error('TeamComplianceService.scheduleAudit error:', error);
      throw error;
    }
  }

  /**
   * Complete audit
   */
  static async completeAudit(
    teamId: string,
    framework: TeamCompliance['compliance_framework'],
    results: {
      score: number;
      findings: any[];
      status: TeamCompliance['status'];
    }
  ): Promise<void> {
    try {
      await this.updateCompliance(teamId, framework, {
        last_audit_date: new Date().toISOString(),
        audit_score: results.score,
        findings: results.findings,
        status: results.status,
        next_audit_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // Next year
      });
    } catch (error) {
      console.error('TeamComplianceService.completeAudit error:', error);
      throw error;
    }
  }
}