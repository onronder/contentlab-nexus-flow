import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// BrightData proxy configuration
const getBrightDataProxy = () => {
  const host = Deno.env.get('BRIGHTDATA_PROXY_HOST');
  const port = Deno.env.get('BRIGHTDATA_PROXY_PORT');
  const customerId = Deno.env.get('BRIGHTDATA_CUSTOMER_ID');
  const zone = Deno.env.get('BRIGHTDATA_ZONE');
  const password = Deno.env.get('BRIGHTDATA_PASSWORD');
  
  if (!host || !port || !customerId || !zone || !password) {
    throw new Error('BrightData credentials not configured');
  }
  
  const proxyUser = `brd-customer-${customerId}-zone-${zone}`;
  return {
    host,
    port: parseInt(port),
    username: proxyUser,
    password
  };
};

// Fetch with BrightData proxy
const fetchWithProxy = async (url: string, options: RequestInit = {}) => {
  const proxy = getBrightDataProxy();
  
  // Create proxy URL
  const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
  
  const response = await fetch(url, {
    ...options,
    // @ts-ignore - Deno specific proxy configuration
    proxy: proxyUrl,
    // Ignore SSL errors for BrightData
    // @ts-ignore
    rejectUnauthorized: false
  });
  
  return response;
};

// Enrich competitor data from multiple sources
const enrichCompetitorData = async (domain: string, companyName: string) => {
  const enrichedData: any = {
    social_media: {},
    technology_stack: {},
    company_info: {},
    financial_data: {},
    contact_info: {}
  };
  
  try {
    // 1. Scrape main website for company information
    const mainSiteResponse = await fetchWithProxy(`https://${domain}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (mainSiteResponse.ok) {
      const html = await mainSiteResponse.text();
      
      // Extract company information
      const aboutMatch = html.match(/about[\s\S]{0,500}?(?:company|business|founded|started)/i);
      if (aboutMatch) {
        enrichedData.company_info.about_section = aboutMatch[0].replace(/<[^>]*>/g, '').trim();
      }
      
      // Extract contact information
      const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      if (emailMatches) {
        enrichedData.contact_info.emails = [...new Set(emailMatches)].slice(0, 5);
      }
      
      // Extract social media links
      const socialPatterns = {
        linkedin: /linkedin\.com\/company\/([^\/\s"']+)/i,
        twitter: /twitter\.com\/([^\/\s"']+)/i,
        facebook: /facebook\.com\/([^\/\s"']+)/i,
        instagram: /instagram\.com\/([^\/\s"']+)/i
      };
      
      for (const [platform, pattern] of Object.entries(socialPatterns)) {
        const match = html.match(pattern);
        if (match) {
          enrichedData.social_media[platform] = match[0];
        }
      }
      
      // Detect technology stack
      const technologies = [];
      if (html.includes('React')) technologies.push('React');
      if (html.includes('Vue')) technologies.push('Vue.js');
      if (html.includes('Angular')) technologies.push('Angular');
      if (html.includes('wp-content')) technologies.push('WordPress');
      if (html.includes('Shopify')) technologies.push('Shopify');
      if (html.includes('gtag') || html.includes('analytics')) technologies.push('Google Analytics');
      
      enrichedData.technology_stack.detected = technologies;
    }
    
    // 2. Try to get LinkedIn company page
    try {
      const linkedinUrl = `https://www.linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}`;
      const linkedinResponse = await fetchWithProxy(linkedinUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (linkedinResponse.ok) {
        const linkedinHtml = await linkedinResponse.text();
        
        // Extract employee count from LinkedIn
        const employeeMatch = linkedinHtml.match(/(\d+[\d,]*)\s*employees/i);
        if (employeeMatch) {
          enrichedData.company_info.employee_count = employeeMatch[1];
        }
        
        // Extract industry from LinkedIn
        const industryMatch = linkedinHtml.match(/Industry[^>]*>([^<]+)</i);
        if (industryMatch) {
          enrichedData.company_info.industry = industryMatch[1].trim();
        }
        
        // Extract company size
        const sizeMatch = linkedinHtml.match(/Company size[^>]*>([^<]+)</i);
        if (sizeMatch) {
          enrichedData.company_info.company_size = sizeMatch[1].trim();
        }
      }
    } catch (error) {
      console.log('LinkedIn enrichment failed:', error.message);
    }
    
    // 3. Check for pricing page
    try {
      const pricingUrls = [
        `https://${domain}/pricing`,
        `https://${domain}/plans`,
        `https://${domain}/price`,
        `https://${domain}/cost`
      ];
      
      for (const pricingUrl of pricingUrls) {
        try {
          const pricingResponse = await fetchWithProxy(pricingUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (pricingResponse.ok) {
            const pricingHtml = await pricingResponse.text();
            
            // Extract pricing information
            const priceMatches = pricingHtml.match(/\$[\d,]+\.?\d*/g);
            if (priceMatches) {
              enrichedData.financial_data.pricing_found = true;
              enrichedData.financial_data.detected_prices = [...new Set(priceMatches)].slice(0, 10);
              enrichedData.financial_data.pricing_url = pricingUrl;
            }
            break;
          }
        } catch (error) {
          console.log(`Failed to check pricing URL ${pricingUrl}:`, error.message);
        }
      }
    } catch (error) {
      console.log('Pricing enrichment failed:', error.message);
    }
    
    // Add timestamp and source
    enrichedData.enrichment_timestamp = new Date().toISOString();
    enrichedData.data_sources = ['website_scraping', 'linkedin', 'pricing_pages'];
    
  } catch (error) {
    console.error('Error in enrichment process:', error);
    enrichedData.error = error.message;
  }
  
  return enrichedData;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, competitorId, domain, companyName } = await req.json();

    if (action === 'enrich_competitor') {
      console.log(`Enriching competitor data for: ${companyName} (${domain})`);
      
      try {
        // Get existing competitor data
        const { data: competitor, error: fetchError } = await supabase
          .from('project_competitors')
          .select('*')
          .eq('id', competitorId)
          .single();
        
        if (fetchError) {
          throw new Error(`Failed to fetch competitor: ${fetchError.message}`);
        }
        
        // Perform data enrichment
        const enrichedData = await enrichCompetitorData(domain, companyName);
        
        // Update competitor with enriched data
        const updateData: any = {
          custom_attributes: {
            ...competitor.custom_attributes,
            enrichment_data: enrichedData
          }
        };
        
        // Update specific fields if we found them
        if (enrichedData.company_info.employee_count) {
          updateData.employee_count = enrichedData.company_info.employee_count;
        }
        
        if (enrichedData.company_info.industry) {
          updateData.industry = enrichedData.company_info.industry;
        }
        
        if (enrichedData.company_info.company_size) {
          updateData.company_size = enrichedData.company_info.company_size;
        }
        
        // Calculate data quality score
        let qualityScore = 0;
        if (enrichedData.contact_info.emails?.length) qualityScore += 20;
        if (enrichedData.social_media && Object.keys(enrichedData.social_media).length) qualityScore += 20;
        if (enrichedData.company_info.employee_count) qualityScore += 15;
        if (enrichedData.company_info.industry) qualityScore += 15;
        if (enrichedData.financial_data.pricing_found) qualityScore += 20;
        if (enrichedData.technology_stack.detected?.length) qualityScore += 10;
        
        updateData.data_quality_score = qualityScore;
        updateData.last_analysis_date = new Date().toISOString();
        
        const { error: updateError } = await supabase
          .from('project_competitors')
          .update(updateData)
          .eq('id', competitorId);
        
        if (updateError) {
          throw new Error(`Failed to update competitor: ${updateError.message}`);
        }
        
        console.log(`Data enrichment completed for ${companyName}`);
        
        return new Response(JSON.stringify({
          success: true,
          enrichedData,
          qualityScore,
          creditsUsed: 1
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (error) {
        console.error(`Error enriching competitor ${competitorId}:`, error);
        throw error;
      }
    }
    
    if (action === 'get_usage_stats') {
      const { projectId, timeRange } = await req.json();
      
      // Calculate usage statistics
      const startDate = timeRange?.start ? new Date(timeRange.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = timeRange?.end ? new Date(timeRange.end) : new Date();
      
      // Get API usage from external_data_logs
      const { data: logs, error } = await supabase
        .from('external_data_logs')
        .select('api_provider, request_type, cost_credits, created_at')
        .eq('project_id', projectId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (error) {
        throw new Error(`Failed to fetch usage stats: ${error.message}`);
      }
      
      // Calculate statistics
      const totalCredits = logs?.reduce((sum, log) => sum + (log.cost_credits || 0), 0) || 0;
      const totalRequests = logs?.length || 0;
      
      const providerStats = logs?.reduce((acc, log) => {
        const provider = log.api_provider || 'unknown';
        if (!acc[provider]) {
          acc[provider] = { requests: 0, credits: 0 };
        }
        acc[provider].requests++;
        acc[provider].credits += log.cost_credits || 0;
        return acc;
      }, {} as Record<string, { requests: number; credits: number }>) || {};
      
      const requestTypeStats = logs?.reduce((acc, log) => {
        const type = log.request_type || 'unknown';
        if (!acc[type]) {
          acc[type] = { requests: 0, credits: 0 };
        }
        acc[type].requests++;
        acc[type].credits += log.cost_credits || 0;
        return acc;
      }, {} as Record<string, { requests: number; credits: number }>) || {};
      
      return new Response(JSON.stringify({
        success: true,
        timeRange: { start: startDate, end: endDate },
        totalCredits,
        totalRequests,
        providerStats,
        requestTypeStats,
        averageCreditsPerRequest: totalRequests > 0 ? totalCredits / totalRequests : 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid action specified'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in data enrichment function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});