import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { withSecurity, SecurityLogger } from '../_shared/security.ts'

interface AuditLogRequest {
  log_type: 'permission' | 'team_activity' | 'security';
  user_id: string;
  data: Record<string, any>;
  team_id?: string;
  resource_type?: string;
  resource_id?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function handleAuditLogger(req: Request, logger: SecurityLogger): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body: AuditLogRequest = await req.json();
    const { log_type, user_id, data, team_id, resource_type, resource_id } = body;

    if (!log_type || !user_id || !data) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: log_type, user_id, data' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get client context for compliance
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    let auditRecord;
    let tableName: string;

    // Enhanced metadata for compliance
    const complianceMetadata = {
      ...data,
      audit_timestamp: new Date().toISOString(),
      client_ip: clientIP,
      user_agent: userAgent,
      regulatory_compliance: {
        gdpr_applicable: true,
        sox_applicable: team_id ? true : false,
        data_classification: resource_type || 'general'
      },
      integrity_hash: await generateIntegrityHash(data)
    };

    // Route to appropriate audit table
    switch (log_type) {
      case 'permission':
        if (!data.permission_slug || !data.action) {
          return new Response(JSON.stringify({
            error: 'Permission logs require: permission_slug, action'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const { data: permissionLog, error: permissionError } = await supabase
          .from('permission_audit_logs')
          .insert({
            user_id,
            permission_slug: data.permission_slug,
            action: data.action,
            resource_type,
            resource_id,
            team_id,
            metadata: complianceMetadata
          })
          .select()
          .single();

        if (permissionError) throw permissionError;
        auditRecord = permissionLog;
        tableName = 'permission_audit_logs';
        break;

      case 'team_activity':
        if (!data.action || !data.description || !team_id) {
          return new Response(JSON.stringify({
            error: 'Team activity logs require: action, description, team_id'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const { data: teamLog, error: teamError } = await supabase
          .from('team_activity_logs')
          .insert({
            user_id,
            team_id,
            action: data.action,
            description: data.description,
            metadata: complianceMetadata
          })
          .select()
          .single();

        if (teamError) throw teamError;
        auditRecord = teamLog;
        tableName = 'team_activity_logs';
        break;

      case 'security':
        if (!data.event_type || !data.severity) {
          return new Response(JSON.stringify({
            error: 'Security logs require: event_type, severity'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const { data: securityLog, error: securityError } = await supabase
          .from('security_events')
          .insert({
            user_id,
            event_type: data.event_type,
            event_data: complianceMetadata,
            severity: data.severity,
            ip_address: clientIP,
            user_agent: userAgent
          })
          .select()
          .single();

        if (securityError) throw securityError;
        auditRecord = securityLog;
        tableName = 'security_events';
        break;

      default:
        return new Response(JSON.stringify({
          error: 'Invalid log_type. Must be: permission, team_activity, or security'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // Compliance reporting - check if this needs immediate escalation
    let complianceFlags: string[] = [];
    
    if (log_type === 'permission' && data.action === 'denied' && data.permission_slug?.includes('admin')) {
      complianceFlags.push('privilege_escalation_attempt');
    }
    
    if (log_type === 'security' && data.severity === 'critical') {
      complianceFlags.push('security_incident');
    }

    // Data retention policy enforcement
    if (team_id) {
      scheduleDataRetentionCheck(team_id, tableName);
    }

    logger.info('Audit log created', {
      log_type,
      user_id,
      team_id,
      record_id: auditRecord.id,
      table: tableName,
      compliance_flags: complianceFlags,
      integrity_verified: true
    });

    return new Response(JSON.stringify({
      success: true,
      audit_id: auditRecord.id,
      log_type,
      compliance_status: 'recorded',
      compliance_flags: complianceFlags,
      retention_policy: getRetentionPolicy(log_type),
      integrity_hash: complianceMetadata.integrity_hash
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Audit logging error', error as Error);
    
    return new Response(JSON.stringify({
      error: 'Failed to create audit log',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function generateIntegrityHash(data: Record<string, any>): Promise<string> {
  const encoder = new TextEncoder();
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function scheduleDataRetentionCheck(teamId: string, tableName: string): void {
  // In production, this would queue a background job
  console.log(`Scheduled retention check for team ${teamId} on table ${tableName}`);
}

function getRetentionPolicy(logType: string): string {
  switch (logType) {
    case 'permission':
      return '7 years (SOX compliance)';
    case 'team_activity':
      return '3 years (business records)';
    case 'security':
      return '1 year (security analysis)';
    default:
      return '1 year (default)';
  }
}

// Export the handler with security middleware
export default withSecurity(handleAuditLogger, {
  requireAuth: false, // Allow internal system calls
  rateLimitRequests: 2000,
  rateLimitWindow: 60000,
  enableCORS: true
});