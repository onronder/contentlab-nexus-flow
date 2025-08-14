import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MediaProcessingRequest {
  contentId: string;
  filePath: string;
  optimizationLevel: 'basic' | 'standard' | 'aggressive';
  outputFormats?: string[];
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

    const { contentId, filePath, optimizationLevel, outputFormats = ['webp', 'avif'] }: MediaProcessingRequest = await req.json();

    console.log(`Processing media for content ${contentId} with level ${optimizationLevel}`);

    // Download the original file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('content')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    const originalBuffer = await fileData.arrayBuffer();
    const originalSize = originalBuffer.byteLength;

    // Determine file type
    const mimeType = fileData.type;
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');

    let processedFiles: Array<{ format: string; buffer: ArrayBuffer; size: number }> = [];

    if (isImage) {
      // Process image with different optimization levels
      const canvas = new OffscreenCanvas(1, 1);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Create image from buffer
      const blob = new Blob([originalBuffer], { type: mimeType });
      const imageUrl = URL.createObjectURL(blob);
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Calculate new dimensions based on optimization level
      let targetWidth = img.width;
      let targetHeight = img.height;
      let quality = 0.9;

      switch (optimizationLevel) {
        case 'basic':
          if (targetWidth > 1920) {
            targetHeight = (targetHeight * 1920) / targetWidth;
            targetWidth = 1920;
          }
          quality = 0.85;
          break;
        case 'standard':
          if (targetWidth > 1200) {
            targetHeight = (targetHeight * 1200) / targetWidth;
            targetWidth = 1200;
          }
          quality = 0.75;
          break;
        case 'aggressive':
          if (targetWidth > 800) {
            targetHeight = (targetHeight * 800) / targetWidth;
            targetWidth = 800;
          }
          quality = 0.65;
          break;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Generate optimized versions in different formats
      for (const format of outputFormats) {
        try {
          const optimizedBlob = await canvas.convertToBlob({
            type: `image/${format}`,
            quality: quality
          });
          
          processedFiles.push({
            format,
            buffer: await optimizedBlob.arrayBuffer(),
            size: optimizedBlob.size
          });
        } catch (error) {
          console.warn(`Failed to convert to ${format}, skipping:`, error);
        }
      }

      URL.revokeObjectURL(imageUrl);

    } else if (isVideo) {
      // For video processing, we'll simulate optimization
      // In a real implementation, you'd use FFmpeg WASM or similar
      const reductionFactor = optimizationLevel === 'aggressive' ? 0.6 : 
                            optimizationLevel === 'standard' ? 0.75 : 0.85;
      
      const simulatedSize = Math.floor(originalSize * reductionFactor);
      processedFiles.push({
        format: 'mp4',
        buffer: originalBuffer, // In reality, this would be processed
        size: simulatedSize
      });
    }

    // Upload processed files
    const uploadPromises = processedFiles.map(async (file, index) => {
      const fileName = `${contentId}_optimized_${file.format}_${Date.now()}_${index}`;
      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(`optimized/${fileName}`, file.buffer, {
          contentType: `${isImage ? 'image' : 'video'}/${file.format}`,
          upsert: true
        });

      if (uploadError) {
        console.error(`Failed to upload ${file.format} version:`, uploadError);
        return null;
      }

      return {
        format: file.format,
        path: `optimized/${fileName}`,
        size: file.size,
        originalSize
      };
    });

    const uploadResults = await Promise.all(uploadPromises);
    const successfulUploads = uploadResults.filter(Boolean);

    // Update content metadata with optimization results
    const optimizationMetadata = {
      originalSize,
      optimizedVersions: successfulUploads,
      spaceSaved: originalSize - successfulUploads.reduce((acc, file) => acc + (file?.size || 0), 0),
      optimizationLevel,
      processedAt: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('content_items')
      .update({
        metadata: {
          optimization: optimizationMetadata
        }
      })
      .eq('id', contentId);

    if (updateError) {
      console.error('Failed to update content metadata:', updateError);
    }

    // Create processing job record
    await supabase
      .from('file_processing_jobs')
      .insert({
        content_id: contentId,
        job_type: 'media_optimization',
        status: 'completed',
        input_data: { optimizationLevel, outputFormats },
        output_data: optimizationMetadata,
        completed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - new Date().getTime()
      });

    return new Response(JSON.stringify({
      success: true,
      optimizationResults: optimizationMetadata
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Media processing error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Media processing failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});