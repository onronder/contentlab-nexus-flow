export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
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
          domain: string
          id: string
          industry: string | null
          last_analysis_date: string | null
          market_share_estimate: number | null
          monitoring_enabled: boolean | null
          project_id: string
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
          domain: string
          id?: string
          industry?: string | null
          last_analysis_date?: string | null
          market_share_estimate?: number | null
          monitoring_enabled?: boolean | null
          project_id: string
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
          domain?: string
          id?: string
          industry?: string | null
          last_analysis_date?: string | null
          market_share_estimate?: number | null
          monitoring_enabled?: boolean | null
          project_id?: string
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
          updated_at?: string | null
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
      can_manage_project_team: {
        Args: { project_id: string; user_id: string }
        Returns: boolean
      }
      can_view_project_team: {
        Args: { project_id: string; user_id: string }
        Returns: boolean
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_project_secure: {
        Args:
          | {
              project_name: string
              project_description: string
              project_industry: string
              project_type_param: string
              project_status: string
              project_priority: string
            }
          | {
              project_name: string
              project_industry: string
              project_description?: string
              project_type_param?: string
              project_target_market?: string
              project_primary_objectives?: string[]
              project_success_metrics?: string[]
              project_status?: string
              project_priority?: string
              project_start_date?: string
              project_target_end_date?: string
              project_is_public?: boolean
              project_allow_team_access?: boolean
              project_auto_analysis_enabled?: boolean
              project_notification_settings?: Json
              project_custom_fields?: Json
              project_tags?: string[]
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
          updated_at: string | null
        }
      }
      get_avatar_url: {
        Args: { user_id: string; full_name: string }
        Returns: string
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
      test_auth_uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
