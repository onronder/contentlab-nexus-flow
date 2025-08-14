/**
 * Production Security Middleware for Supabase Edge Functions
 * Implements rate limiting, input validation, security headers, and structured logging
 */

// Rate limiting store (in-memory for simplicity - use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security headers for production
export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; object-src 'none'; base-uri 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Input validation utilities
export const validateInput = {
  email: (email: string): { isValid: boolean; error?: string } => {
    if (!email) return { isValid: false, error: 'Email is required' };
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }
    
    if (email.length > 254) {
      return { isValid: false, error: 'Email too long' };
    }
    
    // Check for dangerous characters
    if (/[<>'"&]/.test(email)) {
      return { isValid: false, error: 'Email contains invalid characters' };
    }
    
    return { isValid: true };
  },

  text: (text: string, maxLength = 1000): { isValid: boolean; error?: string } => {
    if (!text) return { isValid: false, error: 'Text is required' };
    
    if (text.length > maxLength) {
      return { isValid: false, error: `Text too long (max ${maxLength} characters)` };
    }
    
    // Basic XSS protection
    if (/<script|javascript:|on\w+=/i.test(text)) {
      return { isValid: false, error: 'Text contains potentially malicious content' };
    }
    
    return { isValid: true };
  },

  uuid: (id: string): { isValid: boolean; error?: string } => {
    if (!id) return { isValid: false, error: 'ID is required' };
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return { isValid: false, error: 'Invalid UUID format' };
    }
    
    return { isValid: true };
  }
};

// Rate limiting implementation
export class ProductionRateLimiter {
  static isAllowed(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
    
    const current = rateLimitStore.get(identifier);
    
    if (!current) {
      rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (current.count >= maxRequests) {
      return false;
    }
    
    current.count++;
    return true;
  }
  
  static getRemainingTime(identifier: string): number {
    const current = rateLimitStore.get(identifier);
    if (!current) return 0;
    return Math.max(0, current.resetTime - Date.now());
  }
}

// Structured logging
export class SecurityLogger {
  private correlationId: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId || crypto.randomUUID();
  }
  
  info(message: string, metadata?: Record<string, any>) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      ...metadata
    }));
  }
  
  warn(message: string, metadata?: Record<string, any>) {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      ...metadata
    }));
  }
  
  error(message: string, error?: Error, metadata?: Record<string, any>) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      ...metadata
    }));
  }
  
  security(event: string, metadata?: Record<string, any>) {
    console.log(JSON.stringify({
      level: 'security',
      event,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      ...metadata
    }));
  }
}

// Security middleware
export interface SecurityOptions {
  requireAuth?: boolean;
  rateLimitRequests?: number;
  rateLimitWindow?: number;
  validateInput?: boolean;
  enableCORS?: boolean;
}

export function withSecurity(
  handler: (req: Request, logger: SecurityLogger) => Promise<Response>,
  options: SecurityOptions = {}
) {
  const {
    requireAuth = true,
    rateLimitRequests = 100,
    rateLimitWindow = 60000, // 1 minute
    validateInput = true,
    enableCORS = true
  } = options;

  return async (req: Request): Promise<Response> => {
    const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();
    const logger = new SecurityLogger(correlationId);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS' && enableCORS) {
      return new Response(null, {
        headers: { ...CORS_HEADERS, ...SECURITY_HEADERS }
      });
    }
    
    try {
      const clientIP = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
      
      logger.info('Request received', {
        method: req.method,
        url: req.url,
        userAgent: req.headers.get('user-agent'),
        clientIP
      });
      
      // Rate limiting
      const rateLimitKey = `${clientIP}:${req.url}`;
      if (!ProductionRateLimiter.isAllowed(rateLimitKey, rateLimitRequests, rateLimitWindow)) {
        logger.security('Rate limit exceeded', { clientIP, url: req.url });
        
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(ProductionRateLimiter.getRemainingTime(rateLimitKey) / 1000)
        }), {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            ...SECURITY_HEADERS,
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(ProductionRateLimiter.getRemainingTime(rateLimitKey) / 1000))
          }
        });
      }
      
      // Authentication check
      if (requireAuth) {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          logger.security('Unauthorized access attempt', { clientIP, url: req.url });
          
          return new Response(JSON.stringify({
            error: 'Authentication required'
          }), {
            status: 401,
            headers: {
              ...CORS_HEADERS,
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        }
      }
      
      // Input validation for JSON requests
      if (validateInput && req.method !== 'GET' && req.headers.get('content-type')?.includes('application/json')) {
        try {
          const body = await req.clone().json();
          
          // Basic JSON structure validation
          if (typeof body !== 'object' || body === null) {
            return new Response(JSON.stringify({
              error: 'Invalid JSON payload'
            }), {
              status: 400,
              headers: {
                ...CORS_HEADERS,
                ...SECURITY_HEADERS,
                'Content-Type': 'application/json'
              }
            });
          }
        } catch (e) {
          return new Response(JSON.stringify({
            error: 'Invalid JSON format'
          }), {
            status: 400,
            headers: {
              ...CORS_HEADERS,
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        }
      }
      
      // Call the actual handler
      const response = await handler(req, logger);
      
      // Add security headers to response
      const secureHeaders = new Headers(response.headers);
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        secureHeaders.set(key, value);
      });
      
      if (enableCORS) {
        Object.entries(CORS_HEADERS).forEach(([key, value]) => {
          secureHeaders.set(key, value);
        });
      }
      
      logger.info('Request completed', {
        status: response.status,
        duration: Date.now() - new Date(logger.info as any).getTime()
      });
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: secureHeaders
      });
      
    } catch (error) {
      logger.error('Unhandled error in security middleware', error as Error);
      
      return new Response(JSON.stringify({
        error: 'Internal server error',
        correlationId
      }), {
        status: 500,
        headers: {
          ...CORS_HEADERS,
          ...SECURITY_HEADERS,
          'Content-Type': 'application/json'
        }
      });
    }
  };
}

// Circuit breaker for external APIs
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold = 5,
    private readonly timeout = 60000, // 1 minute
    private readonly retryTimeout = 30000 // 30 seconds
  ) {}
  
  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.retryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
  
  getState() {
    return this.state;
  }
}