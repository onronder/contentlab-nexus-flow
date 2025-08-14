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
          category_id: string | null
          content_hash: string | null
          content_type: string
          created_at: string | null
          description: string | null
          file_path: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          project_id: string
          published_at: string | null
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_publish_at: string | null
          search_vector: unknown | null
          status: string
          team_id: string | null
          thumbnail_path: string | null
          title: string
          updated_at: string | null
          user_id: string
          workflow_status: string | null
        }
        Insert: {
          category_id?: string | null
          content_hash?: string | null
          content_type: string
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          project_id: string
          published_at?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_publish_at?: string | null
          search_vector?: unknown | null
          status?: string
          team_id?: string | null
          thumbnail_path?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          workflow_status?: string | null
        }
        Update: {
          category_id?: string | null
          content_hash?: string | null
          content_type?: string
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          project_id?: string
          published_at?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_publish_at?: string | null
          search_vector?: unknown | null
          status?: string
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
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          description: string | null
          id: string
          is_active: boolean | null
          member_limit: number | null
          name: string
          owner_id: string
          parent_team_id: string | null
          settings: Json | null
          slug: string
          team_type: Database["public"]["Enums"]["team_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_member_count?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          member_limit?: number | null
          name: string
          owner_id: string
          parent_team_id?: string | null
          settings?: Json | null
          slug: string
          team_type?: Database["public"]["Enums"]["team_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_member_count?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          member_limit?: number | null
          name?: string
          owner_id?: string
          parent_team_id?: string | null
          settings?: Json | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: Json
      }
      assign_role_permissions: {
        Args: { permission_slugs: string[]; role_slug: string }
        Returns: undefined
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
        Returns: undefined
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
      decline_team_invitation: {
        Args: { p_token: string }
        Returns: undefined
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
      get_pending_invitations: {
        Args: { p_email: string }
        Returns: Json
      }
      get_team_invitations: {
        Args: { p_options?: Json; p_team_id: string }
        Returns: Json
      }
      get_user_accessible_teams: {
        Args: { p_user_id: string }
        Returns: {
          team_id: string
        }[]
      }
      get_user_projects_safe: {
        Args: { p_user_id: string }
        Returns: {
          project_id: string
        }[]
      }
      get_user_team_role_level_safe: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: number
      }
      get_user_teams: {
        Args: { user_id_param: string }
        Returns: {
          team_id: string
        }[]
      }
      get_user_teams_safe: {
        Args: { p_user_id: string }
        Returns: {
          team_id: string
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
      is_team_member_safe: {
        Args: { team_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_team_owner_safe: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      is_user_system_admin: {
        Args: { user_id_param: string }
        Returns: boolean
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
      resend_team_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      resolve_comment: {
        Args: { p_comment_id: string; p_resolved_by: string }
        Returns: undefined
      }
      test_auth_uid: {
        Args: Record<PropertyKey, never>
        Returns: string
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
