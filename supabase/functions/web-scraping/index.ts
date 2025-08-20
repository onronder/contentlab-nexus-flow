import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withSecurity, SecurityLogger } from "../_shared/security.ts";

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

// Generate content hash for change detection
const generateContentHash = async (content: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Extract structured content from HTML
const extractContent = (html: string, url: string) => {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // Extract meta description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1].trim() : '';
  
  // Extract pricing information (common patterns)
  const pricingPatterns = [
    /\$[\d,]+\.?\d*/g,
    /€[\d,]+\.?\d*/g,
    /£[\d,]+\.?\d*/g,
    /price[^>]*>([^<]+)</gi,
    /cost[^>]*>([^<]+)</gi,
  ];
  
  const pricing = [];
  for (const pattern of pricingPatterns) {
    const matches = html.match(pattern);
    if (matches) {
      pricing.push(...matches.slice(0, 5)); // Limit to 5 matches per pattern
    }
  }
  
  // Extract headings for content structure
  const headings = [];
  const headingMatches = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi);
  if (headingMatches) {
    headings.push(...headingMatches.slice(0, 10).map(h => h.replace(/<[^>]*>/g, '')));
  }
  
  // Extract contact information
  const contactPatterns = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    /\+?[\d\s\-\(\)]{10,}/g
  ];
  
  const contacts = [];
  for (const pattern of contactPatterns) {
    const matches = html.match(pattern);
    if (matches) {
      contacts.push(...matches.slice(0, 3)); // Limit contacts
    }
  }
  
  return {
    title,
    description,
    content_sections: {
      headings,
      pricing_mentions: pricing,
      contact_info: contacts
    },
    pricing_data: {
      detected_prices: pricing,
      currency_found: pricing.some(p => p.includes('$')) ? 'USD' : 
                     pricing.some(p => p.includes('€')) ? 'EUR' : 
                     pricing.some(p => p.includes('£')) ? 'GBP' : 'unknown'
    },
    technical_data: {
      page_size: html.length,
      has_javascript: html.includes('<script'),
      has_forms: html.includes('<form'),
      external_links: (html.match(/href=["']https?:\/\/[^"']+/g) || []).length
    }
  };
};

const handler = async (req: Request, logger: SecurityLogger): Promise<Response> => {
  try {
    logger.info('Web scraping request received');
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, competitorId, url, detectChanges = false } = await req.json();
    logger.info('Processing web scraping', { action, competitorId, url });

    if (action === 'scrape_website') {
      console.log(`Scraping website: ${url} for competitor: ${competitorId}`);
      
      try {
        // Fetch website content through BrightData proxy
        const response = await fetchWithProxy(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
        }
        
        const html = await response.text();
        const contentHash = await generateContentHash(html);
        
        // Extract structured content
        const extracted = extractContent(html, url);
        
        // Check for changes if requested
        let hasChanges = false;
        let changeSummary = '';
        
        if (detectChanges) {
          // Get the latest snapshot for comparison
          const { data: latestSnapshot } = await supabase
            .from('competitor_website_snapshots')
            .select('content_hash, title, description')
            .eq('competitor_id', competitorId)
            .eq('url', url)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (latestSnapshot && latestSnapshot.content_hash !== contentHash) {
            hasChanges = true;
            
            // Generate change summary
            const changes = [];
            if (latestSnapshot.title !== extracted.title) {
              changes.push('Title changed');
            }
            if (latestSnapshot.description !== extracted.description) {
              changes.push('Meta description changed');
            }
            changes.push('Content updated');
            
            changeSummary = changes.join(', ');
          }
        }
        
        // Store website snapshot
        const { data: snapshot, error } = await supabase
          .from('competitor_website_snapshots')
          .insert({
            competitor_id: competitorId,
            url,
            content_hash: contentHash,
            title: extracted.title,
            description: extracted.description,
            content_sections: extracted.content_sections,
            pricing_data: extracted.pricing_data,
            technical_data: extracted.technical_data,
            change_summary: hasChanges ? changeSummary : null,
            change_type: hasChanges ? 'content' : null
          })
          .select()
          .single();
        
        if (error) {
          throw new Error(`Failed to store snapshot: ${error.message}`);
        }
        
        console.log(`Website scraping completed for ${url}`);
        
        return new Response(JSON.stringify({
          success: true,
          snapshot,
          hasChanges,
          changeSummary,
          extractedData: extracted,
          creditsUsed: 1
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (error) {
        console.error(`Error scraping website ${url}:`, error);
        throw error;
      }
    }
    
    if (action === 'detect_changes') {
      const { urls } = await req.json();
      const results = [];
      
      for (const targetUrl of urls) {
        try {
          const response = await fetchWithProxy(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (response.ok) {
            const html = await response.text();
            const contentHash = await generateContentHash(html);
            
            // Get latest snapshot
            const { data: latestSnapshot } = await supabase
              .from('competitor_website_snapshots')
              .select('content_hash')
              .eq('competitor_id', competitorId)
              .eq('url', targetUrl)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            const hasChanges = latestSnapshot && latestSnapshot.content_hash !== contentHash;
            
            results.push({
              url: targetUrl,
              hasChanges,
              currentHash: contentHash,
              previousHash: latestSnapshot?.content_hash || null
            });
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error checking changes for ${targetUrl}:`, error);
          results.push({
            url: targetUrl,
            hasChanges: false,
            error: error.message
          });
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        results,
        creditsUsed: urls.length
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
    logger.error('Web scraping failed', error as Error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export default withSecurity(handler, {
  requireAuth: true,
  rateLimitRequests: 30, // Limited due to web scraping
  rateLimitWindow: 60000,
  validateInput: true,
  enableCORS: true
});