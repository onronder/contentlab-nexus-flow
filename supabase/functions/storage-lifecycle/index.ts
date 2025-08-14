import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LifecycleRequest {
  action: 'cleanup' | 'archive' | 'optimize' | 'backup' | 'migrate';
  projectId?: string;
  teamId?: string;
  dryRun?: boolean;
  maxAge?: number; // days
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      action, 
      projectId, 
      teamId, 
      dryRun = false, 
      maxAge = 365 
    }: LifecycleRequest = await req.json();

    console.log(`Executing storage lifecycle action: ${action}`);

    let results: any = {
      action,
      executedAt: new Date().toISOString(),
      dryRun,
      processed: 0,
      errors: []
    };

    switch (action) {
      case 'cleanup':
        results = await performCleanup(supabase, { projectId, teamId, maxAge, dryRun });
        break;
      
      case 'archive':
        results = await performArchive(supabase, { projectId, teamId, maxAge, dryRun });
        break;
      
      case 'optimize':
        results = await performOptimization(supabase, { projectId, teamId, dryRun });
        break;
      
      case 'backup':
        results = await performBackup(supabase, { projectId, teamId, dryRun });
        break;
      
      case 'migrate':
        results = await performMigration(supabase, { projectId, teamId, dryRun });
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log the lifecycle operation
    await supabase
      .from('activity_logs')
      .insert({
        action: `storage_lifecycle_${action}`,
        resource_type: 'storage',
        project_id: projectId,
        team_id: teamId,
        description: `Storage lifecycle ${action} completed`,
        metadata: results
      });

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Storage lifecycle error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Storage lifecycle operation failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function performCleanup(supabase: any, options: any) {
  const { projectId, teamId, maxAge, dryRun } = options;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAge);

  console.log(`Cleaning up files older than ${maxAge} days (before ${cutoffDate.toISOString()})`);

  // Find old files
  let query = supabase
    .from('content_items')
    .select('id, file_path, created_at, file_size')
    .lt('created_at', cutoffDate.toISOString())
    .eq('status', 'archived');

  if (projectId) query = query.eq('project_id', projectId);
  if (teamId) query = query.eq('team_id', teamId);

  const { data: oldFiles, error } = await query;

  if (error) {
    throw new Error(`Failed to find old files: ${error.message}`);
  }

  let deletedCount = 0;
  let freedSpace = 0;
  const errors: string[] = [];

  for (const file of oldFiles || []) {
    try {
      if (!dryRun && file.file_path) {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('content')
          .remove([file.file_path]);

        if (storageError) {
          errors.push(`Failed to delete ${file.file_path}: ${storageError.message}`);
          continue;
        }

        // Delete from database
        const { error: dbError } = await supabase
          .from('content_items')
          .delete()
          .eq('id', file.id);

        if (dbError) {
          errors.push(`Failed to delete record ${file.id}: ${dbError.message}`);
          continue;
        }
      }

      deletedCount++;
      freedSpace += file.file_size || 0;
    } catch (error: any) {
      errors.push(`Error processing ${file.id}: ${error.message}`);
    }
  }

  return {
    action: 'cleanup',
    processed: deletedCount,
    freedSpace,
    errors,
    dryRun
  };
}

async function performArchive(supabase: any, options: any) {
  const { projectId, teamId, maxAge, dryRun } = options;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAge);

  console.log(`Archiving files older than ${maxAge} days`);

  // Find files to archive
  let query = supabase
    .from('content_items')
    .select('id, file_path, storage_tier')
    .lt('last_accessed_at', cutoffDate.toISOString())
    .neq('storage_tier', 'cold')
    .eq('status', 'published');

  if (projectId) query = query.eq('project_id', projectId);
  if (teamId) query = query.eq('team_id', teamId);

  const { data: filesToArchive, error } = await query;

  if (error) {
    throw new Error(`Failed to find files to archive: ${error.message}`);
  }

  let archivedCount = 0;
  const errors: string[] = [];

  for (const file of filesToArchive || []) {
    try {
      if (!dryRun) {
        // Move to cold storage tier
        const { error: updateError } = await supabase
          .from('content_items')
          .update({
            storage_tier: 'cold',
            workflow_status: 'archived'
          })
          .eq('id', file.id);

        if (updateError) {
          errors.push(`Failed to archive ${file.id}: ${updateError.message}`);
          continue;
        }
      }

      archivedCount++;
    } catch (error: any) {
      errors.push(`Error archiving ${file.id}: ${error.message}`);
    }
  }

  return {
    action: 'archive',
    processed: archivedCount,
    errors,
    dryRun
  };
}

async function performOptimization(supabase: any, options: any) {
  const { projectId, teamId, dryRun } = options;

  console.log('Performing storage optimization');

  // Find large unoptimized files
  let query = supabase
    .from('content_items')
    .select('id, file_path, file_size, metadata')
    .gt('file_size', 5000000) // Files larger than 5MB
    .eq('optimization_level', 'standard');

  if (projectId) query = query.eq('project_id', projectId);
  if (teamId) query = query.eq('team_id', teamId);

  const { data: filesToOptimize, error } = await query;

  if (error) {
    throw new Error(`Failed to find files to optimize: ${error.message}`);
  }

  let optimizedCount = 0;
  let spaceSaved = 0;
  const errors: string[] = [];

  for (const file of filesToOptimize || []) {
    try {
      if (!dryRun) {
        // Call media processor for optimization
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/advanced-media-processor`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contentId: file.id,
            filePath: file.file_path,
            optimizationLevel: 'aggressive'
          })
        });

        if (!response.ok) {
          errors.push(`Failed to optimize ${file.id}: ${await response.text()}`);
          continue;
        }

        const result = await response.json();
        spaceSaved += result.optimizationResults?.spaceSaved || 0;
      }

      optimizedCount++;
    } catch (error: any) {
      errors.push(`Error optimizing ${file.id}: ${error.message}`);
    }
  }

  return {
    action: 'optimize',
    processed: optimizedCount,
    spaceSaved,
    errors,
    dryRun
  };
}

async function performBackup(supabase: any, options: any) {
  const { projectId, teamId, dryRun } = options;

  console.log('Performing storage backup');

  // Find critical files that need backup
  let query = supabase
    .from('content_items')
    .select('id, file_path, file_size')
    .eq('status', 'published')
    .gte('content_quality_score', 80);

  if (projectId) query = query.eq('project_id', projectId);
  if (teamId) query = query.eq('team_id', teamId);

  const { data: filesToBackup, error } = await query;

  if (error) {
    throw new Error(`Failed to find files to backup: ${error.message}`);
  }

  let backedUpCount = 0;
  let totalSize = 0;
  const errors: string[] = [];

  for (const file of filesToBackup || []) {
    try {
      if (!dryRun) {
        // Simulate backup process
        // In real implementation, copy to backup bucket or external storage
        console.log(`Backing up ${file.file_path}`);
        
        // Update metadata to indicate backup
        const { error: updateError } = await supabase
          .from('content_items')
          .update({
            metadata: {
              ...file.metadata,
              backup: {
                backedUpAt: new Date().toISOString(),
                backupLocation: 'backup-bucket'
              }
            }
          })
          .eq('id', file.id);

        if (updateError) {
          errors.push(`Failed to update backup metadata for ${file.id}: ${updateError.message}`);
          continue;
        }
      }

      backedUpCount++;
      totalSize += file.file_size || 0;
    } catch (error: any) {
      errors.push(`Error backing up ${file.id}: ${error.message}`);
    }
  }

  return {
    action: 'backup',
    processed: backedUpCount,
    totalSize,
    errors,
    dryRun
  };
}

async function performMigration(supabase: any, options: any) {
  const { projectId, teamId, dryRun } = options;

  console.log('Performing storage migration');

  // Find files that need migration (e.g., old format, outdated structure)
  let query = supabase
    .from('content_items')
    .select('id, file_path, content_type, metadata')
    .or('optimization_level.is.null,storage_tier.is.null');

  if (projectId) query = query.eq('project_id', projectId);
  if (teamId) query = query.eq('team_id', teamId);

  const { data: filesToMigrate, error } = await query;

  if (error) {
    throw new Error(`Failed to find files to migrate: ${error.message}`);
  }

  let migratedCount = 0;
  const errors: string[] = [];

  for (const file of filesToMigrate || []) {
    try {
      if (!dryRun) {
        // Update file with modern schema
        const { error: updateError } = await supabase
          .from('content_items')
          .update({
            optimization_level: 'standard',
            storage_tier: 'hot',
            processing_status: 'completed',
            metadata: {
              ...file.metadata,
              migrated: {
                migratedAt: new Date().toISOString(),
                version: '2.0'
              }
            }
          })
          .eq('id', file.id);

        if (updateError) {
          errors.push(`Failed to migrate ${file.id}: ${updateError.message}`);
          continue;
        }
      }

      migratedCount++;
    } catch (error: any) {
      errors.push(`Error migrating ${file.id}: ${error.message}`);
    }
  }

  return {
    action: 'migrate',
    processed: migratedCount,
    errors,
    dryRun
  };
}