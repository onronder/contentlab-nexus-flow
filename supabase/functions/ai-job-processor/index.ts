/**
 * AI Job Processor - Async processing worker for AI operations
 * Handles queued AI jobs for better performance and reliability
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withSecurity, CircuitBreaker } from '../_shared/security.ts';

const openAICircuitBreaker = new CircuitBreaker(3, 60000, 30000);

// Estimate token usage for cost tracking
function estimateTokenUsage(text: string, operation: string): number {
  const baseTokens = Math.ceil(text.length / 4); // Rough estimate
  const multipliers = {
    'content_analysis': 2.5,
    'insight_generation': 3.0,
    'collaboration_assist': 1.5
  };
  return Math.floor(baseTokens * (multipliers[operation as keyof typeof multipliers] || 2.0));
}

// Calculate cost estimate based on model and tokens
function calculateCostEstimate(model: string, tokens: number): number {
  const rates = {
    'gpt-4o-mini': 0.00015, // per 1K tokens (average of input/output)
    'gpt-4o': 0.005, // per 1K tokens
    'gpt-5-mini-2025-08-07': 0.0002,
  };
  return (tokens / 1000) * (rates[model as keyof typeof rates] || 0.00015);
}

const handler = withSecurity(async (req, logger) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { jobId, action = 'process' } = await req.json();

    if (action === 'process') {
      // Get next job from queue
      const { data: job, error: jobError } = await supabase
        .from('ai_job_queue')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: true })
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .single();

      if (jobError || !job) {
        return new Response(JSON.stringify({ 
          message: 'No jobs available',
          processed: false 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      logger.info('Processing AI job', { jobId: job.id, jobType: job.job_type });

      // Mark job as processing
      await supabase
        .from('ai_job_queue')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          assigned_worker: 'ai-job-processor',
          attempts: job.attempts + 1
        })
        .eq('id', job.id);

      let result;
      const startTime = Date.now();

      try {
        // Process different job types
        switch (job.job_type) {
          case 'content_analysis':
            result = await processContentAnalysis(job.input_data, logger);
            break;
          case 'insight_generation':
            result = await processInsightGeneration(job.input_data, logger);
            break;
          case 'collaboration_assist':
            result = await processCollaborationAssist(job.input_data, logger);
            break;
          default:
            throw new Error(`Unknown job type: ${job.job_type}`);
        }

        const processingTime = Date.now() - startTime;
        const estimatedTokens = estimateTokenUsage(
          JSON.stringify(job.input_data), 
          job.job_type
        );
        const costEstimate = calculateCostEstimate('gpt-4o-mini', estimatedTokens);

        // Mark job as completed
        await supabase
          .from('ai_job_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            output_data: result,
            progress_percent: 100,
            progress_message: 'Processing completed successfully'
          })
          .eq('id', job.id);

        // Log usage analytics
        await supabase
          .from('ai_usage_analytics')
          .insert({
            user_id: job.user_id,
            team_id: job.team_id,
            model_used: 'gpt-4o-mini',
            tokens_used: estimatedTokens,
            cost_estimate: costEstimate,
            endpoint: 'ai-job-processor',
            operation_type: job.job_type,
            processing_time_ms: processingTime,
            confidence_score: result.confidence_score || 0.8,
            success: true
          });

        logger.info('AI job completed successfully', { 
          jobId: job.id, 
          processingTime,
          tokens: estimatedTokens,
          cost: costEstimate 
        });

        return new Response(JSON.stringify({
          success: true,
          jobId: job.id,
          processingTime,
          result
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error) {
        logger.error('AI job processing failed', error as Error, { jobId: job.id });

        // Mark job as failed or retry
        const shouldRetry = job.attempts < job.max_attempts;
        
        await supabase
          .from('ai_job_queue')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            error_data: {
              error: (error as Error).message,
              timestamp: new Date().toISOString(),
              attempt: job.attempts + 1
            },
            scheduled_at: shouldRetry 
              ? new Date(Date.now() + (job.attempts * 30000)).toISOString() // Exponential backoff
              : job.scheduled_at
          })
          .eq('id', job.id);

        // Log failed usage
        await supabase
          .from('ai_usage_analytics')
          .insert({
            user_id: job.user_id,
            team_id: job.team_id,
            model_used: 'gpt-4o-mini',
            tokens_used: 0,
            cost_estimate: 0,
            endpoint: 'ai-job-processor',
            operation_type: job.job_type,
            processing_time_ms: Date.now() - startTime,
            success: false,
            error_type: (error as Error).name
          });

        throw error;
      }
    }

    return new Response(JSON.stringify({ message: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Job processor error', error as Error);
    
    return new Response(JSON.stringify({
      error: 'Job processing failed',
      success: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}, {
  requireAuth: false, // Allow system calls
  rateLimitRequests: 100,
  rateLimitWindow: 60000,
  validateInput: false, // Skip validation for internal calls
  enableCORS: true
});

// Process content analysis jobs
async function processContentAnalysis(inputData: any, logger: any) {
  const { contentId, analysisTypes, content, title, description } = inputData;
  
  logger.info('Processing content analysis', { contentId, analysisTypes });
  
  // Call content-analyzer function
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/content-analyzer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contentId,
      analysisTypes,
      content,
      title,
      description
    })
  });

  if (!response.ok) {
    throw new Error(`Content analysis failed: ${response.statusText}`);
  }

  return await response.json();
}

// Process insight generation jobs
async function processInsightGeneration(inputData: any, logger: any) {
  const { projectId, competitors, project } = inputData;
  
  logger.info('Processing insight generation', { projectId });
  
  // Call generate-insights function
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-insights`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      projectId,
      competitors,
      project
    })
  });

  if (!response.ok) {
    throw new Error(`Insight generation failed: ${response.statusText}`);
  }

  return await response.json();
}

// Process collaboration assistance jobs
async function processCollaborationAssist(inputData: any, logger: any) {
  const { content, sessionId, suggestionType } = inputData;
  
  logger.info('Processing collaboration assist', { sessionId, suggestionType });
  
  // Call ai-collaboration-assistant function
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-collaboration-assistant`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content,
      sessionId,
      suggestionType
    })
  });

  if (!response.ok) {
    throw new Error(`Collaboration assist failed: ${response.statusText}`);
  }

  return await response.json();
}

Deno.serve(handler);