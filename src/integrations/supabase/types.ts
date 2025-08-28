export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string | null
          description: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          project_id: string | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          target_user_id: string | null
          team_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          project_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          target_user_id?: string | null
          team_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          project_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          target_user_id?: string | null
          team_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_job_queue: {
        Row: {
          assigned_worker: string | null
          attempts: number
          completed_at: string | null
          correlation_id: string | null
          created_at: string
          error_data: Json | null
          expires_at: string | null
          id: string
          input_data: Json
          job_type: string
          max_attempts: number
          output_data: Json | null
          priority: number
          progress_message: string | null
          progress_percent: number | null
          scheduled_at: string
          source_ip: unknown | null
          started_at: string | null
          status: string
          team_id: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          assigned_worker?: string | null
          attempts?: number
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          error_data?: Json | null
          expires_at?: string | null
          id?: string
          input_data?: Json
          job_type: string
          max_attempts?: number
          output_data?: Json | null
          priority?: number
          progress_message?: string | null
          progress_percent?: number | null
          scheduled_at?: string
          source_ip?: unknown | null
          started_at?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_worker?: string | null
          attempts?: number
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          error_data?: Json | null
          expires_at?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          max_attempts?: number
          output_data?: Json | null
          priority?: number
          progress_message?: string | null
          progress_percent?: number | null
          scheduled_at?: string
          source_ip?: unknown | null
          started_at?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_suggestions: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          metadata: Json | null
          original_content: string | null
          session_id: string | null
          status: string | null
          suggested_content: string
          suggestion_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          original_content?: string | null
          session_id?: string | null
          status?: string | null
          suggested_content: string
          suggestion_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          original_content?: string | null
          session_id?: string | null
          status?: string | null
          suggested_content?: string
          suggestion_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_analytics: {
        Row: {
          confidence_score: number | null
          cost_estimate: number | null
          created_at: string
          endpoint: string
          error_type: string | null
          id: string
          model_used: string
          operation_type: string | null
          processing_time_ms: number | null
          request_date: string
          success: boolean
          team_id: string | null
          tokens_used: number
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          cost_estimate?: number | null
          created_at?: string
          endpoint: string
          error_type?: string | null
          id?: string
          model_used: string
          operation_type?: string | null
          processing_time_ms?: number | null
          request_date?: string
          success?: boolean
          team_id?: string | null
          tokens_used?: number
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          cost_estimate?: number | null
          created_at?: string
          endpoint?: string
          error_type?: string | null
          id?: string
          model_used?: string
          operation_type?: string | null
          processing_time_ms?: number | null
          request_date?: string
          success?: boolean
          team_id?: string | null
          tokens_used?: number
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_insights: {
        Row: {
          confidence_score: number | null
          created_at: string
          data_sources: string[] | null
          description: string
          dismissed_at: string | null
          dismissed_by: string | null
          expires_at: string | null
          id: string
          impact_level: string | null
          insight_category: string
          insight_data: Json | null
          insight_type: string
          is_actionable: boolean | null
          is_dismissed: boolean | null
          metrics_involved: Json | null
          project_id: string | null
          recommended_actions: Json | null
          team_id: string | null
          time_period_end: string | null
          time_period_start: string | null
          title: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          data_sources?: string[] | null
          description: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          expires_at?: string | null
          id?: string
          impact_level?: string | null
          insight_category: string
          insight_data?: Json | null
          insight_type: string
          is_actionable?: boolean | null
          is_dismissed?: boolean | null
          metrics_involved?: Json | null
          project_id?: string | null
          recommended_actions?: Json | null
          team_id?: string | null
          time_period_end?: string | null
          time_period_start?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          data_sources?: string[] | null
          description?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          expires_at?: string | null
          id?: string
          impact_level?: string | null
          insight_category?: string
          insight_data?: Json | null
          insight_type?: string
          is_actionable?: boolean | null
          is_dismissed?: boolean | null
          metrics_involved?: Json | null
          project_id?: string | null
          recommended_actions?: Json | null
          team_id?: string | null
          time_period_end?: string | null
          time_period_start?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_predictions: {
        Row: {
          accuracy_score: number | null
          confidence_level: number | null
          created_at: string
          id: string
          input_data: Json
          model_version: string | null
          prediction_data: Json
          prediction_type: string
          status: string | null
          team_id: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accuracy_score?: number | null
          confidence_level?: number | null
          created_at?: string
          id?: string
          input_data?: Json
          model_version?: string | null
          prediction_data?: Json
          prediction_type: string
          status?: string | null
          team_id?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accuracy_score?: number | null
          confidence_level?: number | null
          created_at?: string
          id?: string
          input_data?: Json
          model_version?: string | null
          prediction_data?: Json
          prediction_type?: string
          status?: string | null
          team_id?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_predictions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_settings: {
        Row: {
          alert_settings: Json | null
          automation_preferences: Json | null
          chart_settings: Json | null
          created_at: string | null
          cross_module_analytics: Json | null
          dashboard_settings: Json | null
          data_settings: Json | null
          id: string
          privacy_settings: Json | null
          report_settings: Json | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_settings?: Json | null
          automation_preferences?: Json | null
          chart_settings?: Json | null
          created_at?: string | null
          cross_module_analytics?: Json | null
          dashboard_settings?: Json | null
          data_settings?: Json | null
          id?: string
          privacy_settings?: Json | null
          report_settings?: Json | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_settings?: Json | null
          automation_preferences?: Json | null
          chart_settings?: Json | null
          created_at?: string | null
          cross_module_analytics?: Json | null
          dashboard_settings?: Json | null
          data_settings?: Json | null
          id?: string
          privacy_settings?: Json | null
          report_settings?: Json | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_streams: {
        Row: {
          aggregation_rules: Json | null
          created_at: string
          data_source: string
          error_log: Json | null
          id: string
          last_processed_at: string | null
          processing_status: string | null
          real_time_data: Json | null
          stream_name: string
          updated_at: string
        }
        Insert: {
          aggregation_rules?: Json | null
          created_at?: string
          data_source: string
          error_log?: Json | null
          id?: string
          last_processed_at?: string | null
          processing_status?: string | null
          real_time_data?: Json | null
          stream_name: string
          updated_at?: string
        }
        Update: {
          aggregation_rules?: Json | null
          created_at?: string
          data_source?: string
          error_log?: Json | null
          id?: string
          last_processed_at?: string | null
          processing_status?: string | null
          real_time_data?: Json | null
          stream_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json | null
          rate_limit: number | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json | null
          rate_limit?: number | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json | null
          rate_limit?: number | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_description: string
          action_type: string
          after_state: Json | null
          before_state: Json | null
          correlation_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          project_id: string | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          team_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          after_state?: Json | null
          before_state?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          project_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          team_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          after_state?: Json | null
          before_state?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          project_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          team_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      batch_upload_sessions: {
        Row: {
          batch_metadata: Json | null
          completed_at: string | null
          created_at: string | null
          error_summary: string | null
          failed_files: number | null
          folder_structure: Json | null
          id: string
          processed_files: number | null
          project_id: string
          session_name: string | null
          started_at: string | null
          status: string | null
          total_files: number
          upload_settings: Json | null
          user_id: string
        }
        Insert: {
          batch_metadata?: Json | null
          completed_at?: string | null
          created_at?: string | null
          error_summary?: string | null
          failed_files?: number | null
          folder_structure?: Json | null
          id?: string
          processed_files?: number | null
          project_id: string
          session_name?: string | null
          started_at?: string | null
          status?: string | null
          total_files: number
          upload_settings?: Json | null
          user_id: string
        }
        Update: {
          batch_metadata?: Json | null
          completed_at?: string | null
          created_at?: string | null
          error_summary?: string | null
          failed_files?: number | null
          folder_structure?: Json | null
          id?: string
          processed_files?: number | null
          project_id?: string
          session_name?: string | null
          started_at?: string | null
          status?: string | null
          total_files?: number
          upload_settings?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      behavioral_analytics: {
        Row: {
          anomaly_detected: boolean | null
          baseline_deviation: number | null
          behavior_data: Json
          behavior_type: string
          created_at: string | null
          id: string
          processed_at: string | null
          risk_score: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          anomaly_detected?: boolean | null
          baseline_deviation?: number | null
          behavior_data?: Json
          behavior_type: string
          created_at?: string | null
          id?: string
          processed_at?: string | null
          risk_score?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          anomaly_detected?: boolean | null
          baseline_deviation?: number | null
          behavior_data?: Json
          behavior_type?: string
          created_at?: string | null
          id?: string
          processed_at?: string | null
          risk_score?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_metrics: {
        Row: {
          calculated_fields: Json | null
          change_percentage: number | null
          confidence_interval: Json | null
          created_at: string
          currency: string | null
          data_quality_score: number | null
          id: string
          is_forecast: boolean | null
          metric_category: string
          metric_date: string
          metric_name: string
          metric_value: number
          previous_period_value: number | null
          project_id: string | null
          segment_filters: Json | null
          target_value: number | null
          team_id: string | null
          time_period: string
          updated_at: string
        }
        Insert: {
          calculated_fields?: Json | null
          change_percentage?: number | null
          confidence_interval?: Json | null
          created_at?: string
          currency?: string | null
          data_quality_score?: number | null
          id?: string
          is_forecast?: boolean | null
          metric_category: string
          metric_date: string
          metric_name: string
          metric_value: number
          previous_period_value?: number | null
          project_id?: string | null
          segment_filters?: Json | null
          target_value?: number | null
          team_id?: string | null
          time_period: string
          updated_at?: string
        }
        Update: {
          calculated_fields?: Json | null
          change_percentage?: number | null
          confidence_interval?: Json | null
          created_at?: string
          currency?: string | null
          data_quality_score?: number | null
          id?: string
          is_forecast?: boolean | null
          metric_category?: string
          metric_date?: string
          metric_name?: string
          metric_value?: number
          previous_period_value?: number | null
          project_id?: string | null
          segment_filters?: Json | null
          target_value?: number | null
          team_id?: string | null
          time_period?: string
          updated_at?: string
        }
        Relationships: []
      }
      cache_statistics: {
        Row: {
          average_response_time_ms: number | null
          cache_name: string
          cache_size_bytes: number | null
          cache_type: string
          created_at: string | null
          eviction_count: number | null
          hit_count: number | null
          hit_ratio: number | null
          id: string
          key_count: number | null
          max_size_bytes: number | null
          memory_usage_bytes: number | null
          metadata: Json | null
          miss_count: number | null
          oldest_entry_age_seconds: number | null
          statistics_period_end: string | null
          statistics_period_start: string | null
          total_requests: number | null
        }
        Insert: {
          average_response_time_ms?: number | null
          cache_name: string
          cache_size_bytes?: number | null
          cache_type: string
          created_at?: string | null
          eviction_count?: number | null
          hit_count?: number | null
          hit_ratio?: number | null
          id?: string
          key_count?: number | null
          max_size_bytes?: number | null
          memory_usage_bytes?: number | null
          metadata?: Json | null
          miss_count?: number | null
          oldest_entry_age_seconds?: number | null
          statistics_period_end?: string | null
          statistics_period_start?: string | null
          total_requests?: number | null
        }
        Update: {
          average_response_time_ms?: number | null
          cache_name?: string
          cache_size_bytes?: number | null
          cache_type?: string
          created_at?: string | null
          eviction_count?: number | null
          hit_count?: number | null
          hit_ratio?: number | null
          id?: string
          key_count?: number | null
          max_size_bytes?: number | null
          memory_usage_bytes?: number | null
          metadata?: Json | null
          miss_count?: number | null
          oldest_entry_age_seconds?: number | null
          statistics_period_end?: string | null
          statistics_period_start?: string | null
          total_requests?: number | null
        }
        Relationships: []
      }
      collaboration_operations: {
        Row: {
          acknowledged_by: Json | null
          applied_at: string | null
          id: string
          operation_data: Json
          operation_type: string
          sequence_number: number
          session_id: string
          user_id: string
        }
        Insert: {
          acknowledged_by?: Json | null
          applied_at?: string | null
          id?: string
          operation_data: Json
          operation_type: string
          sequence_number: number
          session_id: string
          user_id: string
        }
        Update: {
          acknowledged_by?: Json | null
          applied_at?: string | null
          id?: string
          operation_data?: Json
          operation_type?: string
          sequence_number?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_operations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_sessions: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          participants: Json | null
          resource_id: string
          resource_type: string
          session_data: Json | null
          session_name: string | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          participants?: Json | null
          resource_id: string
          resource_type: string
          session_data?: Json | null
          session_name?: string | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          participants?: Json | null
          resource_id?: string
          resource_type?: string
          session_data?: Json | null
          session_name?: string | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          attachments: Json | null
          author_id: string
          content: string
          content_format: Database["public"]["Enums"]["content_format"] | null
          created_at: string | null
          id: string
          is_internal: boolean | null
          is_resolved: boolean | null
          mentions: Json | null
          metadata: Json | null
          parent_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          resource_id: string
          resource_type: Database["public"]["Enums"]["comment_resource_type"]
          team_id: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          content: string
          content_format?: Database["public"]["Enums"]["content_format"] | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          is_resolved?: boolean | null
          mentions?: Json | null
          metadata?: Json | null
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id: string
          resource_type: Database["public"]["Enums"]["comment_resource_type"]
          team_id: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          content?: string
          content_format?: Database["public"]["Enums"]["content_format"] | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          is_resolved?: boolean | null
          mentions?: Json | null
          metadata?: Json | null
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id?: string
          resource_type?: Database["public"]["Enums"]["comment_resource_type"]
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      competitive_settings: {
        Row: {
          alerting_settings: Json | null
          analysis_automation: Json | null
          analysis_settings: Json | null
          created_at: string | null
          data_retention: Json | null
          id: string
          integration_settings: Json | null
          monitoring_settings: Json | null
          reporting_settings: Json | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alerting_settings?: Json | null
          analysis_automation?: Json | null
          analysis_settings?: Json | null
          created_at?: string | null
          data_retention?: Json | null
          id?: string
          integration_settings?: Json | null
          monitoring_settings?: Json | null
          reporting_settings?: Json | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alerting_settings?: Json | null
          analysis_automation?: Json | null
          analysis_settings?: Json | null
          created_at?: string | null
          data_retention?: Json | null
          id?: string
          integration_settings?: Json | null
          monitoring_settings?: Json | null
          reporting_settings?: Json | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      competitor_analysis_metadata: {
        Row: {
          analysis_type: string
          competitor_id: string
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          id: string
          parameters: Json | null
          results_summary: Json | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          analysis_type: string
          competitor_id: string
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          parameters?: Json | null
          results_summary?: Json | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_type?: string
          competitor_id?: string
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          parameters?: Json | null
          results_summary?: Json | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analysis_metadata_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "project_competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_serp_data: {
        Row: {
          competition_level: string | null
          competitor_id: string
          cost_per_click: number | null
          created_at: string
          description: string | null
          device: string | null
          id: string
          keyword: string
          location: string | null
          position: number | null
          search_engine: string
          search_volume: number | null
          serp_features: Json | null
          title: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          competition_level?: string | null
          competitor_id: string
          cost_per_click?: number | null
          created_at?: string
          description?: string | null
          device?: string | null
          id?: string
          keyword: string
          location?: string | null
          position?: number | null
          search_engine?: string
          search_volume?: number | null
          serp_features?: Json | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          competition_level?: string | null
          competitor_id?: string
          cost_per_click?: number | null
          created_at?: string
          description?: string | null
          device?: string | null
          id?: string
          keyword?: string
          location?: string | null
          position?: number | null
          search_engine?: string
          search_volume?: number | null
          serp_features?: Json | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      competitor_website_snapshots: {
        Row: {
          change_summary: string | null
          change_type: string | null
          competitor_id: string
          content_hash: string
          content_sections: Json | null
          created_at: string
          description: string | null
          id: string
          pricing_data: Json | null
          screenshot_url: string | null
          technical_data: Json | null
          title: string | null
          url: string
        }
        Insert: {
          change_summary?: string | null
          change_type?: string | null
          competitor_id: string
          content_hash: string
          content_sections?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          pricing_data?: Json | null
          screenshot_url?: string | null
          technical_data?: Json | null
          title?: string | null
          url: string
        }
        Update: {
          change_summary?: string | null
          change_type?: string | null
          competitor_id?: string
          content_hash?: string
          content_sections?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          pricing_data?: Json | null
          screenshot_url?: string | null
          technical_data?: Json | null
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      content_activity_log: {
        Row: {
          action: string
          content_id: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          content_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          content_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_activity_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_analytics: {
        Row: {
          analytics_date: string | null
          click_through_rate: number | null
          comments: number | null
          content_id: string
          conversion_rate: number | null
          created_at: string | null
          downloads: number | null
          engagement_rate: number | null
          id: string
          impressions: number | null
          likes: number | null
          performance_score: number | null
          reach: number | null
          shares: number | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          analytics_date?: string | null
          click_through_rate?: number | null
          comments?: number | null
          content_id: string
          conversion_rate?: number | null
          created_at?: string | null
          downloads?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          performance_score?: number | null
          reach?: number | null
          shares?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          analytics_date?: string | null
          click_through_rate?: number | null
          comments?: number | null
          content_id?: string
          conversion_rate?: number | null
          created_at?: string | null
          downloads?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          performance_score?: number | null
          reach?: number | null
          shares?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_analytics_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      content_collaborators: {
        Row: {
          accepted_at: string | null
          content_id: string
          id: string
          invited_at: string | null
          invited_by: string
          permissions: Json | null
          role: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          content_id: string
          id?: string
          invited_at?: string | null
          invited_by: string
          permissions?: Json | null
          role?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          content_id?: string
          id?: string
          invited_at?: string | null
          invited_by?: string
          permissions?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_collaborators_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          access_count: number | null
          ai_tags: string[] | null
          category_id: string | null
          content_hash: string | null
          content_quality_score: number | null
          content_type: string
          created_at: string | null
          description: string | null
          duplicate_of: string | null
          file_path: string | null
          file_size: number | null
          folder_id: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          mime_type: string | null
          optimization_level: string | null
          processing_status: string | null
          project_id: string
          published_at: string | null
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_publish_at: string | null
          search_vector: unknown | null
          status: string
          storage_tier: string | null
          team_id: string | null
          thumbnail_path: string | null
          title: string
          updated_at: string | null
          user_id: string
          workflow_status: string | null
        }
        Insert: {
          access_count?: number | null
          ai_tags?: string[] | null
          category_id?: string | null
          content_hash?: string | null
          content_quality_score?: number | null
          content_type: string
          created_at?: string | null
          description?: string | null
          duplicate_of?: string | null
          file_path?: string | null
          file_size?: number | null
          folder_id?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          mime_type?: string | null
          optimization_level?: string | null
          processing_status?: string | null
          project_id: string
          published_at?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_publish_at?: string | null
          search_vector?: unknown | null
          status?: string
          storage_tier?: string | null
          team_id?: string | null
          thumbnail_path?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          workflow_status?: string | null
        }
        Update: {
          access_count?: number | null
          ai_tags?: string[] | null
          category_id?: string | null
          content_hash?: string | null
          content_quality_score?: number | null
          content_type?: string
          created_at?: string | null
          description?: string | null
          duplicate_of?: string | null
          file_path?: string | null
          file_size?: number | null
          folder_id?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          mime_type?: string | null
          optimization_level?: string | null
          processing_status?: string | null
          project_id?: string
          published_at?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_publish_at?: string | null
          search_vector?: unknown | null
          status?: string
          storage_tier?: string | null
          team_id?: string | null
          thumbnail_path?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_lifecycle_policies: {
        Row: {
          auto_apply: boolean | null
          created_at: string | null
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          policy_rules: Json
          project_id: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_apply?: boolean | null
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          policy_rules: Json
          project_id?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_apply?: boolean | null
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          policy_rules?: Json
          project_id?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      content_search_index: {
        Row: {
          ai_keywords: string[] | null
          combined_vector: unknown | null
          content_id: string
          content_quality_score: number | null
          content_vector: unknown | null
          description_vector: unknown | null
          id: string
          index_version: number | null
          language: string | null
          last_indexed_at: string | null
          tag_vector: unknown | null
          title_vector: unknown | null
          visual_features: Json | null
        }
        Insert: {
          ai_keywords?: string[] | null
          combined_vector?: unknown | null
          content_id: string
          content_quality_score?: number | null
          content_vector?: unknown | null
          description_vector?: unknown | null
          id?: string
          index_version?: number | null
          language?: string | null
          last_indexed_at?: string | null
          tag_vector?: unknown | null
          title_vector?: unknown | null
          visual_features?: Json | null
        }
        Update: {
          ai_keywords?: string[] | null
          combined_vector?: unknown | null
          content_id?: string
          content_quality_score?: number | null
          content_vector?: unknown | null
          description_vector?: unknown | null
          id?: string
          index_version?: number | null
          language?: string | null
          last_indexed_at?: string | null
          tag_vector?: unknown | null
          title_vector?: unknown | null
          visual_features?: Json | null
        }
        Relationships: []
      }
      content_settings: {
        Row: {
          created_at: string | null
          id: string
          library_integration: Json | null
          management_settings: Json | null
          organization_settings: Json | null
          search_settings: Json | null
          team_id: string | null
          updated_at: string | null
          upload_settings: Json | null
          user_id: string
          workflow_automation: Json | null
          workflow_settings: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          library_integration?: Json | null
          management_settings?: Json | null
          organization_settings?: Json | null
          search_settings?: Json | null
          team_id?: string | null
          updated_at?: string | null
          upload_settings?: Json | null
          user_id: string
          workflow_automation?: Json | null
          workflow_settings?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          library_integration?: Json | null
          management_settings?: Json | null
          organization_settings?: Json | null
          search_settings?: Json | null
          team_id?: string | null
          updated_at?: string | null
          upload_settings?: Json | null
          user_id?: string
          workflow_automation?: Json | null
          workflow_settings?: Json | null
        }
        Relationships: []
      }
      content_tags: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          tag: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          tag: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_tags_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_versions: {
        Row: {
          changes_summary: string | null
          content_id: string
          created_at: string | null
          created_by: string
          description: string | null
          file_path: string | null
          file_size: number | null
          id: string
          title: string
          version_number: number
        }
        Insert: {
          changes_summary?: string | null
          content_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          title: string
          version_number: number
        }
        Update: {
          changes_summary?: string | null
          content_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_dashboards: {
        Row: {
          created_at: string
          dashboard_config: Json
          description: string | null
          filters: Json | null
          id: string
          is_template: boolean | null
          name: string
          sharing_settings: Json | null
          team_id: string | null
          template_category: string | null
          updated_at: string
          user_id: string | null
          view_count: number | null
          widgets: Json | null
        }
        Insert: {
          created_at?: string
          dashboard_config?: Json
          description?: string | null
          filters?: Json | null
          id?: string
          is_template?: boolean | null
          name: string
          sharing_settings?: Json | null
          team_id?: string | null
          template_category?: string | null
          updated_at?: string
          user_id?: string | null
          view_count?: number | null
          widgets?: Json | null
        }
        Update: {
          created_at?: string
          dashboard_config?: Json
          description?: string | null
          filters?: Json | null
          id?: string
          is_template?: boolean | null
          name?: string
          sharing_settings?: Json | null
          team_id?: string | null
          template_category?: string | null
          updated_at?: string
          user_id?: string | null
          view_count?: number | null
          widgets?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_dashboards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_events: {
        Row: {
          correlation_id: string | null
          entity_id: string | null
          entity_type: string | null
          event_category: string | null
          event_name: string
          event_properties: Json | null
          event_value: number | null
          id: string
          metadata: Json | null
          processed: boolean | null
          processing_error: string | null
          project_id: string | null
          session_id: string | null
          source_component: string | null
          team_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          correlation_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_category?: string | null
          event_name: string
          event_properties?: Json | null
          event_value?: number | null
          id?: string
          metadata?: Json | null
          processed?: boolean | null
          processing_error?: string | null
          project_id?: string | null
          session_id?: string | null
          source_component?: string | null
          team_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          correlation_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_category?: string | null
          event_name?: string
          event_properties?: Json | null
          event_value?: number | null
          id?: string
          metadata?: Json | null
          processed?: boolean | null
          processing_error?: string | null
          project_id?: string | null
          session_id?: string | null
          source_component?: string | null
          team_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      encrypted_user_data: {
        Row: {
          created_at: string
          data_type: string
          encrypted_value: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_type: string
          encrypted_value: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_type?: string
          encrypted_value?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enhanced_monitoring: {
        Row: {
          configuration: Json
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          monitoring_type: string
          started_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          configuration?: Json
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          monitoring_type: string
          started_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          configuration?: Json
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          monitoring_type?: string
          started_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      enhanced_notifications: {
        Row: {
          action_url: string | null
          category: string
          channel_id: string | null
          created_at: string
          delivery_channels: Json | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          priority: string
          read_at: string | null
          recipient_id: string
          scheduled_for: string | null
          sender_id: string | null
          team_id: string | null
          title: string
        }
        Insert: {
          action_url?: string | null
          category?: string
          channel_id?: string | null
          created_at?: string
          delivery_channels?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          priority?: string
          read_at?: string | null
          recipient_id: string
          scheduled_for?: string | null
          sender_id?: string | null
          team_id?: string | null
          title: string
        }
        Update: {
          action_url?: string | null
          category?: string
          channel_id?: string | null
          created_at?: string
          delivery_channels?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          priority?: string
          read_at?: string | null
          recipient_id?: string
          scheduled_for?: string | null
          sender_id?: string | null
          team_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_notifications_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "team_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          context: Json | null
          correlation_id: string | null
          created_at: string | null
          error_message: string
          error_stack: string | null
          error_type: string
          fingerprint: string | null
          first_seen_at: string | null
          id: string
          ip_address: unknown | null
          last_seen_at: string | null
          metadata: Json | null
          occurrence_count: number | null
          project_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          severity: string
          tags: string[] | null
          team_id: string | null
          updated_at: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          error_type: string
          fingerprint?: string | null
          first_seen_at?: string | null
          id?: string
          ip_address?: unknown | null
          last_seen_at?: string | null
          metadata?: Json | null
          occurrence_count?: number | null
          project_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: string
          tags?: string[] | null
          team_id?: string | null
          updated_at?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          fingerprint?: string | null
          first_seen_at?: string | null
          id?: string
          ip_address?: unknown | null
          last_seen_at?: string | null
          metadata?: Json | null
          occurrence_count?: number | null
          project_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: string
          tags?: string[] | null
          team_id?: string | null
          updated_at?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      external_data_logs: {
        Row: {
          api_endpoint: string
          api_provider: string
          competitor_id: string | null
          cost_credits: number | null
          created_at: string
          error_message: string | null
          id: string
          processing_time_ms: number | null
          project_id: string | null
          request_data: Json | null
          request_type: string
          response_data: Json | null
          response_status: number | null
        }
        Insert: {
          api_endpoint: string
          api_provider: string
          competitor_id?: string | null
          cost_credits?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          project_id?: string | null
          request_data?: Json | null
          request_type: string
          response_data?: Json | null
          response_status?: number | null
        }
        Update: {
          api_endpoint?: string
          api_provider?: string
          competitor_id?: string | null
          cost_credits?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          project_id?: string | null
          request_data?: Json | null
          request_type?: string
          response_data?: Json | null
          response_status?: number | null
        }
        Relationships: []
      }
      file_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          message_id: string
          mime_type: string | null
          team_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          message_id: string
          mime_type?: string | null
          team_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          message_id?: string
          mime_type?: string | null
          team_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "team_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_attachments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      file_deduplication: {
        Row: {
          content_hash: string
          created_at: string | null
          deduplication_status: string | null
          duplicate_content_ids: string[] | null
          file_size: number
          id: string
          mime_type: string
          original_content_id: string
          similarity_score: number | null
          space_saved: number | null
          updated_at: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string | null
          deduplication_status?: string | null
          duplicate_content_ids?: string[] | null
          file_size: number
          id?: string
          mime_type: string
          original_content_id: string
          similarity_score?: number | null
          space_saved?: number | null
          updated_at?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string | null
          deduplication_status?: string | null
          duplicate_content_ids?: string[] | null
          file_size?: number
          id?: string
          mime_type?: string
          original_content_id?: string
          similarity_score?: number | null
          space_saved?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      file_folders: {
        Row: {
          created_at: string | null
          description: string | null
          folder_path: string
          id: string
          is_system: boolean | null
          metadata: Json | null
          name: string
          parent_id: string | null
          project_id: string
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          folder_path: string
          id?: string
          is_system?: boolean | null
          metadata?: Json | null
          name: string
          parent_id?: string | null
          project_id: string
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          folder_path?: string
          id?: string
          is_system?: boolean | null
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          project_id?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      file_processing_jobs: {
        Row: {
          completed_at: string | null
          content_id: string
          created_at: string | null
          error_message: string | null
          id: string
          input_data: Json | null
          job_type: string
          max_retries: number | null
          output_data: Json | null
          priority: number | null
          processing_time_ms: number | null
          retry_count: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          content_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          job_type: string
          max_retries?: number | null
          output_data?: Json | null
          priority?: number | null
          processing_time_ms?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          content_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          job_type?: string
          max_retries?: number | null
          output_data?: Json | null
          priority?: number | null
          processing_time_ms?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      file_storage_analytics: {
        Row: {
          analytics_date: string | null
          created_at: string | null
          id: string
          most_accessed_files: Json | null
          project_id: string | null
          storage_by_type: Json | null
          storage_optimization_savings: number | null
          team_id: string | null
          total_files: number | null
          total_storage_bytes: number | null
          upload_activity: Json | null
          user_id: string | null
        }
        Insert: {
          analytics_date?: string | null
          created_at?: string | null
          id?: string
          most_accessed_files?: Json | null
          project_id?: string | null
          storage_by_type?: Json | null
          storage_optimization_savings?: number | null
          team_id?: string | null
          total_files?: number | null
          total_storage_bytes?: number | null
          upload_activity?: Json | null
          user_id?: string | null
        }
        Update: {
          analytics_date?: string | null
          created_at?: string | null
          id?: string
          most_accessed_files?: Json | null
          project_id?: string | null
          storage_by_type?: Json | null
          storage_optimization_savings?: number | null
          team_id?: string | null
          total_files?: number | null
          total_storage_bytes?: number | null
          upload_activity?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      file_versions: {
        Row: {
          change_summary: string | null
          content_hash: string
          content_id: string
          created_at: string | null
          created_by: string
          file_path: string
          file_size: number
          id: string
          is_current: boolean | null
          version_label: string | null
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content_hash: string
          content_id: string
          created_at?: string | null
          created_by: string
          file_path: string
          file_size: number
          id?: string
          is_current?: boolean | null
          version_label?: string | null
          version_number: number
        }
        Update: {
          change_summary?: string | null
          content_hash?: string
          content_id?: string
          created_at?: string | null
          created_by?: string
          file_path?: string
          file_size?: number
          id?: string
          is_current?: boolean | null
          version_label?: string | null
          version_number?: number
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          created_at: string
          created_by: string
          download_count: number
          error: string | null
          file_format: string | null
          file_url: string | null
          generated_at: string
          id: string
          scheduled_report_id: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          download_count?: number
          error?: string | null
          file_format?: string | null
          file_url?: string | null
          generated_at?: string
          id?: string
          scheduled_report_id?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          download_count?: number
          error?: string | null
          file_format?: string | null
          file_url?: string | null
          generated_at?: string
          id?: string
          scheduled_report_id?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_scheduled_report_id_fkey"
            columns: ["scheduled_report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_blocklist: {
        Row: {
          block_type: string
          blocked_at: string | null
          blocked_by: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          metadata: Json | null
          reason: string
          unblock_at: string | null
          unblocked_at: string | null
          unblocked_by: string | null
          updated_at: string | null
        }
        Insert: {
          block_type: string
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          id?: string
          ip_address: unknown
          is_active?: boolean | null
          metadata?: Json | null
          reason: string
          unblock_at?: string | null
          unblocked_at?: string | null
          unblocked_by?: string | null
          updated_at?: string | null
        }
        Update: {
          block_type?: string
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          metadata?: Json | null
          reason?: string
          unblock_at?: string | null
          unblocked_at?: string | null
          unblocked_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      log_entries: {
        Row: {
          component: string | null
          context: Json | null
          correlation_id: string | null
          created_at: string | null
          function_name: string | null
          id: string
          ip_address: unknown | null
          level: string
          line_number: number | null
          message: string
          metadata: Json | null
          module: string | null
          project_id: string | null
          request_id: string | null
          session_id: string | null
          tags: string[] | null
          team_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component?: string | null
          context?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          function_name?: string | null
          id?: string
          ip_address?: unknown | null
          level: string
          line_number?: number | null
          message: string
          metadata?: Json | null
          module?: string | null
          project_id?: string | null
          request_id?: string | null
          session_id?: string | null
          tags?: string[] | null
          team_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string | null
          context?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          function_name?: string | null
          id?: string
          ip_address?: unknown | null
          level?: string
          line_number?: number | null
          message?: string
          metadata?: Json | null
          module?: string | null
          project_id?: string | null
          request_id?: string | null
          session_id?: string | null
          tags?: string[] | null
          team_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "team_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          device_type: string
          gestures_used: Json | null
          id: string
          offline_actions: Json | null
          performance_metrics: Json | null
          session_duration: number | null
          sync_status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          device_type: string
          gestures_used?: Json | null
          id?: string
          offline_actions?: Json | null
          performance_metrics?: Json | null
          session_duration?: number | null
          sync_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          device_type?: string
          gestures_used?: Json | null
          id?: string
          offline_actions?: Json | null
          performance_metrics?: Json | null
          session_duration?: number | null
          sync_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      monitoring_alert_rules: {
        Row: {
          actions: Json
          conditions: Json
          cooldown_minutes: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          metadata: Json | null
          project_id: string | null
          rule_name: string
          rule_type: string
          severity: string
          team_id: string | null
          trigger_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actions: Json
          conditions: Json
          cooldown_minutes?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          metadata?: Json | null
          project_id?: string | null
          rule_name: string
          rule_type: string
          severity?: string
          team_id?: string | null
          trigger_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actions?: Json
          conditions?: Json
          cooldown_minutes?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          metadata?: Json | null
          project_id?: string | null
          rule_name?: string
          rule_type?: string
          severity?: string
          team_id?: string | null
          trigger_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      monitoring_alerts: {
        Row: {
          alert_data: Json | null
          alert_type: string
          competitor_id: string | null
          created_at: string
          description: string
          dismissed_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          project_id: string
          read_at: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          alert_data?: Json | null
          alert_type: string
          competitor_id?: string | null
          created_at?: string
          description: string
          dismissed_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          project_id: string
          read_at?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          alert_data?: Json | null
          alert_type?: string
          competitor_id?: string | null
          created_at?: string
          description?: string
          dismissed_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          project_id?: string
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          delivery_method: Json | null
          email_sent: boolean | null
          email_sent_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          priority: Database["public"]["Enums"]["notification_priority"] | null
          read_at: string | null
          recipient_id: string
          resource_id: string | null
          resource_type: string | null
          sender_id: string | null
          team_id: string | null
          title: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          delivery_method?: Json | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          read_at?: string | null
          recipient_id: string
          resource_id?: string | null
          resource_type?: string | null
          sender_id?: string | null
          team_id?: string | null
          title: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          delivery_method?: Json | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          read_at?: string | null
          recipient_id?: string
          resource_id?: string | null
          resource_type?: string | null
          sender_id?: string | null
          team_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          context: Json | null
          correlation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_unit: string | null
          metric_value: number
          project_id: string | null
          session_id: string | null
          tags: Json | null
          team_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_unit?: string | null
          metric_value: number
          project_id?: string | null
          session_id?: string | null
          tags?: Json | null
          team_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_unit?: string | null
          metric_value?: number
          project_id?: string | null
          session_id?: string | null
          tags?: Json | null
          team_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          is_system_permission: boolean
          module: string
          name: string
          resource: string | null
          slug: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          is_system_permission?: boolean
          module: string
          name: string
          resource?: string | null
          slug: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system_permission?: boolean
          module?: string
          name?: string
          resource?: string | null
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          last_team_id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_team_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_team_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_last_team_id_fkey"
            columns: ["last_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activities: {
        Row: {
          activity_description: string
          activity_type: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          project_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          activity_description: string
          activity_type: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          project_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          activity_description?: string
          activity_type?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          project_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_analytics: {
        Row: {
          calculation_method: string | null
          created_at: string | null
          data_source: string | null
          id: string
          measurement_date: string | null
          metadata: Json | null
          metric_name: string
          metric_unit: string | null
          metric_value: number | null
          project_id: string
        }
        Insert: {
          calculation_method?: string | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          measurement_date?: string | null
          metadata?: Json | null
          metric_name: string
          metric_unit?: string | null
          metric_value?: number | null
          project_id: string
        }
        Update: {
          calculation_method?: string | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          measurement_date?: string | null
          metadata?: Json | null
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_analytics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_competitors: {
        Row: {
          added_by: string
          analysis_count: number | null
          analysis_frequency: string | null
          company_name: string
          company_size: string | null
          competitive_tier: string
          created_at: string | null
          custom_attributes: Json | null
          data_quality_score: number | null
          description: string | null
          domain: string
          employee_count: string | null
          founded_year: number | null
          funding_status: string | null
          headquarters: string | null
          id: string
          industry: string | null
          last_analysis_date: string | null
          last_analyzed: string | null
          logo_url: string | null
          market_share_estimate: number | null
          market_size: string | null
          monitoring_enabled: boolean | null
          project_id: string
          revenue_range: string | null
          status: string | null
          tags: string[] | null
          threat_level: string
          updated_at: string | null
          value_proposition: string | null
        }
        Insert: {
          added_by: string
          analysis_count?: number | null
          analysis_frequency?: string | null
          company_name: string
          company_size?: string | null
          competitive_tier?: string
          created_at?: string | null
          custom_attributes?: Json | null
          data_quality_score?: number | null
          description?: string | null
          domain: string
          employee_count?: string | null
          founded_year?: number | null
          funding_status?: string | null
          headquarters?: string | null
          id?: string
          industry?: string | null
          last_analysis_date?: string | null
          last_analyzed?: string | null
          logo_url?: string | null
          market_share_estimate?: number | null
          market_size?: string | null
          monitoring_enabled?: boolean | null
          project_id: string
          revenue_range?: string | null
          status?: string | null
          tags?: string[] | null
          threat_level?: string
          updated_at?: string | null
          value_proposition?: string | null
        }
        Update: {
          added_by?: string
          analysis_count?: number | null
          analysis_frequency?: string | null
          company_name?: string
          company_size?: string | null
          competitive_tier?: string
          created_at?: string | null
          custom_attributes?: Json | null
          data_quality_score?: number | null
          description?: string | null
          domain?: string
          employee_count?: string | null
          founded_year?: number | null
          funding_status?: string | null
          headquarters?: string | null
          id?: string
          industry?: string | null
          last_analysis_date?: string | null
          last_analyzed?: string | null
          logo_url?: string | null
          market_share_estimate?: number | null
          market_size?: string | null
          monitoring_enabled?: boolean | null
          project_id?: string
          revenue_range?: string | null
          status?: string | null
          tags?: string[] | null
          threat_level?: string
          updated_at?: string | null
          value_proposition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_competitors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members_extended: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_access_at: string | null
          permissions: Json | null
          project_id: string
          project_role: Database["public"]["Enums"]["project_role"]
          team_member_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_access_at?: string | null
          permissions?: Json | null
          project_id: string
          project_role?: Database["public"]["Enums"]["project_role"]
          team_member_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_access_at?: string | null
          permissions?: Json | null
          project_id?: string
          project_role?: Database["public"]["Enums"]["project_role"]
          team_member_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_extended_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_extended_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      project_settings: {
        Row: {
          analysis_settings: Json | null
          collaboration_settings: Json | null
          created_at: string | null
          custom_settings: Json | null
          dashboard_preferences: Json | null
          id: string
          inherit_from_team: boolean | null
          inheritance_conflicts: Json | null
          last_inherited_at: string | null
          notification_settings: Json | null
          project_id: string
          team_settings_override: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_settings?: Json | null
          collaboration_settings?: Json | null
          created_at?: string | null
          custom_settings?: Json | null
          dashboard_preferences?: Json | null
          id?: string
          inherit_from_team?: boolean | null
          inheritance_conflicts?: Json | null
          last_inherited_at?: string | null
          notification_settings?: Json | null
          project_id: string
          team_settings_override?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_settings?: Json | null
          collaboration_settings?: Json | null
          created_at?: string | null
          custom_settings?: Json | null
          dashboard_preferences?: Json | null
          id?: string
          inherit_from_team?: boolean | null
          inheritance_conflicts?: Json | null
          last_inherited_at?: string | null
          notification_settings?: Json | null
          project_id?: string
          team_settings_override?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          access_level: string
          allowed_sections: string[] | null
          created_at: string | null
          expiration_date: string | null
          id: string
          invitation_status: string | null
          invited_at: string | null
          invited_by: string | null
          is_temporary: boolean | null
          joined_at: string | null
          last_activity: string | null
          permissions: Json | null
          project_id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_level?: string
          allowed_sections?: string[] | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          invited_by?: string | null
          is_temporary?: boolean | null
          joined_at?: string | null
          last_activity?: string | null
          permissions?: Json | null
          project_id: string
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_level?: string
          allowed_sections?: string[] | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          invited_by?: string | null
          is_temporary?: boolean | null
          joined_at?: string | null
          last_activity?: string | null
          permissions?: Json | null
          project_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_team_members_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          default_settings: Json | null
          description: string | null
          id: string
          industry: string | null
          is_public: boolean | null
          name: string
          project_type: string
          suggested_metrics: Json | null
          suggested_objectives: Json | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          default_settings?: Json | null
          description?: string | null
          id?: string
          industry?: string | null
          is_public?: boolean | null
          name: string
          project_type: string
          suggested_metrics?: Json | null
          suggested_objectives?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          default_settings?: Json | null
          description?: string | null
          id?: string
          industry?: string | null
          is_public?: boolean | null
          name?: string
          project_type?: string
          suggested_metrics?: Json | null
          suggested_objectives?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          actual_end_date: string | null
          allow_team_access: boolean | null
          auto_analysis_enabled: boolean | null
          created_at: string | null
          created_by: string
          custom_fields: Json | null
          description: string | null
          id: string
          industry: string
          is_public: boolean | null
          name: string
          notification_settings: Json | null
          organization_id: string | null
          primary_objectives: Json | null
          priority: string
          project_type: string
          start_date: string | null
          status: string
          success_metrics: Json | null
          tags: string[] | null
          target_end_date: string | null
          target_market: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          allow_team_access?: boolean | null
          auto_analysis_enabled?: boolean | null
          created_at?: string | null
          created_by?: string
          custom_fields?: Json | null
          description?: string | null
          id?: string
          industry: string
          is_public?: boolean | null
          name: string
          notification_settings?: Json | null
          organization_id?: string | null
          primary_objectives?: Json | null
          priority?: string
          project_type?: string
          start_date?: string | null
          status?: string
          success_metrics?: Json | null
          tags?: string[] | null
          target_end_date?: string | null
          target_market?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          allow_team_access?: boolean | null
          auto_analysis_enabled?: boolean | null
          created_at?: string | null
          created_by?: string
          custom_fields?: Json | null
          description?: string | null
          id?: string
          industry?: string
          is_public?: boolean | null
          name?: string
          notification_settings?: Json | null
          organization_id?: string | null
          primary_objectives?: Json | null
          priority?: string
          project_type?: string
          start_date?: string | null
          status?: string
          success_metrics?: Json | null
          tags?: string[] | null
          target_end_date?: string | null
          target_market?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_overrides: {
        Row: {
          created_at: string | null
          created_by: string | null
          endpoint: string
          expires_at: string
          id: string
          identifier: string
          is_active: boolean | null
          multiplier: number | null
          override_type: string
          reason: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          endpoint: string
          expires_at: string
          id?: string
          identifier: string
          is_active?: boolean | null
          multiplier?: number | null
          override_type: string
          reason: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          endpoint?: string
          expires_at?: string
          id?: string
          identifier?: string
          is_active?: boolean | null
          multiplier?: number | null
          override_type?: string
          reason?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limit_usage: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number
          threat_level: string | null
          updated_at: string | null
          user_tier: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          threat_level?: string | null
          updated_at?: string | null
          user_tier?: string | null
          window_end: string
          window_start?: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          threat_level?: string | null
          updated_at?: string | null
          user_tier?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      real_time_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          affected_users: Json | null
          alert_type: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_system: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_users?: Json | null
          alert_type: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          source_system: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_users?: Json | null
          alert_type?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_system?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recurring_tasks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          last_created_at: string | null
          name: string
          next_due_at: string | null
          recurrence_pattern: Json
          team_id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_created_at?: string | null
          name: string
          next_due_at?: string | null
          recurrence_pattern: Json
          team_id: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_created_at?: string | null
          name?: string
          next_due_at?: string | null
          recurrence_pattern?: Json
          team_id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_recurring_tasks_template"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_shares: {
        Row: {
          chart_title: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          generated_report_id: string | null
          id: string
          is_public: boolean
          payload: Json
          token: string
          updated_at: string
        }
        Insert: {
          chart_title?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          generated_report_id?: string | null
          id?: string
          is_public?: boolean
          payload?: Json
          token?: string
          updated_at?: string
        }
        Update: {
          chart_title?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          generated_report_id?: string | null
          id?: string
          is_public?: boolean
          payload?: Json
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          branding: Json | null
          config: Json
          created_at: string
          created_by: string
          description: string | null
          format: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          branding?: Json | null
          config?: Json
          created_at?: string
          created_by: string
          description?: string | null
          format?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          branding?: Json | null
          config?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          format?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          conditions: Json | null
          created_at: string
          created_by: string
          cron: string | null
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          recipients: string[]
          template_id: string
          updated_at: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          created_by: string
          cron?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          recipients?: string[]
          template_id: string
          updated_at?: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          created_by?: string
          cron?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          recipients?: string[]
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          read_at: string | null
          severity: string
          team_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          severity: string
          team_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          team_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          created_at: string
          event_description: string
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_description: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_description?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          session_id: string | null
          severity: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      security_incidents: {
        Row: {
          created_at: string | null
          description: string
          id: string
          incident_type: string
          ip_address: unknown | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          incident_type: string
          ip_address?: unknown | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          incident_type?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      session_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          file_path: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          recorded_by: string
          recording_name: string | null
          session_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          recorded_by: string
          recording_name?: string | null
          session_id: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          recorded_by?: string
          recording_name?: string | null
          session_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_analytics: {
        Row: {
          action_type: string
          created_at: string | null
          entity_id: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          performance_impact_ms: number | null
          session_id: string | null
          setting_path: string | null
          setting_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          performance_impact_ms?: number | null
          session_id?: string | null
          setting_path?: string | null
          setting_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          performance_impact_ms?: number | null
          session_id?: string | null
          setting_path?: string | null
          setting_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      settings_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          field_path: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          setting_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          field_path?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          setting_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          field_path?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          setting_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      settings_automation_rules: {
        Row: {
          actions: Json
          created_at: string | null
          created_by: string
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          priority: number | null
          rule_name: string
          setting_type: string
          team_id: string | null
          trigger_conditions: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actions?: Json
          created_at?: string | null
          created_by?: string
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          priority?: number | null
          rule_name: string
          setting_type: string
          team_id?: string | null
          trigger_conditions?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actions?: Json
          created_at?: string | null
          created_by?: string
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          priority?: number | null
          rule_name?: string
          setting_type?: string
          team_id?: string | null
          trigger_conditions?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      settings_backups: {
        Row: {
          backup_data: Json
          backup_name: string
          backup_type: string
          checksum: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          backup_data: Json
          backup_name: string
          backup_type: string
          checksum?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          backup_data?: Json
          backup_name?: string
          backup_type?: string
          checksum?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      settings_integrations: {
        Row: {
          created_at: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          metadata: Json | null
          priority: number | null
          source_entity_id: string
          source_setting_type: string
          target_entity_id: string
          target_setting_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          metadata?: Json | null
          priority?: number | null
          source_entity_id: string
          source_setting_type: string
          target_entity_id: string
          target_setting_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          metadata?: Json | null
          priority?: number | null
          source_entity_id?: string
          source_setting_type?: string
          target_entity_id?: string
          target_setting_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      settings_recommendations: {
        Row: {
          applied_at: string | null
          confidence_score: number | null
          created_at: string | null
          description: string
          entity_id: string | null
          expires_at: string | null
          id: string
          impact_level: string | null
          metadata: Json | null
          recommendation_type: string
          setting_type: string
          status: string | null
          suggested_changes: Json
          title: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description: string
          entity_id?: string | null
          expires_at?: string | null
          id?: string
          impact_level?: string | null
          metadata?: Json | null
          recommendation_type: string
          setting_type: string
          status?: string | null
          suggested_changes?: Json
          title: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string
          entity_id?: string | null
          expires_at?: string | null
          id?: string
          impact_level?: string | null
          metadata?: Json | null
          recommendation_type?: string
          setting_type?: string
          status?: string | null
          suggested_changes?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      settings_sync_log: {
        Row: {
          conflict_resolution: string | null
          created_at: string | null
          entity_id: string
          error_details: string | null
          id: string
          metadata: Json | null
          processing_time_ms: number | null
          setting_type: string
          source_user_id: string | null
          sync_event: string
          sync_status: string | null
          target_entities: Json | null
        }
        Insert: {
          conflict_resolution?: string | null
          created_at?: string | null
          entity_id: string
          error_details?: string | null
          id?: string
          metadata?: Json | null
          processing_time_ms?: number | null
          setting_type: string
          source_user_id?: string | null
          sync_event: string
          sync_status?: string | null
          target_entities?: Json | null
        }
        Update: {
          conflict_resolution?: string | null
          created_at?: string | null
          entity_id?: string
          error_details?: string | null
          id?: string
          metadata?: Json | null
          processing_time_ms?: number | null
          setting_type?: string
          source_user_id?: string | null
          sync_event?: string
          sync_status?: string | null
          target_entities?: Json | null
        }
        Relationships: []
      }
      settings_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system_template: boolean | null
          metadata: Json | null
          name: string
          tags: string[] | null
          template_data: Json
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_template?: boolean | null
          metadata?: Json | null
          name: string
          tags?: string[] | null
          template_data: Json
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_template?: boolean | null
          metadata?: Json | null
          name?: string
          tags?: string[] | null
          template_data?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      settings_validation_rules: {
        Row: {
          created_at: string | null
          error_message: string
          field_path: string
          id: string
          is_active: boolean | null
          rule_config: Json
          rule_type: string
          setting_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message: string
          field_path: string
          id?: string
          is_active?: boolean | null
          rule_config: Json
          rule_type: string
          setting_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string
          field_path?: string
          id?: string
          is_active?: boolean | null
          rule_config?: Json
          rule_type?: string
          setting_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      settings_versions: {
        Row: {
          change_summary: string | null
          changed_fields: string[] | null
          created_at: string | null
          created_by: string | null
          entity_id: string
          id: string
          metadata: Json | null
          setting_type: string
          settings_data: Json
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          changed_fields?: string[] | null
          created_at?: string | null
          created_by?: string | null
          entity_id: string
          id?: string
          metadata?: Json | null
          setting_type: string
          settings_data: Json
          version_number?: number
        }
        Update: {
          change_summary?: string | null
          changed_fields?: string[] | null
          created_at?: string | null
          created_by?: string | null
          entity_id?: string
          id?: string
          metadata?: Json | null
          setting_type?: string
          settings_data?: Json
          version_number?: number
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          limits: Json | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_analytics: {
        Row: {
          aggregation_period: string
          created_at: string
          dimensions: Json | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_unit: string | null
          metric_value: number
          period_end: string
          period_start: string
        }
        Insert: {
          aggregation_period?: string
          created_at?: string
          dimensions?: Json | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          period_end: string
          period_start: string
        }
        Update: {
          aggregation_period?: string
          created_at?: string
          dimensions?: Json | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      system_health_status: {
        Row: {
          active_connections: number | null
          alerts_triggered: number | null
          checks_performed: Json | null
          cpu_usage: number | null
          created_at: string | null
          disk_usage: number | null
          error_rate: number | null
          health_details: Json | null
          id: string
          last_check_at: string | null
          memory_usage: number | null
          metadata: Json | null
          network_latency_ms: number | null
          response_time_ms: number | null
          service_name: string
          service_version: string | null
          status: string
          updated_at: string | null
          uptime_percentage: number | null
        }
        Insert: {
          active_connections?: number | null
          alerts_triggered?: number | null
          checks_performed?: Json | null
          cpu_usage?: number | null
          created_at?: string | null
          disk_usage?: number | null
          error_rate?: number | null
          health_details?: Json | null
          id?: string
          last_check_at?: string | null
          memory_usage?: number | null
          metadata?: Json | null
          network_latency_ms?: number | null
          response_time_ms?: number | null
          service_name: string
          service_version?: string | null
          status?: string
          updated_at?: string | null
          uptime_percentage?: number | null
        }
        Update: {
          active_connections?: number | null
          alerts_triggered?: number | null
          checks_performed?: Json | null
          cpu_usage?: number | null
          created_at?: string | null
          disk_usage?: number | null
          error_rate?: number | null
          health_details?: Json | null
          id?: string
          last_check_at?: string | null
          memory_usage?: number | null
          metadata?: Json | null
          network_latency_ms?: number | null
          response_time_ms?: number | null
          service_name?: string
          service_version?: string | null
          status?: string
          updated_at?: string | null
          uptime_percentage?: number | null
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          accepted_at: string | null
          assigned_at: string
          assigned_by: string
          completed_at: string | null
          id: string
          role: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          task_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string
          assigned_by: string
          completed_at?: string | null
          id?: string
          role?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          task_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string
          assigned_by?: string
          completed_at?: string | null
          id?: string
          role?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_assignments_task"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "team_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          attachments: Json | null
          comment_type: string
          content: string
          created_at: string
          id: string
          mentions: Json | null
          parent_comment_id: string | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          comment_type?: string
          content: string
          created_at?: string
          id?: string
          mentions?: Json | null
          parent_comment_id?: string | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          comment_type?: string
          content?: string
          created_at?: string
          id?: string
          mentions?: Json | null
          parent_comment_id?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_comments_parent"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_comments_task"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "team_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          created_by: string
          dependency_type: string
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dependency_type?: string
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dependency_type?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_dependencies_depends_on"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "team_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_dependencies_task"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "team_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_label_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          label_id: string
          task_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          label_id: string
          task_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          label_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_label_assignments_label"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "task_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_label_assignments_task"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "team_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          color: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          team_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          team_id: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          checklist: Json | null
          created_at: string
          created_by: string
          custom_fields: Json | null
          description: string | null
          estimated_hours: number | null
          id: string
          is_public: boolean | null
          name: string
          priority: Database["public"]["Enums"]["task_priority"]
          story_points: number | null
          tags: string[] | null
          task_type: Database["public"]["Enums"]["task_type"]
          team_id: string
          updated_at: string
        }
        Insert: {
          checklist?: Json | null
          created_at?: string
          created_by: string
          custom_fields?: Json | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_public?: boolean | null
          name: string
          priority?: Database["public"]["Enums"]["task_priority"]
          story_points?: number | null
          tags?: string[] | null
          task_type?: Database["public"]["Enums"]["task_type"]
          team_id: string
          updated_at?: string
        }
        Update: {
          checklist?: Json | null
          created_at?: string
          created_by?: string
          custom_fields?: Json | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_public?: boolean | null
          name?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          story_points?: number | null
          tags?: string[] | null
          task_type?: Database["public"]["Enums"]["task_type"]
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_time_tracking: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          hours_logged: number
          id: string
          is_billable: boolean | null
          logged_date: string
          started_at: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          hours_logged: number
          id?: string
          is_billable?: boolean | null
          logged_date?: string
          started_at?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          hours_logged?: number
          id?: string
          is_billable?: boolean | null
          logged_date?: string
          started_at?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_time_tracking_task"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "team_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_watchers: {
        Row: {
          created_at: string
          id: string
          notification_preferences: Json | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_preferences?: Json | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_preferences?: Json | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_watchers_task"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "team_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_workflows: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          statuses: Json
          task_types: Database["public"]["Enums"]["task_type"][] | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          statuses: Json
          task_types?: Database["public"]["Enums"]["task_type"][] | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          statuses?: Json
          task_types?: Database["public"]["Enums"]["task_type"][] | null
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_activity_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          team_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          team_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_activity_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_billing: {
        Row: {
          billing_contact_id: string | null
          billing_cycle: string
          created_at: string
          current_usage: Json
          id: string
          monthly_cost: number
          next_billing_date: string | null
          payment_method: Json | null
          subscription_status: string
          subscription_tier: string
          team_id: string
          updated_at: string
          usage_limits: Json
        }
        Insert: {
          billing_contact_id?: string | null
          billing_cycle?: string
          created_at?: string
          current_usage?: Json
          id?: string
          monthly_cost?: number
          next_billing_date?: string | null
          payment_method?: Json | null
          subscription_status?: string
          subscription_tier?: string
          team_id: string
          updated_at?: string
          usage_limits?: Json
        }
        Update: {
          billing_contact_id?: string | null
          billing_cycle?: string
          created_at?: string
          current_usage?: Json
          id?: string
          monthly_cost?: number
          next_billing_date?: string | null
          payment_method?: Json | null
          subscription_status?: string
          subscription_tier?: string
          team_id?: string
          updated_at?: string
          usage_limits?: Json
        }
        Relationships: [
          {
            foreignKeyName: "team_billing_billing_contact_id_fkey"
            columns: ["billing_contact_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_billing_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_channels: {
        Row: {
          channel_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean | null
          is_private: boolean
          metadata: Json | null
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          channel_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_private?: boolean
          metadata?: Json | null
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_private?: boolean
          metadata?: Json | null
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_compliance: {
        Row: {
          audit_score: number | null
          compliance_framework: string
          created_at: string
          evidence_documents: Json | null
          findings: Json | null
          id: string
          last_audit_date: string | null
          next_audit_date: string | null
          remediation_plan: Json | null
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          audit_score?: number | null
          compliance_framework: string
          created_at?: string
          evidence_documents?: Json | null
          findings?: Json | null
          id?: string
          last_audit_date?: string | null
          next_audit_date?: string | null
          remediation_plan?: Json | null
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          audit_score?: number | null
          compliance_framework?: string
          created_at?: string
          evidence_documents?: Json | null
          findings?: Json | null
          id?: string
          last_audit_date?: string | null
          next_audit_date?: string | null
          remediation_plan?: Json | null
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_compliance_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_data_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          download_count: number
          expires_at: string
          export_format: string
          export_type: string
          file_path: string | null
          file_size_bytes: number | null
          id: string
          included_data: Json
          requested_by: string
          retention_days: number
          status: string
          team_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          download_count?: number
          expires_at?: string
          export_format?: string
          export_type: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          included_data?: Json
          requested_by: string
          retention_days?: number
          status?: string
          team_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          download_count?: number
          expires_at?: string
          export_format?: string
          export_type?: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          included_data?: Json
          requested_by?: string
          retention_days?: number
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_data_exports_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_data_exports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          declined_at: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          message: string | null
          metadata: Json | null
          role_id: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          declined_at?: string | null
          email: string
          expires_at: string
          id?: string
          invitation_token: string
          invited_by: string
          message?: string | null
          metadata?: Json | null
          role_id: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          declined_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          message?: string | null
          metadata?: Json | null
          role_id?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          last_activity_at: string | null
          metadata: Json | null
          role_id: string
          status: Database["public"]["Enums"]["member_status"] | null
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          last_activity_at?: string | null
          metadata?: Json | null
          role_id: string
          status?: Database["public"]["Enums"]["member_status"] | null
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          last_activity_at?: string | null
          metadata?: Json | null
          role_id?: string
          status?: Database["public"]["Enums"]["member_status"] | null
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "team_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          attachments: Json | null
          channel_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_pinned: boolean | null
          mentions: Json | null
          message_type: string
          metadata: Json | null
          reactions: Json | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          channel_id: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          mentions?: Json | null
          message_type?: string
          metadata?: Json | null
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          channel_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          mentions?: Json | null
          message_type?: string
          metadata?: Json | null
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "team_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "team_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      team_policies: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          effective_date: string
          enforcement_level: string
          expiry_date: string | null
          id: string
          is_active: boolean
          policy_description: string | null
          policy_name: string
          policy_rules: Json
          policy_type: string
          team_id: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          effective_date?: string
          enforcement_level?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          policy_description?: string | null
          policy_name: string
          policy_rules?: Json
          policy_type: string
          team_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          effective_date?: string
          enforcement_level?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          policy_description?: string | null
          policy_name?: string
          policy_rules?: Json
          policy_type?: string
          team_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_policies_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_policies_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_security_events: {
        Row: {
          created_at: string
          event_description: string
          event_type: string
          id: string
          ip_address: unknown | null
          location_data: Json | null
          metadata: Json | null
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          risk_score: number | null
          severity: string
          team_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_description: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          location_data?: Json | null
          metadata?: Json | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_score?: number | null
          severity?: string
          team_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_description?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          location_data?: Json | null
          metadata?: Json | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_score?: number | null
          severity?: string
          team_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_security_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_security_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_tasks: {
        Row: {
          actual_hours: number | null
          archived_at: string | null
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          custom_fields: Json | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          story_points: number | null
          tags: string[] | null
          task_type: Database["public"]["Enums"]["task_type"]
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          archived_at?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          custom_fields?: Json | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          story_points?: number | null
          tags?: string[] | null
          task_type?: Database["public"]["Enums"]["task_type"]
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          archived_at?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          custom_fields?: Json | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          story_points?: number | null
          tags?: string[] | null
          task_type?: Database["public"]["Enums"]["task_type"]
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_usage_metrics: {
        Row: {
          active_users: number
          api_calls: number
          collaboration_sessions: number
          content_items_created: number
          created_at: string
          data_processed_gb: number
          features_used: Json | null
          id: string
          metric_date: string
          performance_metrics: Json | null
          storage_used_gb: number
          team_id: string
          total_projects: number
        }
        Insert: {
          active_users?: number
          api_calls?: number
          collaboration_sessions?: number
          content_items_created?: number
          created_at?: string
          data_processed_gb?: number
          features_used?: Json | null
          id?: string
          metric_date?: string
          performance_metrics?: Json | null
          storage_used_gb?: number
          team_id: string
          total_projects?: number
        }
        Update: {
          active_users?: number
          api_calls?: number
          collaboration_sessions?: number
          content_items_created?: number
          created_at?: string
          data_processed_gb?: number
          features_used?: Json | null
          id?: string
          metric_date?: string
          performance_metrics?: Json | null
          storage_used_gb?: number
          team_id?: string
          total_projects?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_usage_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          current_member_count: number | null
          default_member_settings: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          member_limit: number | null
          name: string
          owner_id: string
          parent_team_id: string | null
          settings: Json | null
          settings_policy: Json | null
          slug: string
          team_type: Database["public"]["Enums"]["team_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_member_count?: number | null
          default_member_settings?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          member_limit?: number | null
          name: string
          owner_id: string
          parent_team_id?: string | null
          settings?: Json | null
          settings_policy?: Json | null
          slug: string
          team_type?: Database["public"]["Enums"]["team_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_member_count?: number | null
          default_member_settings?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          member_limit?: number | null
          name?: string
          owner_id?: string
          parent_team_id?: string | null
          settings?: Json | null
          settings_policy?: Json | null
          slug?: string
          team_type?: Database["public"]["Enums"]["team_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      threat_intelligence: {
        Row: {
          confidence_score: number
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          indicator_type: string
          indicator_value: string
          is_active: boolean | null
          metadata: Json | null
          severity: string
          source: string
          threat_type: string
          updated_at: string | null
        }
        Insert: {
          confidence_score: number
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          indicator_type: string
          indicator_value: string
          is_active?: boolean | null
          metadata?: Json | null
          severity: string
          source: string
          threat_type: string
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          indicator_type?: string
          indicator_value?: string
          is_active?: boolean | null
          metadata?: Json | null
          severity?: string
          source?: string
          threat_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          channel_id: string
          expires_at: string
          id: string
          started_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          expires_at?: string
          id?: string
          started_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          channel_id?: string
          expires_at?: string
          id?: string
          started_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_typing_indicators_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "team_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          team_id: string | null
          usage_count: number | null
          usage_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          team_id?: string | null
          usage_count?: number | null
          usage_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          team_id?: string | null
          usage_count?: number | null
          usage_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analytics: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_name: string
          event_properties: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          page_path: string | null
          processed_at: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_name: string
          event_properties?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          page_path?: string | null
          processed_at?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_name?: string
          event_properties?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          page_path?: string | null
          processed_at?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          activity_data: Json | null
          current_location: string | null
          id: string
          last_seen: string | null
          status: string
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          current_location?: string | null
          id?: string
          last_seen?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          current_location?: string | null
          id?: string
          last_seen?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          hierarchy_level: number | null
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          name: string
          role_type: Database["public"]["Enums"]["role_type"]
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hierarchy_level?: number | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name: string
          role_type?: Database["public"]["Enums"]["role_type"]
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hierarchy_level?: number | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name?: string
          role_type?: Database["public"]["Enums"]["role_type"]
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_security_locks: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          lock_type: string
          locked_at: string | null
          locked_by: string | null
          metadata: Json | null
          reason: string
          unlock_at: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lock_type: string
          locked_at?: string | null
          locked_by?: string | null
          metadata?: Json | null
          reason: string
          unlock_at?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lock_type?: string
          locked_at?: string | null
          locked_by?: string | null
          metadata?: Json | null
          reason?: string
          unlock_at?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown | null
          is_current: boolean | null
          last_activity: string
          location_info: Json | null
          security_flags: Json | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_current?: boolean | null
          last_activity?: string
          location_info?: Json | null
          security_flags?: Json | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_current?: boolean | null
          last_activity?: string
          location_info?: Json | null
          security_flags?: Json | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions_security: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          accessibility_settings: Json | null
          app_preferences: Json | null
          created_at: string | null
          device_preferences: Json | null
          feature_flags: Json | null
          id: string
          last_sync_at: string | null
          notification_preferences: Json | null
          platform_sync_enabled: boolean | null
          privacy_settings: Json | null
          sync_conflicts: Json | null
          theme_preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accessibility_settings?: Json | null
          app_preferences?: Json | null
          created_at?: string | null
          device_preferences?: Json | null
          feature_flags?: Json | null
          id?: string
          last_sync_at?: string | null
          notification_preferences?: Json | null
          platform_sync_enabled?: boolean | null
          privacy_settings?: Json | null
          sync_conflicts?: Json | null
          theme_preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accessibility_settings?: Json | null
          app_preferences?: Json | null
          created_at?: string | null
          device_preferences?: Json | null
          feature_flags?: Json | null
          id?: string
          last_sync_at?: string | null
          notification_preferences?: Json | null
          platform_sync_enabled?: boolean | null
          privacy_settings?: Json | null
          sync_conflicts?: Json | null
          theme_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      websocket_sessions: {
        Row: {
          connected_at: string | null
          connection_state: Json | null
          id: string
          last_activity: string | null
          metadata: Json | null
          session_id: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          connection_state?: Json | null
          id?: string
          last_activity?: string | null
          metadata?: Json | null
          session_id: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          connected_at?: string | null
          connection_state?: Json | null
          id?: string
          last_activity?: string | null
          metadata?: Json | null
          session_id?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: Json
      }
      aggregate_business_metrics: {
        Args: {
          p_end_date?: string
          p_project_id?: string
          p_start_date?: string
          p_team_id?: string
        }
        Returns: Json
      }
      assign_role_permissions: {
        Args: { permission_slugs: string[]; role_slug: string }
        Returns: undefined
      }
      calculate_user_engagement_score: {
        Args: { p_days?: number; p_user_id: string }
        Returns: number
      }
      can_access_team_billing: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_project_team: {
        Args: { project_id: string; user_id: string }
        Returns: boolean
      }
      can_manage_team_resources: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_project_team: {
        Args: { project_id: string; user_id: string }
        Returns: boolean
      }
      cancel_team_invitation: {
        Args: { p_cancelled_by: string; p_invitation_id: string }
        Returns: undefined
      }
      check_team_membership: {
        Args: { p_email: string; p_team_id: string }
        Returns: boolean
      }
      cleanup_expired_ai_jobs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_invitations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_settings_backups: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_typing_indicators: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      column_exists: {
        Args: { column_name: string; table_name: string }
        Returns: boolean
      }
      compute_next_run_at: {
        Args: {
          cadence: string
          current: string
          hour: number
          minute: number
          tz: string
        }
        Returns: string
      }
      create_project_secure: {
        Args: {
          project_allow_team_access?: boolean
          project_auto_analysis_enabled?: boolean
          project_custom_fields?: Json
          project_description?: string
          project_industry: string
          project_is_public?: boolean
          project_name: string
          project_notification_settings?: Json
          project_primary_objectives?: string[]
          project_priority?: string
          project_start_date?: string
          project_status?: string
          project_success_metrics?: string[]
          project_tags?: string[]
          project_target_end_date?: string
          project_target_market?: string
          project_type_param?: string
        }
        Returns: {
          actual_end_date: string | null
          allow_team_access: boolean | null
          auto_analysis_enabled: boolean | null
          created_at: string | null
          created_by: string
          custom_fields: Json | null
          description: string | null
          id: string
          industry: string
          is_public: boolean | null
          name: string
          notification_settings: Json | null
          organization_id: string | null
          primary_objectives: Json | null
          priority: string
          project_type: string
          start_date: string | null
          status: string
          success_metrics: Json | null
          tags: string[] | null
          target_end_date: string | null
          target_market: string | null
          team_id: string | null
          updated_at: string | null
        }
      }
      create_settings_version: {
        Args: {
          p_change_summary?: string
          p_changed_fields?: string[]
          p_entity_id: string
          p_setting_type: string
          p_settings_data: Json
        }
        Returns: string
      }
      create_team_invitation: {
        Args: {
          p_email: string
          p_expires_at: string
          p_invitation_token: string
          p_invited_by: string
          p_message?: string
          p_metadata?: Json
          p_role_id: string
          p_team_id: string
        }
        Returns: Json
      }
      create_team_with_member_integration: {
        Args: {
          p_member_limit?: number
          p_settings?: Json
          p_team_description?: string
          p_team_name: string
          p_team_type?: string
        }
        Returns: Json
      }
      decline_team_invitation: {
        Args: { p_token: string }
        Returns: undefined
      }
      get_accessible_teams: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          current_member_count: number
          description: string
          id: string
          is_active: boolean
          member_limit: number
          name: string
          owner_id: string
          settings: Json
          slug: string
          team_type: string
          updated_at: string
        }[]
      }
      get_avatar_url: {
        Args: { full_name: string; user_id: string }
        Returns: string
      }
      get_existing_invitation: {
        Args: { p_email: string; p_team_id: string }
        Returns: Json
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      get_invitation_status: {
        Args: { p_token: string }
        Returns: Json
      }
      get_or_create_analytics_settings: {
        Args: { p_team_id?: string; p_user_id: string }
        Returns: {
          alert_settings: Json | null
          automation_preferences: Json | null
          chart_settings: Json | null
          created_at: string | null
          cross_module_analytics: Json | null
          dashboard_settings: Json | null
          data_settings: Json | null
          id: string
          privacy_settings: Json | null
          report_settings: Json | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
      }
      get_or_create_competitive_settings: {
        Args: { p_team_id?: string; p_user_id: string }
        Returns: {
          alerting_settings: Json | null
          analysis_automation: Json | null
          analysis_settings: Json | null
          created_at: string | null
          data_retention: Json | null
          id: string
          integration_settings: Json | null
          monitoring_settings: Json | null
          reporting_settings: Json | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
      }
      get_or_create_content_settings: {
        Args: { p_team_id?: string; p_user_id: string }
        Returns: {
          created_at: string | null
          id: string
          library_integration: Json | null
          management_settings: Json | null
          organization_settings: Json | null
          search_settings: Json | null
          team_id: string | null
          updated_at: string | null
          upload_settings: Json | null
          user_id: string
          workflow_automation: Json | null
          workflow_settings: Json | null
        }
      }
      get_or_create_project_settings: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: {
          analysis_settings: Json | null
          collaboration_settings: Json | null
          created_at: string | null
          custom_settings: Json | null
          dashboard_preferences: Json | null
          id: string
          inherit_from_team: boolean | null
          inheritance_conflicts: Json | null
          last_inherited_at: string | null
          notification_settings: Json | null
          project_id: string
          team_settings_override: Json | null
          updated_at: string | null
          user_id: string
        }
      }
      get_or_create_user_settings: {
        Args: { p_user_id: string }
        Returns: {
          accessibility_settings: Json | null
          app_preferences: Json | null
          created_at: string | null
          device_preferences: Json | null
          feature_flags: Json | null
          id: string
          last_sync_at: string | null
          notification_preferences: Json | null
          platform_sync_enabled: boolean | null
          privacy_settings: Json | null
          sync_conflicts: Json | null
          theme_preferences: Json | null
          updated_at: string | null
          user_id: string
        }
      }
      get_pending_invitations: {
        Args: { p_email: string }
        Returns: Json
      }
      get_project_analytics_optimized: {
        Args: { p_limit?: number; p_team_id?: string; p_user_id: string }
        Returns: {
          content_count: number
          performance_score: number
          priority: string
          project_id: string
          project_name: string
          recent_activity_count: number
          status: string
          team_member_count: number
        }[]
      }
      get_team_invitations: {
        Args: { p_options?: Json; p_team_id: string }
        Returns: Json
      }
      get_user_app_preferences: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_last_team: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_projects_safe: {
        Args: { p_user_id: string }
        Returns: {
          project_id: string
        }[]
      }
      get_user_team_ids_safe: {
        Args: { p_user_id: string }
        Returns: {
          team_id: string
        }[]
      }
      get_user_team_role_level_safe: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: number
      }
      get_user_team_settings_safe: {
        Args: { p_user_id: string }
        Returns: {
          active_users: number
          member_count: number
          pending_invitations: number
          permissions: Json
          team_description: string
          team_id: string
          team_name: string
          user_role: string
        }[]
      }
      get_user_teams: {
        Args: { user_id_param: string }
        Returns: {
          team_id: string
        }[]
      }
      get_user_teams_direct: {
        Args: { user_id_param: string }
        Returns: {
          team_id: string
        }[]
      }
      get_user_usage_summary: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          resource_type: string
          sum: number
        }[]
      }
      increment_generated_report_download: {
        Args: { p_id: string }
        Returns: undefined
      }
      is_project_admin_or_manager: {
        Args: { project_id: string; user_id: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { project_id: string; user_id: string }
        Returns: boolean
      }
      is_project_team_member: {
        Args: { project_id: string; user_id: string }
        Returns: boolean
      }
      is_slug_unique_safe: {
        Args: { p_exclude_team_id?: string; p_slug: string }
        Returns: boolean
      }
      is_user_system_admin: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_user_team_member_safe: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      is_user_team_owner_safe: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      log_safe_error: {
        Args: { context_data?: Json; error_message: string; error_type: string }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_description: string
          p_event_type: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_success?: boolean
          p_user_agent?: string
        }
        Returns: undefined
      }
      log_team_activity: {
        Args: {
          p_action: string
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_description?: string
          p_metadata?: Json
          p_team_id: string
          p_user_id: string
        }
        Returns: string
      }
      manage_file_versions: {
        Args: { action: string; content_id: string; version_data?: Json }
        Returns: Json
      }
      migrate_last_team_to_app_preferences: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      resend_team_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      resolve_comment: {
        Args: { p_comment_id: string; p_resolved_by: string }
        Returns: undefined
      }
      restore_settings_from_version: {
        Args: { p_version_id: string }
        Returns: Json
      }
      test_auth_uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_user_app_preferences: {
        Args: { p_preferences: Json }
        Returns: undefined
      }
      update_user_last_team: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      user_can_access_project: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      user_can_access_team_content: {
        Args: { p_content_id: string; p_user_id: string }
        Returns: boolean
      }
      validate_settings_data: {
        Args: { p_setting_type: string; p_settings_data: Json }
        Returns: Json
      }
    }
    Enums: {
      activity_type:
        | "authentication"
        | "team_management"
        | "role_management"
        | "project_access"
        | "content_activity"
        | "competitive_intel"
        | "system_event"
        | "security_event"
      assignment_status: "assigned" | "accepted" | "declined" | "completed"
      comment_resource_type:
        | "project"
        | "content_item"
        | "competitor"
        | "analysis_report"
        | "team_discussion"
      content_format: "plain_text" | "markdown" | "html"
      member_status: "pending" | "active" | "inactive" | "suspended" | "left"
      notification_priority: "low" | "normal" | "high" | "urgent"
      notification_type:
        | "team_invitation"
        | "role_changed"
        | "project_assigned"
        | "content_shared"
        | "comment_mention"
        | "approval_request"
        | "system_alert"
        | "security_alert"
      project_role:
        | "owner"
        | "admin"
        | "manager"
        | "contributor"
        | "member"
        | "viewer"
      role_type: "system" | "organizational" | "project" | "custom"
      severity_level: "debug" | "info" | "warning" | "error" | "critical"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status:
        | "backlog"
        | "todo"
        | "in_progress"
        | "in_review"
        | "done"
        | "cancelled"
      task_type: "feature" | "bug" | "improvement" | "research" | "maintenance"
      team_type:
        | "organization"
        | "department"
        | "project_team"
        | "working_group"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: [
        "authentication",
        "team_management",
        "role_management",
        "project_access",
        "content_activity",
        "competitive_intel",
        "system_event",
        "security_event",
      ],
      assignment_status: ["assigned", "accepted", "declined", "completed"],
      comment_resource_type: [
        "project",
        "content_item",
        "competitor",
        "analysis_report",
        "team_discussion",
      ],
      content_format: ["plain_text", "markdown", "html"],
      member_status: ["pending", "active", "inactive", "suspended", "left"],
      notification_priority: ["low", "normal", "high", "urgent"],
      notification_type: [
        "team_invitation",
        "role_changed",
        "project_assigned",
        "content_shared",
        "comment_mention",
        "approval_request",
        "system_alert",
        "security_alert",
      ],
      project_role: [
        "owner",
        "admin",
        "manager",
        "contributor",
        "member",
        "viewer",
      ],
      role_type: ["system", "organizational", "project", "custom"],
      severity_level: ["debug", "info", "warning", "error", "critical"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: [
        "backlog",
        "todo",
        "in_progress",
        "in_review",
        "done",
        "cancelled",
      ],
      task_type: ["feature", "bug", "improvement", "research", "maintenance"],
      team_type: [
        "organization",
        "department",
        "project_team",
        "working_group",
      ],
    },
  },
} as const
