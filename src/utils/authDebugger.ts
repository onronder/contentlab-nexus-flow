import { supabase } from '@/integrations/supabase/client';

/**
 * Debug utilities for authentication issues
 */
export class AuthDebugger {
  static async checkAuthState() {
    console.group('🔍 Auth State Debug');
    
    try {
      // Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', user?.id, userError ? `Error: ${userError.message}` : '✅');
      
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', {
        userId: session?.user?.id,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        error: sessionError?.message
      });
      
      // Test database auth context with a simple query
      const { data: authTest, error: authTestError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      console.log('Database profile query (tests auth context):', authTest?.length || 0, 'profiles', authTestError ? `Error: ${authTestError.message}` : '✅');
      
      // Test simple query
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, created_by')
        .limit(1);
      console.log('Projects query:', projects?.length || 0, 'projects', projectsError ? `Error: ${projectsError.message}` : '✅');
      
    } catch (error) {
      console.error('Auth debug error:', error);
    }
    
    console.groupEnd();
  }
  
  static async testRLSPolicies() {
    console.group('🛡️ RLS Policy Test');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user for RLS test');
        return;
      }
      
      // Test projects RLS
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, created_by')
        .eq('created_by', user.id);
      
      console.log('Projects RLS test:', {
        userOwnedProjects: projects?.length || 0,
        error: projectsError?.message
      });
      
      // Test team members RLS
      const { data: teamMembers, error: teamError } = await supabase
        .from('project_team_members')
        .select('id, project_id, user_id')
        .eq('user_id', user.id);
      
      console.log('Team members RLS test:', {
        userMemberships: teamMembers?.length || 0,
        error: teamError?.message
      });
      
    } catch (error) {
      console.error('RLS test error:', error);
    }
    
    console.groupEnd();
  }
  
  static async testProjectCreation() {
    console.group('📝 Project Creation Test');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user for project creation test');
        return;
      }
      
      // Test minimal project creation
      const testProject = {
        name: `Debug Test Project ${Date.now()}`,
        description: 'Test project for debugging',
        industry: 'Technology',
        created_by: user.id
      };
      
      console.log('Attempting to create test project:', testProject);
      
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(testProject)
        .select()
        .single();
      
      if (projectError) {
        console.error('Project creation failed:', projectError);
      } else {
        console.log('✅ Project created successfully:', project.id);
        
        // Clean up test project
        await supabase.from('projects').delete().eq('id', project.id);
        console.log('🧹 Test project cleaned up');
      }
      
    } catch (error) {
      console.error('Project creation test error:', error);
    }
    
    console.groupEnd();
  }
  
  static logAllDebugInfo() {
    this.checkAuthState();
    setTimeout(() => this.testRLSPolicies(), 100);
    setTimeout(() => this.testProjectCreation(), 200);
  }
}

// Add to window for easy debugging
if (typeof window !== 'undefined') {
  (window as any).authDebugger = AuthDebugger;
}