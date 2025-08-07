import { supabase } from "@/integrations/supabase/client";

export interface TeamDataExport {
  id: string;
  team_id: string;
  export_type: 'full_backup' | 'partial_export' | 'compliance_report' | 'audit_trail';
  export_format: 'json' | 'csv' | 'pdf' | 'xml';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  requested_by: string;
  file_path?: string;
  file_size_bytes?: number;
  included_data: Record<string, any>;
  retention_days: number;
  download_count: number;
  expires_at: string;
  created_at: string;
  completed_at?: string;
}

export interface ExportOptions {
  export_type: TeamDataExport['export_type'];
  export_format: TeamDataExport['export_format'];
  included_data: {
    teams?: boolean;
    members?: boolean;
    projects?: boolean;
    content?: boolean;
    analytics?: boolean;
    activities?: boolean;
    security_events?: boolean;
    billing?: boolean;
    date_range?: {
      start: string;
      end: string;
    };
  };
  retention_days?: number;
}

export class TeamDataExportService {
  /**
   * Request a new data export
   */
  static async requestExport(
    teamId: string,
    requestedBy: string,
    options: ExportOptions
  ): Promise<TeamDataExport> {
    try {
      const { data, error } = await supabase
        .from('team_data_exports')
        .insert({
          team_id: teamId,
          export_type: options.export_type,
          export_format: options.export_format,
          requested_by: requestedBy,
          included_data: options.included_data,
          retention_days: options.retention_days || 30,
          expires_at: new Date(Date.now() + (options.retention_days || 30) * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error requesting data export:', error);
        throw new Error(`Failed to request data export: ${error.message}`);
      }

      // Start the export process asynchronously
      this.processExport(data.id).catch(console.error);

      return data as TeamDataExport;
    } catch (error) {
      console.error('TeamDataExportService.requestExport error:', error);
      throw error;
    }
  }

  /**
   * Get team data exports
   */
  static async getTeamExports(teamId: string): Promise<TeamDataExport[]> {
    try {
      const { data, error } = await supabase
        .from('team_data_exports')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team exports:', error);
        throw new Error(`Failed to fetch team exports: ${error.message}`);
      }

      return (data || []) as TeamDataExport[];
    } catch (error) {
      console.error('TeamDataExportService.getTeamExports error:', error);
      throw error;
    }
  }

  /**
   * Get a specific export by ID
   */
  static async getExport(exportId: string): Promise<TeamDataExport | null> {
    try {
      const { data, error } = await supabase
        .from('team_data_exports')
        .select('*')
        .eq('id', exportId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching export:', error);
        throw new Error(`Failed to fetch export: ${error.message}`);
      }

      return data as TeamDataExport;
    } catch (error) {
      console.error('TeamDataExportService.getExport error:', error);
      throw error;
    }
  }

  /**
   * Process the export (would be handled by background job in production)
   */
  private static async processExport(exportId: string): Promise<void> {
    try {
      // Update status to processing
      await supabase
        .from('team_data_exports')
        .update({ status: 'processing' })
        .eq('id', exportId);

      const exportRecord = await this.getExport(exportId);
      if (!exportRecord) {
        throw new Error('Export record not found');
      }

      // Collect the requested data
      const exportData = await this.collectExportData(exportRecord);

      // Generate the file
      const fileContent = this.formatExportData(exportData, exportRecord.export_format);
      const fileName = `team-export-${exportRecord.team_id}-${Date.now()}.${exportRecord.export_format}`;
      
      // In a real implementation, you would upload to storage
      // For now, we'll simulate file creation
      const simulatedFileSize = new Blob([JSON.stringify(fileContent)]).size;

      // Update export record with completion
      await supabase
        .from('team_data_exports')
        .update({
          status: 'completed',
          file_path: `/exports/${fileName}`,
          file_size_bytes: simulatedFileSize,
          completed_at: new Date().toISOString()
        })
        .eq('id', exportId);

      // Send notification to requester
      await this.notifyExportComplete(exportRecord);

    } catch (error) {
      console.error('Error processing export:', error);
      
      // Update status to failed
      await supabase
        .from('team_data_exports')
        .update({ status: 'failed' })
        .eq('id', exportId);
    }
  }

  /**
   * Collect data for export based on included_data options
   */
  private static async collectExportData(exportRecord: TeamDataExport): Promise<any> {
    const { team_id, included_data } = exportRecord;
    const data: any = {};

    try {
      // Collect team data
      if (included_data.teams) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', team_id);
        data.teams = teamData;
      }

      // Collect member data
      if (included_data.members) {
        const { data: memberData } = await supabase
          .from('team_members')
          .select('*, user:profiles(*), role:user_roles(*)')
          .eq('team_id', team_id);
        data.members = memberData;
      }

      // Collect project data
      if (included_data.projects) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('organization_id', team_id); // Assuming team_id maps to organization_id
        data.projects = projectData;
      }

      // Collect activity data
      if (included_data.activities) {
        let activityQuery = supabase
          .from('activity_logs')
          .select('*')
          .eq('team_id', team_id);

        if (included_data.date_range) {
          activityQuery = activityQuery
            .gte('created_at', included_data.date_range.start)
            .lte('created_at', included_data.date_range.end);
        }

        const { data: activityData } = await activityQuery;
        data.activities = activityData;
      }

      // Collect security events
      if (included_data.security_events) {
        let securityQuery = supabase
          .from('team_security_events')
          .select('*')
          .eq('team_id', team_id);

        if (included_data.date_range) {
          securityQuery = securityQuery
            .gte('created_at', included_data.date_range.start)
            .lte('created_at', included_data.date_range.end);
        }

        const { data: securityData } = await securityQuery;
        data.security_events = securityData;
      }

      // Collect billing data
      if (included_data.billing) {
        const { data: billingData } = await supabase
          .from('team_billing')
          .select('*')
          .eq('team_id', team_id);
        data.billing = billingData;
      }

      return data;
    } catch (error) {
      console.error('Error collecting export data:', error);
      throw error;
    }
  }

  /**
   * Format export data based on format
   */
  private static formatExportData(data: any, format: TeamDataExport['export_format']): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        // Flatten data structure for CSV format
        return this.convertToCSV(data);
      
      case 'xml':
        return this.convertToXML(data);
      
      case 'pdf':
        // In a real implementation, you'd generate a PDF report
        return JSON.stringify(data, null, 2);
      
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: any): string {
    // Simplified CSV conversion - in production, use a proper CSV library
    const headers = Object.keys(data).join(',');
    const rows = Object.values(data).map((table: any) => {
      if (Array.isArray(table)) {
        return table.map(row => JSON.stringify(row)).join('\n');
      }
      return JSON.stringify(table);
    }).join('\n');
    
    return `${headers}\n${rows}`;
  }

  /**
   * Convert data to XML format
   */
  private static convertToXML(data: any): string {
    // Simplified XML conversion - in production, use a proper XML library
    const xmlContent = Object.entries(data).map(([key, value]) => {
      return `<${key}>${JSON.stringify(value)}</${key}>`;
    }).join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8"?>\n<export>\n${xmlContent}\n</export>`;
  }

  /**
   * Notify requester when export is complete
   */
  private static async notifyExportComplete(exportRecord: TeamDataExport): Promise<void> {
    try {
      await supabase
        .from('enhanced_notifications')
        .insert({
          recipient_id: exportRecord.requested_by,
          team_id: exportRecord.team_id,
          notification_type: 'export_complete',
          category: 'system',
          title: 'Data Export Complete',
          message: `Your ${exportRecord.export_type} export is ready for download.`,
          action_url: `/team/data-exports/${exportRecord.id}`,
          metadata: {
            export_id: exportRecord.id,
            export_type: exportRecord.export_type,
            file_size: exportRecord.file_size_bytes
          }
        });
    } catch (error) {
      console.error('Error sending export notification:', error);
    }
  }

  /**
   * Track download of export file
   */
  static async trackDownload(exportId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('team_data_exports')
        .update({ 
          download_count: 1 // Simplified - in production would use SQL increment
        })
        .eq('id', exportId);

      if (error) {
        console.error('Error tracking download:', error);
      }
    } catch (error) {
      console.error('TeamDataExportService.trackDownload error:', error);
    }
  }

  /**
   * Delete expired exports
   */
  static async cleanupExpiredExports(): Promise<void> {
    try {
      const { error } = await supabase
        .from('team_data_exports')
        .update({ status: 'expired' })
        .lt('expires_at', new Date().toISOString())
        .in('status', ['completed', 'failed']);

      if (error) {
        console.error('Error cleaning up expired exports:', error);
      }
    } catch (error) {
      console.error('TeamDataExportService.cleanupExpiredExports error:', error);
    }
  }
}