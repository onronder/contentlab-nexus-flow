-- Enable realtime for activity logs and team data
ALTER publication supabase_realtime ADD TABLE teams;
ALTER publication supabase_realtime ADD TABLE team_members;
ALTER publication supabase_realtime ADD TABLE activity_logs;
ALTER publication supabase_realtime ADD TABLE project_activities;