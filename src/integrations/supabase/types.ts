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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          message: string
          project_id: string
          resolved: boolean
          severity: Database["public"]["Enums"]["alert_severity"]
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          message: string
          project_id: string
          resolved?: boolean
          severity?: Database["public"]["Enums"]["alert_severity"]
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          project_id?: string
          resolved?: boolean
          severity?: Database["public"]["Enums"]["alert_severity"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      carbon_credits: {
        Row: {
          annual_rate_tco2e_ha: number
          area_hectares: number
          calculated_by: string
          created_at: string
          ecosystem: Database["public"]["Enums"]["ecosystem_type"]
          evidence_id: string | null
          growth_stage: string
          id: string
          issued_by: string | null
          methodology: string
          notes: string | null
          project_id: string
          tco2e: number
          updated_at: string
          years: number
        }
        Insert: {
          annual_rate_tco2e_ha?: number
          area_hectares?: number
          calculated_by: string
          created_at?: string
          ecosystem: Database["public"]["Enums"]["ecosystem_type"]
          evidence_id?: string | null
          growth_stage?: string
          id?: string
          issued_by?: string | null
          methodology?: string
          notes?: string | null
          project_id: string
          tco2e?: number
          updated_at?: string
          years?: number
        }
        Update: {
          annual_rate_tco2e_ha?: number
          area_hectares?: number
          calculated_by?: string
          created_at?: string
          ecosystem?: Database["public"]["Enums"]["ecosystem_type"]
          evidence_id?: string | null
          growth_stage?: string
          id?: string
          issued_by?: string | null
          methodology?: string
          notes?: string | null
          project_id?: string
          tco2e?: number
          updated_at?: string
          years?: number
        }
        Relationships: [
          {
            foreignKeyName: "carbon_credits_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carbon_credits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_annotations: {
        Row: {
          coordinates: Json
          created_at: string
          evidence_id: string
          id: string
          note: string | null
          shape_type: string
          verifier_id: string
        }
        Insert: {
          coordinates?: Json
          created_at?: string
          evidence_id: string
          id?: string
          note?: string | null
          shape_type: string
          verifier_id: string
        }
        Update: {
          coordinates?: Json
          created_at?: string
          evidence_id?: string
          id?: string
          note?: string | null
          shape_type?: string
          verifier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_annotations_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_submissions: {
        Row: {
          ai_canopy_density: number | null
          ai_confidence_score: number | null
          ai_ecosystem_match: boolean | null
          ai_summary: string | null
          ai_vegetation_health: number | null
          captured_at: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          photo_path: string | null
          project_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          species_confirmed: boolean | null
          species_name: string | null
          species_suggested: string | null
          status: Database["public"]["Enums"]["evidence_status"]
          submission_type: string
          submitter_id: string
          updated_at: string
        }
        Insert: {
          ai_canopy_density?: number | null
          ai_confidence_score?: number | null
          ai_ecosystem_match?: boolean | null
          ai_summary?: string | null
          ai_vegetation_health?: number | null
          captured_at?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_path?: string | null
          project_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          species_confirmed?: boolean | null
          species_name?: string | null
          species_suggested?: string | null
          status?: Database["public"]["Enums"]["evidence_status"]
          submission_type?: string
          submitter_id: string
          updated_at?: string
        }
        Update: {
          ai_canopy_density?: number | null
          ai_confidence_score?: number | null
          ai_ecosystem_match?: boolean | null
          ai_summary?: string | null
          ai_vegetation_health?: number | null
          captured_at?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_path?: string | null
          project_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          species_confirmed?: boolean | null
          species_name?: string | null
          species_suggested?: string | null
          status?: Database["public"]["Enums"]["evidence_status"]
          submission_type?: string
          submitter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      issuance_audit_log: {
        Row: {
          admin_id: string
          created_at: string
          credit_id: string | null
          evidence_id: string | null
          id: string
          prev_hash: string | null
          project_id: string
          record_hash: string
          tco2e_amount: number
        }
        Insert: {
          admin_id: string
          created_at?: string
          credit_id?: string | null
          evidence_id?: string | null
          id?: string
          prev_hash?: string | null
          project_id: string
          record_hash: string
          tco2e_amount: number
        }
        Update: {
          admin_id?: string
          created_at?: string
          credit_id?: string | null
          evidence_id?: string | null
          id?: string
          prev_hash?: string | null
          project_id?: string
          record_hash?: string
          tco2e_amount?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          area_hectares: number
          created_at: string
          description: string | null
          ecosystem: Database["public"]["Enums"]["ecosystem_type"]
          health_score: number
          id: string
          impact_story: string | null
          impact_story_generated_at: string | null
          latitude: number
          longitude: number
          name: string
          owner_id: string
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          area_hectares?: number
          created_at?: string
          description?: string | null
          ecosystem: Database["public"]["Enums"]["ecosystem_type"]
          health_score?: number
          id?: string
          impact_story?: string | null
          impact_story_generated_at?: string | null
          latitude: number
          longitude: number
          name: string
          owner_id: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          area_hectares?: number
          created_at?: string
          description?: string | null
          ecosystem?: Database["public"]["Enums"]["ecosystem_type"]
          health_score?: number
          id?: string
          impact_story?: string | null
          impact_story_generated_at?: string | null
          latitude?: number
          longitude?: number
          name?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "low" | "medium" | "high" | "critical"
      app_role:
        | "admin"
        | "verifier"
        | "developer"
        | "field_submitter"
        | "pending_admin"
      ecosystem_type: "mangrove" | "seagrass" | "salt_marsh"
      evidence_status:
        | "pending"
        | "approved"
        | "rejected"
        | "flagged"
        | "verified"
      project_status:
        | "draft"
        | "active"
        | "monitoring"
        | "verified"
        | "archived"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      alert_severity: ["low", "medium", "high", "critical"],
      app_role: [
        "admin",
        "verifier",
        "developer",
        "field_submitter",
        "pending_admin",
      ],
      ecosystem_type: ["mangrove", "seagrass", "salt_marsh"],
      evidence_status: [
        "pending",
        "approved",
        "rejected",
        "flagged",
        "verified",
      ],
      project_status: ["draft", "active", "monitoring", "verified", "archived"],
    },
  },
} as const
