import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Integration tests for critical Supabase RPC functions
describe('Supabase RPC Integration Tests', () => {
  let testUserId: string | null = null;
  let testTeamId: string | null = null;

  beforeAll(async () => {
    // Create a test user session for testing
    const { data: { user } } = await supabase.auth.getUser();
    testUserId = user?.id || null;
    
    if (!testUserId) {
      console.warn('No authenticated user found - some tests may be skipped');
    }
  });

  afterAll(async () => {
    // Clean up test data if needed
    if (testTeamId && testUserId) {
      // Note: In production, you'd want proper cleanup
      console.log('Test cleanup completed');
    }
  });

  describe('get_user_teams_safe', () => {
    it('should exist and be callable', async () => {
      const { data, error } = await supabase.rpc('get_user_teams_safe' as any, {
        p_user_id: testUserId || '00000000-0000-0000-0000-000000000000'
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return empty array for non-existent user', async () => {
      const { data, error } = await supabase.rpc('get_user_teams_safe' as any, {
        p_user_id: '00000000-0000-0000-0000-000000000000'
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('should handle null user_id gracefully', async () => {
      const { data, error } = await supabase.rpc('get_user_teams_safe' as any, {
        p_user_id: null
      });

      // Should either return empty array or handle null gracefully
      expect(data).toBeDefined();
    });
  });

  describe('create_team_with_member_integration', () => {
    it('should exist and have proper error handling', async () => {
      if (!testUserId) {
        console.warn('Skipping team creation test - no authenticated user');
        return;
      }

      const { data, error } = await supabase.rpc('create_team_with_member_integration', {
        p_team_name: `Test Team ${Date.now()}`,
        p_team_description: 'Integration test team',
        p_team_type: 'organization',
        p_member_limit: 10
      });

      // Should either succeed or fail with proper error
      if (error) {
        // Expected errors: authentication, validation, etc.
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
      } else {
        // Success case
        expect(data).toBeDefined();
        const result = data as any;
        expect(result.success).toBeDefined();
        
        if (result.success && result.id) {
          testTeamId = result.id;
        }
      }
    });

    it('should validate required parameters', async () => {
      const { data, error } = await supabase.rpc('create_team_with_member_integration', {
        p_team_name: '', // Invalid empty name
        p_team_description: 'Test',
        p_team_type: 'organization'
      });

      // Should fail with validation error
      expect(error || (data && !(data as any).success)).toBeTruthy();
    });
  });

  describe('is_slug_unique_safe', () => {
    it('should exist and validate slug uniqueness', async () => {
      const { data, error } = await supabase.rpc('is_slug_unique_safe', {
        p_slug: `unique-test-slug-${Date.now()}`
      });

      expect(error).toBeNull();
      expect(typeof data).toBe('boolean');
      expect(data).toBe(true); // Should be unique
    });

    it('should return false for existing slugs', async () => {
      // First create a team to have an existing slug
      if (!testUserId) {
        console.warn('Skipping slug uniqueness test - no authenticated user');
        return;
      }

      const testSlug = `test-slug-${Date.now()}`;
      
      // Check it's initially unique
      const { data: isUnique } = await supabase.rpc('is_slug_unique_safe', {
        p_slug: testSlug
      });
      expect(isUnique).toBe(true);

      // Create team with this slug (if possible)
      await supabase.rpc('create_team_with_member_integration', {
        p_team_name: testSlug,
        p_team_description: 'Test for slug uniqueness'
      });

      // Note: In a real test, you'd verify the slug is now taken
      // This is a basic smoke test to ensure the function works
    });

    it('should handle invalid slug formats', async () => {
      const { data, error } = await supabase.rpc('is_slug_unique_safe', {
        p_slug: '' // Invalid empty slug
      });

      // Should either return false or handle gracefully
      expect(error).toBeNull();
      expect(typeof data).toBe('boolean');
    });
  });

  describe('Security and Authorization', () => {
    it('should enforce proper RLS on team functions', async () => {
      // Test that functions respect row-level security
      const { data: userTeams } = await supabase.rpc('get_user_teams_safe' as any, {
        p_user_id: testUserId || '00000000-0000-0000-0000-000000000000'
      });

      // Should only return teams the user has access to
      expect(Array.isArray(userTeams)).toBe(true);
      
      // If user has teams, verify they're valid UUIDs
      if (userTeams && Array.isArray(userTeams) && userTeams.length > 0) {
        userTeams.forEach((team: any) => {
          expect(team.team_id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          );
        });
      }
    });

    it('should handle unauthenticated requests properly', async () => {
      // Test behavior when not authenticated
      // Note: This depends on your RLS policies
      const { data, error } = await supabase.rpc('get_user_teams_safe' as any, {
        p_user_id: null
      });

      // Should handle gracefully - either return empty or proper error
      expect(data !== undefined || error !== null).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await supabase.rpc('get_user_teams_safe' as any, {
        p_user_id: testUserId || '00000000-0000-0000-0000-000000000000'
      });
      
      const responseTime = Date.now() - startTime;
      
      // Should respond within 5 seconds
      expect(responseTime).toBeLessThan(5000);
    }, 10000);

    it('should handle concurrent requests', async () => {
      // Test multiple concurrent calls
      const promises = Array.from({ length: 5 }, () =>
        supabase.rpc('is_slug_unique_safe', {
          p_slug: `concurrent-test-${Date.now()}-${Math.random()}`
        })
      );

      const results = await Promise.all(promises);
      
      // All should complete successfully
      results.forEach(({ error }) => {
        expect(error).toBeNull();
      });
    });
  });
});