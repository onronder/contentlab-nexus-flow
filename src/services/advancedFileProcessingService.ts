import { supabase } from '@/integrations/supabase/client';
import { FileProcessingService, ProcessingResult } from './fileProcessingService';

export interface BatchProcessingOptions {
  concurrency?: number;
  priorityLevels?: number;
  enableDeduplication?: boolean;
  enableAIAnalysis?: boolean;
  optimizationLevel?: 'basic' | 'standard' | 'aggressive';
  generateVariants?: boolean;
}

export interface ProcessingJob {
  id: string;
  contentId: string;
  jobType: 'optimization' | 'thumbnail' | 'analysis' | 'deduplication' | 'transcription';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  inputData: any;
  outputData?: any;
  errorMessage?: string;
  processingTimeMs?: number;
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface BatchUploadSession {
  id: string;
  sessionName?: string;
  projectId: string;
  userId: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  uploadSettings: any;
  folderStructure: any;
  batchMetadata: any;
  startedAt: Date;
  completedAt?: Date;
  errorSummary?: string;
}

export interface DeduplicationResult {
  id: string;
  contentHash: string;
  fileSize: number;
  mimeType: string;
  originalContentId: string;
  duplicateContentIds: string[];
  similarityScore: number;
  deduplicationStatus: 'pending' | 'processed' | 'merged';
  spaceSaved: number;
}

export interface FileFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  projectId: string;
  teamId?: string;
  userId: string;
  folderPath: string;
  isSystem: boolean;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export class AdvancedFileProcessingService {
  private static instance: AdvancedFileProcessingService;
  private baseProcessor: FileProcessingService;
  private jobQueue: Map<string, ProcessingJob> = new Map();
  private activeJobs = new Set<string>();

  private constructor() {
    this.baseProcessor = FileProcessingService.getInstance();
  }

  public static getInstance(): AdvancedFileProcessingService {
    if (!AdvancedFileProcessingService.instance) {
      AdvancedFileProcessingService.instance = new AdvancedFileProcessingService();
    }
    return AdvancedFileProcessingService.instance;
  }

  // Batch Processing
  async createBatchSession(
    projectId: string,
    userId: string,
    files: File[],
    options: BatchProcessingOptions = {}
  ): Promise<BatchUploadSession> {
    const sessionId = crypto.randomUUID();
    
    const session: BatchUploadSession = {
      id: sessionId,
      projectId,
      userId,
      totalFiles: files.length,
      processedFiles: 0,
      failedFiles: 0,
      status: 'pending',
      uploadSettings: options,
      folderStructure: this.extractFolderStructure(files),
      batchMetadata: {
        averageFileSize: files.reduce((sum, f) => sum + f.size, 0) / files.length,
        fileTypes: [...new Set(files.map(f => f.type))],
        estimatedProcessingTime: this.estimateProcessingTime(files, options)
      },
      startedAt: new Date()
    };

    // Save session to database
    const { error } = await supabase
      .from('batch_upload_sessions')
      .insert([{
        id: session.id,
        project_id: session.projectId,
        user_id: session.userId,
        total_files: session.totalFiles,
        status: session.status,
        upload_settings: session.uploadSettings,
        folder_structure: session.folderStructure,
        batch_metadata: session.batchMetadata,
        started_at: session.startedAt.toISOString()
      }]);

    if (error) throw error;

    return session;
  }

  async processBatch(
    sessionId: string,
    files: File[],
    onProgress?: (session: BatchUploadSession, fileProgress: Map<string, ProcessingResult>) => void
  ): Promise<ProcessingResult[]> {
    const session = await this.getBatchSession(sessionId);
    const results: ProcessingResult[] = [];
    const fileProgress = new Map<string, ProcessingResult>();
    
    // Update session status
    await this.updateBatchSession(sessionId, { status: 'processing' });

    const { concurrency = 3 } = session.uploadSettings;
    const chunks = this.chunkArray(files, concurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (file) => {
        try {
          const result = await this.processFileAdvanced(file, session.uploadSettings);
          results.push(result);
          fileProgress.set(file.name, result);
          
          // Update progress
          session.processedFiles++;
          onProgress?.(session, fileProgress);
          
          await this.updateBatchSession(sessionId, { 
            processed_files: session.processedFiles 
          });

          return result;
        } catch (error) {
          session.failedFiles++;
          await this.updateBatchSession(sessionId, { 
            failed_files: session.failedFiles 
          });
          throw error;
        }
      });

      await Promise.allSettled(chunkPromises);
    }

    // Mark session as completed
    await this.updateBatchSession(sessionId, { 
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    return results;
  }

  // Advanced File Processing
  async processFileAdvanced(
    file: File,
    options: BatchProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const baseResult = await this.baseProcessor.processFile(file, file.type);
    
    // Enhanced processing based on options
    if (options.enableAIAnalysis) {
      await this.performAIAnalysis(file, baseResult);
    }

    if (options.enableDeduplication) {
      await this.checkForDuplicates(file, baseResult);
    }

    if (options.generateVariants) {
      await this.generateFileVariants(file, baseResult, options.optimizationLevel);
    }

    return baseResult;
  }

  // Deduplication
  async checkForDuplicates(file: File, processingResult: ProcessingResult): Promise<DeduplicationResult | null> {
    const { fileHash } = processingResult.metadata;
    
    // Check for existing files with same hash
    const { data: existingDups } = await supabase
      .from('file_deduplication')
      .select('*')
      .eq('content_hash', fileHash)
      .eq('file_size', file.size);

    if (existingDups && existingDups.length > 0) {
      // Found duplicates
      const dedup = existingDups[0];
      return {
        id: dedup.id,
        contentHash: dedup.content_hash,
        fileSize: dedup.file_size,
        mimeType: dedup.mime_type,
        originalContentId: dedup.original_content_id,
        duplicateContentIds: dedup.duplicate_content_ids,
        similarityScore: dedup.similarity_score,
        deduplicationStatus: dedup.deduplication_status,
        spaceSaved: dedup.space_saved
      };
    }

    return null;
  }

  async mergeDuplicateFiles(deduplicationId: string, keepOriginal: boolean = true): Promise<void> {
    const { data: dedup } = await supabase
      .from('file_deduplication')
      .select('*')
      .eq('id', deduplicationId)
      .single();

    if (!dedup) throw new Error('Deduplication record not found');

    if (keepOriginal) {
      // Mark duplicates as references to original
      await supabase
        .from('content_items')
        .update({ duplicate_of: dedup.original_content_id })
        .in('id', dedup.duplicate_content_ids);
    }

      // Update deduplication status
      await supabase
        .from('file_deduplication')
        .update({ 
          deduplication_status: 'merged' as const,
          space_saved: dedup.file_size * (dedup.duplicate_content_ids.length || 0)
        })
        .eq('id', deduplicationId);
  }

  // Folder Management
  async createFolder(
    name: string,
    projectId: string,
    userId: string,
    parentId?: string,
    teamId?: string
  ): Promise<FileFolder> {
    const folderId = crypto.randomUUID();
    
    const { data, error } = await supabase
      .from('file_folders')
      .insert([{
        id: folderId,
        name,
        project_id: projectId,
        user_id: userId,
        parent_id: parentId,
        team_id: teamId,
        folder_path: name // Will be updated by trigger
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      parentId: data.parent_id,
      projectId: data.project_id,
      teamId: data.team_id,
      userId: data.user_id,
      folderPath: data.folder_path,
      isSystem: data.is_system,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async getFolderHierarchy(projectId: string): Promise<FileFolder[]> {
    const { data, error } = await supabase
      .from('file_folders')
      .select('*')
      .eq('project_id', projectId)
      .order('folder_path');

    if (error) throw error;

    return data.map(folder => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      parentId: folder.parent_id,
      projectId: folder.project_id,
      teamId: folder.team_id,
      userId: folder.user_id,
      folderPath: folder.folder_path,
      isSystem: folder.is_system,
      metadata: folder.metadata,
      createdAt: new Date(folder.created_at),
      updatedAt: new Date(folder.updated_at)
    }));
  }

  // File Versioning
  async createFileVersion(
    contentId: string,
    filePath: string,
    fileSize: number,
    contentHash: string,
    changeSummary?: string,
    createdBy?: string
  ): Promise<void> {
    // Get next version number
    const { data: versions } = await supabase
      .from('file_versions')
      .select('version_number')
      .eq('content_id', contentId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (versions?.[0]?.version_number || 0) + 1;

    await supabase
      .from('file_versions')
      .insert([{
        content_id: contentId,
        version_number: nextVersion,
        file_path: filePath,
        file_size: fileSize,
        content_hash: contentHash,
        change_summary: changeSummary,
        is_current: true,
        created_by: createdBy
      }]);
  }

  async getFileVersions(contentId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('file_versions')
      .select('*')
      .eq('content_id', contentId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Processing Jobs Management
  async createProcessingJob(
    contentId: string,
    jobType: ProcessingJob['jobType'],
    inputData: any,
    priority: number = 0
  ): Promise<string> {
    const jobId = crypto.randomUUID();
    
    const { error } = await supabase
      .from('file_processing_jobs')
      .insert([{
        id: jobId,
        content_id: contentId,
        job_type: jobType,
        priority,
        input_data: inputData,
        scheduled_at: new Date().toISOString()
      }]);

    if (error) throw error;
    return jobId;
  }

  async getProcessingJobs(status?: string): Promise<ProcessingJob[]> {
    let query = supabase
      .from('file_processing_jobs')
      .select('*')
      .order('priority', { ascending: false })
      .order('scheduled_at');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(job => ({
      id: job.id,
      contentId: job.content_id,
      jobType: job.job_type,
      status: job.status,
      priority: job.priority,
      inputData: job.input_data,
      outputData: job.output_data,
      errorMessage: job.error_message,
      processingTimeMs: job.processing_time_ms,
      retryCount: job.retry_count,
      maxRetries: job.max_retries,
      scheduledAt: new Date(job.scheduled_at),
      startedAt: job.started_at ? new Date(job.started_at) : undefined,
      completedAt: job.completed_at ? new Date(job.completed_at) : undefined
    }));
  }

  // Helper Methods
  private extractFolderStructure(files: File[]): any {
    const structure: any = {};
    
    files.forEach(file => {
      const pathParts = file.webkitRelativePath?.split('/') || [file.name];
      let current = structure;
      
      pathParts.forEach((part, index) => {
        if (index === pathParts.length - 1) {
          current[part] = { type: 'file', size: file.size };
        } else {
          if (!current[part]) {
            current[part] = { type: 'folder', children: {} };
          }
          current = current[part].children;
        }
      });
    });
    
    return structure;
  }

  private estimateProcessingTime(files: File[], options: BatchProcessingOptions): number {
    const baseTimePerMB = 100; // ms per MB
    const totalSizeMB = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
    
    let multiplier = 1;
    if (options.enableAIAnalysis) multiplier += 2;
    if (options.enableDeduplication) multiplier += 0.5;
    if (options.generateVariants) multiplier += 1;
    
    return totalSizeMB * baseTimePerMB * multiplier;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async getBatchSession(sessionId: string): Promise<BatchUploadSession> {
    const { data, error } = await supabase
      .from('batch_upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      sessionName: data.session_name,
      projectId: data.project_id,
      userId: data.user_id,
      totalFiles: data.total_files,
      processedFiles: data.processed_files,
      failedFiles: data.failed_files,
      status: data.status,
      uploadSettings: data.upload_settings,
      folderStructure: data.folder_structure,
      batchMetadata: data.batch_metadata,
      startedAt: new Date(data.started_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      errorSummary: data.error_summary
    };
  }

  private async updateBatchSession(sessionId: string, updates: any): Promise<void> {
    const { error } = await supabase
      .from('batch_upload_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) throw error;
  }

  private async performAIAnalysis(file: File, result: ProcessingResult): Promise<void> {
    // Placeholder for AI analysis - would integrate with ML services
    console.log('Performing AI analysis for:', file.name);
  }

  private async generateFileVariants(
    file: File,
    result: ProcessingResult,
    optimizationLevel?: string
  ): Promise<void> {
    // Placeholder for generating file variants (different sizes, formats, etc.)
    console.log('Generating variants for:', file.name, 'at level:', optimizationLevel);
  }
}

export const advancedFileProcessingService = AdvancedFileProcessingService.getInstance();