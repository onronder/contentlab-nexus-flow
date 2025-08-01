-- Create a default team for the current user if none exists
DO $$
DECLARE
    current_user_id UUID := '3350f8cb-b173-4181-a067-3b6515e092cb';
    team_exists BOOLEAN;
    new_team_id UUID;
    admin_role_id UUID;
BEGIN
    -- Check if user already has a team
    SELECT EXISTS(SELECT 1 FROM teams WHERE owner_id = current_user_id) INTO team_exists;
    
    IF NOT team_exists THEN
        -- Create a default team
        INSERT INTO teams (
            name,
            slug,
            description,
            owner_id,
            team_type,
            is_active,
            member_limit,
            current_member_count
        ) VALUES (
            'Default Team',
            'default-team-' || EXTRACT(EPOCH FROM NOW())::INTEGER,
            'Your default team workspace',
            current_user_id,
            'organization',
            true,
            50,
            1
        ) RETURNING id INTO new_team_id;
        
        -- Get admin role
        SELECT id INTO admin_role_id FROM user_roles WHERE slug = 'admin' AND is_system_role = true LIMIT 1;
        
        -- If no admin role exists, create one
        IF admin_role_id IS NULL THEN
            INSERT INTO user_roles (
                name,
                slug,
                description,
                role_type,
                is_system_role,
                is_active,
                hierarchy_level
            ) VALUES (
                'Administrator',
                'admin',
                'Full administrative access',
                'system',
                true,
                true,
                10
            ) RETURNING id INTO admin_role_id;
        END IF;
        
        -- Add user as team member with admin role
        INSERT INTO team_members (
            user_id,
            team_id,
            role_id,
            status,
            is_active,
            joined_at,
            last_activity_at
        ) VALUES (
            current_user_id,
            new_team_id,
            admin_role_id,
            'active',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created default team with ID: %', new_team_id;
    ELSE
        RAISE NOTICE 'User already has a team';
    END IF;
END $$;