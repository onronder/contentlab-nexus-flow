import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentProcessingRequest {
  contentId: string;
  filePath: string;
  extractText: boolean;
  generateThumbnail: boolean;
  analyzeStructure: boolean;
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
      contentId, 
      filePath, 
      extractText = true, 
      generateThumbnail = true,
      analyzeStructure = true 
    }: DocumentProcessingRequest = await req.json();

    console.log(`Processing document for content ${contentId}`);

    // Download the document
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('content')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    const mimeType = fileData.type;
    const isPDF = mimeType === 'application/pdf';
    const isTextDoc = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mimeType);
    const isSpreadsheet = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mimeType);

    let processingResults: any = {
      contentId,
      fileType: mimeType,
      processedAt: new Date().toISOString()
    };

    // Text extraction
    if (extractText) {
      console.log('Extracting text...');
      
      if (isPDF) {
        // Simulate PDF text extraction
        // In real implementation, use pdf-parse or similar
        processingResults.extractedText = `Extracted text from PDF document ${contentId}. This would contain the actual document content in a real implementation.`;
        processingResults.pageCount = Math.floor(Math.random() * 20) + 1;
        processingResults.wordCount = Math.floor(Math.random() * 5000) + 100;
      } else if (isTextDoc) {
        // Simulate Word document processing
        processingResults.extractedText = `Extracted text from Word document ${contentId}. This includes all text content, formatting information, and metadata.`;
        processingResults.wordCount = Math.floor(Math.random() * 3000) + 200;
      } else if (isSpreadsheet) {
        // Simulate spreadsheet processing
        processingResults.extractedText = `Extracted data from spreadsheet ${contentId}. Contains cell values, formulas, and sheet structure.`;
        processingResults.sheetCount = Math.floor(Math.random() * 5) + 1;
        processingResults.cellCount = Math.floor(Math.random() * 10000) + 100;
      } else {
        // Generic text extraction
        const buffer = await fileData.arrayBuffer();
        const text = new TextDecoder().decode(buffer);
        processingResults.extractedText = text.substring(0, 5000); // Limit to 5000 chars
        processingResults.wordCount = text.split(/\s+/).length;
      }

      // Analyze text content
      if (processingResults.extractedText) {
        const text = processingResults.extractedText;
        processingResults.language = 'en'; // In real implementation, use language detection
        processingResults.readingLevel = Math.floor(Math.random() * 15) + 5; // Grade level
        processingResults.sentiment = Math.random() > 0.5 ? 'positive' : Math.random() > 0.5 ? 'neutral' : 'negative';
        
        // Extract keywords (simplified)
        const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
        const wordFreq = words.reduce((acc: any, word) => {
          acc[word] = (acc[word] || 0) + 1;
          return acc;
        }, {});
        
        processingResults.keywords = Object.entries(wordFreq)
          .sort(([,a]: any, [,b]: any) => b - a)
          .slice(0, 10)
          .map(([word]) => word);
      }
    }

    // Thumbnail generation
    if (generateThumbnail) {
      console.log('Generating thumbnail...');
      
      // Simulate thumbnail generation
      // In real implementation, use pdf2pic, or document preview APIs
      const thumbnailData = new Uint8Array(1000); // Simulate image data
      crypto.getRandomValues(thumbnailData);
      
      const thumbnailFileName = `${contentId}_thumbnail_${Date.now()}.png`;
      const { error: thumbUploadError } = await supabase.storage
        .from('content')
        .upload(`thumbnails/${thumbnailFileName}`, thumbnailData, {
          contentType: 'image/png',
          upsert: true
        });

      if (!thumbUploadError) {
        processingResults.thumbnailPath = `thumbnails/${thumbnailFileName}`;
      } else {
        console.error('Failed to upload thumbnail:', thumbUploadError);
      }
    }

    // Structure analysis
    if (analyzeStructure) {
      console.log('Analyzing document structure...');
      
      if (isPDF) {
        processingResults.structure = {
          hasBookmarks: Math.random() > 0.5,
          hasImages: Math.random() > 0.3,
          hasTables: Math.random() > 0.4,
          hasLinks: Math.random() > 0.6,
          isScanned: Math.random() > 0.7,
          pageLayout: Math.random() > 0.5 ? 'single-column' : 'multi-column'
        };
      } else if (isTextDoc) {
        processingResults.structure = {
          hasHeadings: Math.random() > 0.3,
          hasImages: Math.random() > 0.4,
          hasTables: Math.random() > 0.5,
          hasFootnotes: Math.random() > 0.6,
          hasComments: Math.random() > 0.7,
          stylesUsed: ['Normal', 'Heading 1', 'Heading 2', 'Bold', 'Italic']
        };
      } else if (isSpreadsheet) {
        processingResults.structure = {
          hasFormulas: Math.random() > 0.4,
          hasCharts: Math.random() > 0.3,
          hasPivotTables: Math.random() > 0.6,
          hasConditionalFormatting: Math.random() > 0.5,
          dataTypes: ['text', 'number', 'date', 'currency']
        };
      }
    }

    // Update content item with processing results
    const { error: updateError } = await supabase
      .from('content_items')
      .update({
        metadata: {
          ...processingResults,
          searchVector: processingResults.extractedText || ''
        },
        search_vector: processingResults.extractedText || null
      })
      .eq('id', contentId);

    if (updateError) {
      console.error('Failed to update content metadata:', updateError);
    }

    // Update search index if text was extracted
    if (processingResults.extractedText) {
      await supabase
        .from('content_search_index')
        .upsert({
          content_id: contentId,
          title_vector: processingResults.extractedText.substring(0, 100),
          content_vector: processingResults.extractedText,
          description_vector: processingResults.extractedText.substring(0, 500),
          combined_vector: processingResults.extractedText,
          ai_keywords: processingResults.keywords || [],
          language: processingResults.language || 'en',
          content_quality_score: Math.random() * 100,
          last_indexed_at: new Date().toISOString()
        }, {
          onConflict: 'content_id'
        });
    }

    // Create processing job record
    await supabase
      .from('file_processing_jobs')
      .insert({
        content_id: contentId,
        job_type: 'document_processing',
        status: 'completed',
        input_data: { extractText, generateThumbnail, analyzeStructure },
        output_data: processingResults,
        completed_at: new Date().toISOString()
      });

    return new Response(JSON.stringify({
      success: true,
      processingResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Document processing error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Document processing failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});