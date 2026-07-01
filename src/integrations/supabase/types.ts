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
      exercise_logs: {
        Row: {
          exercise_index: number
          exercise_name: string
          id: string
          logged_at: string
          notes: string | null
          reps: string | null
          rpe: number | null
          sets_completed: number
          skipped: boolean
          user_id: string
          weight_kg: number | null
          workout_day_id: string
        }
        Insert: {
          exercise_index: number
          exercise_name: string
          id?: string
          logged_at?: string
          notes?: string | null
          reps?: string | null
          rpe?: number | null
          sets_completed?: number
          skipped?: boolean
          user_id: string
          weight_kg?: number | null
          workout_day_id: string
        }
        Update: {
          exercise_index?: number
          exercise_name?: string
          id?: string
          logged_at?: string
          notes?: string | null
          reps?: string | null
          rpe?: number | null
          sets_completed?: number
          skipped?: boolean
          user_id?: string
          weight_kg?: number | null
          workout_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_workout_day_id_fkey"
            columns: ["workout_day_id"]
            isOneToOne: false
            referencedRelation: "workout_days"
            referencedColumns: ["id"]
          },
        ]
      }
      notified_achievements: {
        Row: {
          achievement_key: string
          id: string
          notified_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          notified_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          notified_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          allergies: string
          created_at: string
          days_per_week: number
          equipment: string
          experience: string
          gender: string | null
          goal: string
          height_cm: number | null
          id: string
          injuries: string | null
          name: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          allergies?: string
          created_at?: string
          days_per_week: number
          equipment: string
          experience: string
          gender?: string | null
          goal: string
          height_cm?: number | null
          id: string
          injuries?: string | null
          name: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          allergies?: string
          created_at?: string
          days_per_week?: number
          equipment?: string
          experience?: string
          gender?: string | null
          goal?: string
          height_cm?: number | null
          id?: string
          injuries?: string | null
          name?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      week_reviews: {
        Row: {
          completion_pct: number
          created_at: string
          difficulty_pref: string | null
          energy: number | null
          id: string
          notes: string | null
          soreness: number | null
          user_id: string
          week_id: string
        }
        Insert: {
          completion_pct: number
          created_at?: string
          difficulty_pref?: string | null
          energy?: number | null
          id?: string
          notes?: string | null
          soreness?: number | null
          user_id: string
          week_id: string
        }
        Update: {
          completion_pct?: number
          created_at?: string
          difficulty_pref?: string | null
          energy?: number | null
          id?: string
          notes?: string | null
          soreness?: number | null
          user_id?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_reviews_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: true
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      weeks: {
        Row: {
          created_at: string
          diet_json: Json
          id: string
          plan_summary: string | null
          start_date: string
          status: string
          user_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          diet_json?: Json
          id?: string
          plan_summary?: string | null
          start_date?: string
          status?: string
          user_id: string
          week_number: number
        }
        Update: {
          created_at?: string
          diet_json?: Json
          id?: string
          plan_summary?: string | null
          start_date?: string
          status?: string
          user_id?: string
          week_number?: number
        }
        Relationships: []
      }
      workout_days: {
        Row: {
          completed_at: string | null
          created_at: string
          day_index: number
          exercises_json: Json
          focus: string | null
          id: string
          title: string
          user_id: string
          week_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_index: number
          exercises_json?: Json
          focus?: string | null
          id?: string
          title: string
          user_id: string
          week_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_index?: number
          exercises_json?: Json
          focus?: string | null
          id?: string
          title?: string
          user_id?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_days_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
