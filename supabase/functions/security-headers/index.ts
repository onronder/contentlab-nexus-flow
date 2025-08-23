import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================================================
// SECURITY HEADERS EDGE FUNCTION - Enhanced Security Headers & CORS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

const securityHeaders = {
  // Content Security Policy - Comprehensive protection
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://ijvhqqdfthchtittyvnt.supabase.co wss://ijvhqqdfthchtittyvnt.functions.supabase.co https://api.openai.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),

  // HTTP Strict Transport Security - Force HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS Protection
  'X-XSS-Protection': '1; mode=block',

  // Frame Options - Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Referrer Policy - Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy - Control browser features
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'bluetooth=()',
    'accelerometer=()',
    'gyroscope=()',
    'magnetometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'encrypted-media=()',
    'fullscreen=()',
    'picture-in-picture=()'
  ].join(', '),

  // Cross-Origin Policies
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',

  // Cache Control for security-sensitive responses
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  
  // Pragma for HTTP/1.0 compatibility
  'Pragma': 'no-cache',

  // Server identification
  'X-Powered-By': 'Supabase Edge Functions',
  
  // Security contact information
  'Security-Contact': 'security@contentlab-nexus.com',
  
  // Report violations
  'Report-To': JSON.stringify({
    group: 'csp-endpoint',
    max_age: 10886400,
    endpoints: [{ url: 'https://ijvhqqdfthchtittyvnt.functions.supabase.co/security-violation-report' }]
  }),

  // Certificate Transparency
  'Expect-CT': 'max-age=86400, enforce, report-uri="https://ijvhqqdfthchtittyvnt.functions.supabase.co/ct-report"',

  // Additional security measures
  'X-Permitted-Cross-Domain-Policies': 'none',
  'X-Download-Options': 'noopen',
  'X-DNS-Prefetch-Control': 'off',
};

serve(async (req) => {
  console.log('Security headers function called:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { ...corsHeaders, ...securityHeaders }
    });
  }

  try {
    const { action, headers: customHeaders } = await req.json();

    let responseHeaders = { ...corsHeaders, ...securityHeaders };

    switch (action) {
      case 'get_security_headers':
        // Return current security headers configuration
        return new Response(JSON.stringify({
          security_headers: securityHeaders,
          cors_headers: corsHeaders,
          compliance_level: 'enterprise',
          last_updated: new Date().toISOString()
        }), {
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        });

      case 'validate_csp':
        // Validate Content Security Policy
        const cspValidation = validateCSP(customHeaders?.csp || '');
        return new Response(JSON.stringify(cspValidation), {
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        });

      case 'security_audit':
        // Perform security headers audit
        const auditResults = await performSecurityAudit(req.headers);
        return new Response(JSON.stringify(auditResults), {
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        });

      case 'update_csp':
        // Dynamically update CSP (for development/testing)
        if (customHeaders?.csp) {
          responseHeaders['Content-Security-Policy'] = customHeaders.csp;
        }
        return new Response(JSON.stringify({
          success: true,
          updated_csp: responseHeaders['Content-Security-Policy']
        }), {
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({
          error: 'Invalid action',
          available_actions: ['get_security_headers', 'validate_csp', 'security_audit', 'update_csp']
        }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Security headers function error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateCSP(csp: string): any {
  const validation = {
    is_valid: true,
    warnings: [] as string[],
    errors: [] as string[],
    recommendations: [] as string[]
  };

  if (!csp) {
    validation.is_valid = false;
    validation.errors.push('CSP header is empty or missing');
    return validation;
  }

  // Check for unsafe-inline and unsafe-eval
  if (csp.includes("'unsafe-inline'")) {
    validation.warnings.push("CSP contains 'unsafe-inline' which may allow XSS attacks");
  }

  if (csp.includes("'unsafe-eval'")) {
    validation.warnings.push("CSP contains 'unsafe-eval' which may allow code injection");
  }

  // Check for wildcards
  if (csp.includes('*') && !csp.includes('data:')) {
    validation.warnings.push('CSP contains wildcards which may be overly permissive');
  }

  // Check for required directives
  const requiredDirectives = ['default-src', 'script-src', 'style-src', 'img-src'];
  for (const directive of requiredDirectives) {
    if (!csp.includes(directive)) {
      validation.recommendations.push(`Consider adding ${directive} directive for better security`);
    }
  }

  // Check for object-src 'none'
  if (!csp.includes("object-src 'none'")) {
    validation.recommendations.push("Consider adding object-src 'none' to prevent plugin execution");
  }

  // Check for base-uri
  if (!csp.includes('base-uri')) {
    validation.recommendations.push("Consider adding base-uri directive to prevent base tag injection");
  }

  return validation;
}

async function performSecurityAudit(headers: Headers): any {
  const audit = {
    timestamp: new Date().toISOString(),
    security_score: 0,
    max_score: 100,
    findings: [] as any[],
    recommendations: [] as string[]
  };

  let score = 0;

  // Check for security headers
  const securityChecks = [
    { header: 'strict-transport-security', points: 15, critical: true },
    { header: 'content-security-policy', points: 20, critical: true },
    { header: 'x-frame-options', points: 10, critical: false },
    { header: 'x-content-type-options', points: 10, critical: false },
    { header: 'x-xss-protection', points: 10, critical: false },
    { header: 'referrer-policy', points: 5, critical: false },
    { header: 'permissions-policy', points: 10, critical: false },
    { header: 'cross-origin-opener-policy', points: 5, critical: false },
    { header: 'cross-origin-embedder-policy', points: 5, critical: false },
    { header: 'expect-ct', points: 5, critical: false },
    { header: 'x-permitted-cross-domain-policies', points: 5, critical: false }
  ];

  for (const check of securityChecks) {
    const headerValue = headers.get(check.header);
    if (headerValue) {
      score += check.points;
      audit.findings.push({
        type: 'security_header_present',
        severity: 'good',
        header: check.header,
        value: headerValue.substring(0, 100) + (headerValue.length > 100 ? '...' : ''),
        points: check.points
      });
    } else {
      audit.findings.push({
        type: 'security_header_missing',
        severity: check.critical ? 'critical' : 'warning',
        header: check.header,
        points: 0,
        recommendation: `Add ${check.header} header for enhanced security`
      });
      
      if (check.critical) {
        audit.recommendations.push(`CRITICAL: Add ${check.header} header`);
      } else {
        audit.recommendations.push(`Add ${check.header} header for better security`);
      }
    }
  }

  // Check CSP quality if present
  const csp = headers.get('content-security-policy');
  if (csp) {
    const cspValidation = validateCSP(csp);
    if (!cspValidation.is_valid) {
      score -= 10;
      audit.findings.push({
        type: 'csp_validation_failed',
        severity: 'error',
        details: cspValidation.errors
      });
    }
    
    if (cspValidation.warnings.length > 0) {
      score -= cspValidation.warnings.length * 2;
      audit.findings.push({
        type: 'csp_warnings',
        severity: 'warning',
        details: cspValidation.warnings
      });
    }
  }

  // Check for insecure headers
  const insecureHeaders = ['server', 'x-powered-by'];
  for (const header of insecureHeaders) {
    const value = headers.get(header);
    if (value && value !== 'Supabase Edge Functions') {
      score -= 5;
      audit.findings.push({
        type: 'information_disclosure',
        severity: 'warning',
        header: header,
        value: value,
        recommendation: `Remove or obfuscate ${header} header to prevent information disclosure`
      });
    }
  }

  audit.security_score = Math.max(0, Math.min(100, score));

  // Overall recommendations based on score
  if (audit.security_score >= 90) {
    audit.recommendations.unshift('Excellent security posture! Continue monitoring for new threats.');
  } else if (audit.security_score >= 70) {
    audit.recommendations.unshift('Good security configuration with room for improvement.');
  } else if (audit.security_score >= 50) {
    audit.recommendations.unshift('Moderate security - several improvements needed.');
  } else {
    audit.recommendations.unshift('CRITICAL: Significant security improvements required immediately.');
  }

  return audit;
}