-- Fix function search path for log_project_activity
CREATE OR REPLACE FUNCTION log_project_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO project_activities (project_id, user_id, activity_type, activity_description, entity_type, entity_id)
        VALUES (NEW.id, auth.uid(), 'project_created', 'Project created: ' || NEW.name, 'project', NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO project_activities (project_id, user_id, activity_type, activity_description, entity_type, entity_id)
        VALUES (NEW.id, auth.uid(), 'project_updated', 'Project updated: ' || NEW.name, 'project', NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO project_activities (project_id, user_id, activity_type, activity_description, entity_type, entity_id)
        VALUES (OLD.id, auth.uid(), 'project_deleted', 'Project deleted: ' || OLD.id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = '';