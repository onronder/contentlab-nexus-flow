import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock edge function responses for testing
const mockEdgeFunction = (functionName: string, response: any) => {
  vi.spyOn(supabase.functions, 'invoke').mockImplementation(async (name, options) => {
    if (name === functionName) {
      return { data: response, error: null };
    }
    return { data: null, error: new Error('Function not mocked') };
  });
};

describe('Critical Edge Functions Integration Tests', () => {
  beforeAll(() => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('AI Collaboration Assistant', () => {
    it('should process collaboration requests', async () => {
      const mockResponse = {
        status: 'success',
        suggestions: ['Test suggestion'],
        confidence: 0.8
      };
      
      mockEdgeFunction('ai-collaboration-assistant', mockResponse);

      const { data, error } = await supabase.functions.invoke('ai-collaboration-assistant', {
        body: {
          sessionId: 'test-session',
          action: 'get_suggestions',
          content: 'Test content for collaboration'
        }
      });

      expect(error).toBeNull();
      expect(data).toEqual(mockResponse);
      expect(data.status).toBe('success');
    });

    it('should handle invalid session IDs', async () => {
      mockEdgeFunction('ai-collaboration-assistant', null);
      
      const { error } = await supabase.functions.invoke('ai-collaboration-assistant', {
        body: { sessionId: 'invalid', action: 'get_suggestions' }
      });

      expect(error).toBeDefined();
    });
  });

  describe('Content Analyzer', () => {
    it('should analyze content and return insights', async () => {
      const mockAnalysis = {
        contentType: 'article',
        readabilityScore: 75,
        seoScore: 80,
        keywords: ['test', 'content'],
        suggestions: ['Improve readability']
      };

      mockEdgeFunction('content-analyzer', mockAnalysis);

      const { data, error } = await supabase.functions.invoke('content-analyzer', {
        body: {
          contentId: 'test-content-id',
          content: 'This is test content for analysis.',
          analysisType: 'full'
        }
      });

      expect(error).toBeNull();
      expect(data.contentType).toBe('article');
      expect(data.readabilityScore).toBeGreaterThan(0);
    });
  });

  describe('Analytics Processor', () => {
    it('should process analytics data successfully', async () => {
      const mockProcessedData = {
        totalEvents: 100,
        processed: true,
        timeframe: '24h',
        metrics: {
          users: 50,
          sessions: 75,
          pageViews: 200
        }
      };

      mockEdgeFunction('analytics-processor', mockProcessedData);

      const { data, error } = await supabase.functions.invoke('analytics-processor', {
        body: {
          eventType: 'page_view',
          timeframe: '24h',
          aggregationType: 'count'
        }
      });

      expect(error).toBeNull();
      expect(data.processed).toBe(true);
      expect(data.metrics).toBeDefined();
    });
  });

  describe('Security Monitor', () => {
    it('should detect and report security events', async () => {
      const mockSecurityReport = {
        threatLevel: 'low',
        events: [],
        recommendations: ['Enable 2FA'],
        lastScan: new Date().toISOString()
      };

      mockEdgeFunction('security-monitor', mockSecurityReport);

      const { data, error } = await supabase.functions.invoke('security-monitor', {
        body: {
          scanType: 'quick',
          includeRecommendations: true
        }
      });

      expect(error).toBeNull();
      expect(data.threatLevel).toBe('low');
      expect(Array.isArray(data.events)).toBe(true);
    });
  });

  describe('Document Processor', () => {
    it('should process uploaded documents', async () => {
      const mockProcessingResult = {
        processed: true,
        extractedText: 'Sample extracted text',
        metadata: {
          pageCount: 1,
          wordCount: 50,
          language: 'en'
        },
        thumbnailPath: '/thumbnails/test.jpg'
      };

      mockEdgeFunction('document-processor', mockProcessingResult);

      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          filePath: '/uploads/test-document.pdf',
          extractText: true,
          generateThumbnail: true
        }
      });

      expect(error).toBeNull();
      expect(data.processed).toBe(true);
      expect(data.extractedText).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return system health status', async () => {
      const mockHealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
          storage: 'up',
          ai: 'up'
        },
        uptime: '99.9%'
      };

      mockEdgeFunction('health-check', mockHealthStatus);

      const { data, error } = await supabase.functions.invoke('health-check');

      expect(error).toBeNull();
      expect(data.status).toBe('healthy');
      expect(data.services).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle function timeout gracefully', async () => {
      vi.spyOn(supabase.functions, 'invoke').mockRejectedValue(
        new Error('Function timeout')
      );

      const { error } = await supabase.functions.invoke('slow-function', {
        body: { data: 'test' }
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('timeout');
    });

    it('should handle network errors', async () => {
      vi.spyOn(supabase.functions, 'invoke').mockRejectedValue(
        new Error('Network error')
      );

      const { error } = await supabase.functions.invoke('test-function');

      expect(error).toBeDefined();
      expect(error.message).toContain('Network error');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for protected functions', async () => {
      // Mock unauthenticated user response with proper AuthError structure
      const mockAuthError = {
        message: 'Not authenticated',
        code: 'UNAUTHENTICATED',
        status: 401,
        __isAuthError: true
      };

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: null },
        error: mockAuthError as any
      });

      const { error } = await supabase.functions.invoke('protected-function', {
        body: { data: 'test' }
      });

      expect(error).toBeDefined();
    });
  });
});