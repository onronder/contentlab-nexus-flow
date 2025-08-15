-- Fix the get_user_team_settings_safe function to avoid ambiguous column reference
CREATE OR REPLACE FUNCTION public.get_user_team_settings_safe(p_user_id uuid)
 RETURNS TABLE(team_id uuid, team_name text, team_description text, member_count integer, active_users integer, pending_invitations integer, user_role text, permissions jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.description as team_description,
    t.current_member_count as member_count,
    t.current_member_count as active_users,
    COALESCE(inv_count.count, 0)::INTEGER as pending_invitations,
    ur.name as user_role,
    jsonb_build_object(
      'allowMemberInvites', true,
      'allowMemberCreateProjects', true,
      'requireContentApproval', false
    ) as permissions
  FROM public.teams t
  JOIN public.team_members tm ON t.id = tm.team_id
  JOIN public.user_roles ur ON tm.role_id = ur.id
  LEFT JOIN (
    SELECT 
      ti.team_id, 
      COUNT(*) as count
    FROM public.team_invitations ti
    WHERE ti.status = 'pending' 
    GROUP BY ti.team_id
  ) inv_count ON t.id = inv_count.team_id
  WHERE tm.user_id = p_user_id 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND t.is_active = true
  ORDER BY tm.created_at DESC
  LIMIT 1;
END;
$function$