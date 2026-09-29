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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json
          summary: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          summary?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          summary?: string | null
        }
        Relationships: []
      }
      bid_documents: {
        Row: {
          bid_id: string
          created_at: string
          doc_type: string
          file_path: string
          id: string
          mime_type: string | null
          name: string
          sha256: string | null
          size_bytes: number | null
          vendor_user_id: string
        }
        Insert: {
          bid_id: string
          created_at?: string
          doc_type: string
          file_path: string
          id?: string
          mime_type?: string | null
          name: string
          sha256?: string | null
          size_bytes?: number | null
          vendor_user_id?: string
        }
        Update: {
          bid_id?: string
          created_at?: string
          doc_type?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          name?: string
          sha256?: string | null
          size_bytes?: number | null
          vendor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_documents_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_passports: {
        Row: {
          bid_id: string
          decision_id: string
          id: string
          issued_at: string
          passport_hash: string
          passport_snapshot: Json
          vendor_user_id: string
        }
        Insert: {
          bid_id: string
          decision_id: string
          id?: string
          issued_at?: string
          passport_hash: string
          passport_snapshot: Json
          vendor_user_id: string
        }
        Update: {
          bid_id?: string
          decision_id?: string
          id?: string
          issued_at?: string
          passport_hash?: string
          passport_snapshot?: Json
          vendor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_passports_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_passports_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: true
            referencedRelation: "final_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          application: Json
          created_at: string
          id: string
          notes: string | null
          quoted_amount: number | null
          stage: string
          status: string
          submitted_at: string | null
          tender_id: string
          updated_at: string
          vendor_user_id: string
        }
        Insert: {
          application?: Json
          created_at?: string
          id?: string
          notes?: string | null
          quoted_amount?: number | null
          stage?: string
          status?: string
          submitted_at?: string | null
          tender_id: string
          updated_at?: string
          vendor_user_id?: string
        }
        Update: {
          application?: Json
          created_at?: string
          id?: string
          notes?: string | null
          quoted_amount?: number | null
          stage?: string
          status?: string
          submitted_at?: string | null
          tender_id?: string
          updated_at?: string
          vendor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_results: {
        Row: {
          ai_confidence: number | null
          ai_reason: string | null
          ai_verdict: string | null
          category: string
          created_at: string
          evidence_page: number | null
          evidence_text: string | null
          expected: string | null
          found_value: string | null
          id: string
          passed: boolean
          position: number
          rule_code: string
          rule_name: string
          run_id: string
          severity: string
          source: string
          status: string
          suggestion: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_reason?: string | null
          ai_verdict?: string | null
          category?: string
          created_at?: string
          evidence_page?: number | null
          evidence_text?: string | null
          expected?: string | null
          found_value?: string | null
          id?: string
          passed: boolean
          position?: number
          rule_code: string
          rule_name: string
          run_id: string
          severity: string
          source?: string
          status: string
          suggestion?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_reason?: string | null
          ai_verdict?: string | null
          category?: string
          created_at?: string
          evidence_page?: number | null
          evidence_text?: string | null
          expected?: string | null
          found_value?: string | null
          id?: string
          passed?: boolean
          position?: number
          rule_code?: string
          rule_name?: string
          run_id?: string
          severity?: string
          source?: string
          status?: string
          suggestion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "compliance_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rule_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by: string
          id: string
          published_at: string | null
          published_by: string | null
          rules: Json
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by?: string
          id?: string
          published_at?: string | null
          published_by?: string | null
          rules?: Json
          status?: string
          updated_at?: string
          version: string
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by?: string
          id?: string
          published_at?: string | null
          published_by?: string | null
          rules?: Json
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      compliance_runs: {
        Row: {
          ai_confidence: number | null
          ai_recommendations: Json
          ai_summary: string | null
          bid_document_id: string | null
          bid_id: string | null
          completed_at: string | null
          created_at: string
          error: string | null
          file_name: string
          file_path: string
          id: string
          officer_decided_at: string | null
          officer_id: string | null
          officer_note: string | null
          officer_status: string | null
          page_count: number | null
          rag_delta: number | null
          rule_score: number | null
          rules_version: string
          score: number | null
          sha256: string | null
          size_bytes: number | null
          started_by: string
          status: string
          tender_id: string | null
          updated_at: string
          vendor_user_id: string
          verdict: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_recommendations?: Json
          ai_summary?: string | null
          bid_document_id?: string | null
          bid_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          file_name: string
          file_path: string
          id?: string
          officer_decided_at?: string | null
          officer_id?: string | null
          officer_note?: string | null
          officer_status?: string | null
          page_count?: number | null
          rag_delta?: number | null
          rule_score?: number | null
          rules_version?: string
          score?: number | null
          sha256?: string | null
          size_bytes?: number | null
          started_by?: string
          status?: string
          tender_id?: string | null
          updated_at?: string
          vendor_user_id?: string
          verdict?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_recommendations?: Json
          ai_summary?: string | null
          bid_document_id?: string | null
          bid_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          file_name?: string
          file_path?: string
          id?: string
          officer_decided_at?: string | null
          officer_id?: string | null
          officer_note?: string | null
          officer_status?: string | null
          page_count?: number | null
          rag_delta?: number | null
          rule_score?: number | null
          rules_version?: string
          score?: number | null
          sha256?: string | null
          size_bytes?: number | null
          started_by?: string
          status?: string
          tender_id?: string | null
          updated_at?: string
          vendor_user_id?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_runs_bid_document_id_fkey"
            columns: ["bid_document_id"]
            isOneToOne: false
            referencedRelation: "bid_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_runs_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_runs_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      data_gov_imports: {
        Row: {
          created_at: string
          fetched_at: string
          fields: Json | null
          id: string
          imported_by: string
          org: string | null
          record_count: number
          records: Json
          resource_id: string
          sha256: string
          source_url: string
          title: string | null
        }
        Insert: {
          created_at?: string
          fetched_at?: string
          fields?: Json | null
          id?: string
          imported_by?: string
          org?: string | null
          record_count?: number
          records?: Json
          resource_id: string
          sha256: string
          source_url: string
          title?: string | null
        }
        Update: {
          created_at?: string
          fetched_at?: string
          fields?: Json | null
          id?: string
          imported_by?: string
          org?: string | null
          record_count?: number
          records?: Json
          resource_id?: string
          sha256?: string
          source_url?: string
          title?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          ministry: string | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          ministry?: string | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          ministry?: string | null
          name?: string
        }
        Relationships: []
      }
      final_decisions: {
        Row: {
          bid_id: string
          compliance_snapshot: Json
          decided_at: string
          decision: string
          decision_hash: string
          id: string
          justification: string
          officer_id: string
          run_id: string
          vendor_user_id: string
        }
        Insert: {
          bid_id: string
          compliance_snapshot: Json
          decided_at?: string
          decision: string
          decision_hash: string
          id?: string
          justification: string
          officer_id: string
          run_id: string
          vendor_user_id: string
        }
        Update: {
          bid_id?: string
          compliance_snapshot?: Json
          decided_at?: string
          decision?: string
          decision_hash?: string
          id?: string
          justification?: string
          officer_id?: string
          run_id?: string
          vendor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "final_decisions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_decisions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "compliance_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      government_access_requests: {
        Row: {
          created_at: string
          designation: string
          employee_official_id: string
          id: string
          ministry_department: string
          office_location: string
          official_email: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          designation: string
          employee_official_id: string
          id?: string
          ministry_department: string
          office_location: string
          official_email: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          designation?: string
          employee_official_id?: string
          id?: string
          ministry_department?: string
          office_location?: string
          official_email?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      human_review_cases: {
        Row: {
          assigned_to: string | null
          bid_id: string | null
          created_at: string
          id: string
          justification: string | null
          priority: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          run_id: string
          status: string
          tender_id: string | null
          trigger_reason: string
          updated_at: string
          vendor_user_id: string
        }
        Insert: {
          assigned_to?: string | null
          bid_id?: string | null
          created_at?: string
          id?: string
          justification?: string | null
          priority: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id: string
          status?: string
          tender_id?: string | null
          trigger_reason: string
          updated_at?: string
          vendor_user_id: string
        }
        Update: {
          assigned_to?: string | null
          bid_id?: string | null
          created_at?: string
          id?: string
          justification?: string | null
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string
          status?: string
          tender_id?: string | null
          trigger_reason?: string
          updated_at?: string
          vendor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "human_review_cases_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "human_review_cases_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: true
            referencedRelation: "compliance_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "human_review_cases_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          approval_status: string
          avatar_url: string | null
          created_at: string
          density: string
          department_id: string | null
          designation: string | null
          email: string | null
          employee_official_id: string | null
          full_name: string | null
          id: string
          is_active: boolean
          language: string
          ministry_department: string | null
          notification_prefs: Json
          office_location: string | null
          organisation: string | null
          phone: string | null
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          account_type?: string
          approval_status?: string
          avatar_url?: string | null
          created_at?: string
          density?: string
          department_id?: string | null
          designation?: string | null
          email?: string | null
          employee_official_id?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          language?: string
          ministry_department?: string | null
          notification_prefs?: Json
          office_location?: string | null
          organisation?: string | null
          phone?: string | null
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          approval_status?: string
          avatar_url?: string | null
          created_at?: string
          density?: string
          department_id?: string | null
          designation?: string | null
          email?: string | null
          employee_official_id?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          language?: string
          ministry_department?: string | null
          notification_prefs?: Json
          office_location?: string | null
          organisation?: string | null
          phone?: string | null
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_tenders: {
        Row: {
          created_at: string
          tender_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          tender_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          tender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_tenders_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_documents: {
        Row: {
          created_at: string
          file_path: string
          id: string
          mime_type: string | null
          name: string
          sha256: string | null
          size_bytes: number | null
          tender_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          mime_type?: string | null
          name: string
          sha256?: string | null
          size_bytes?: number | null
          tender_id: string
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          name?: string
          sha256?: string | null
          size_bytes?: number | null
          tender_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_documents_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          category: string | null
          closing_at: string | null
          created_at: string
          created_by: string
          department: string | null
          description: string | null
          details: Json
          eligibility: string | null
          emd_amount: number | null
          estimated_value: number | null
          id: string
          location: string | null
          published_at: string | null
          reference_no: string
          source_fetched_at: string | null
          source_org: string | null
          source_record: Json | null
          source_resource_id: string | null
          source_sha256: string | null
          source_title: string | null
          source_type: string
          source_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          closing_at?: string | null
          created_at?: string
          created_by?: string
          department?: string | null
          description?: string | null
          details?: Json
          eligibility?: string | null
          emd_amount?: number | null
          estimated_value?: number | null
          id?: string
          location?: string | null
          published_at?: string | null
          reference_no: string
          source_fetched_at?: string | null
          source_org?: string | null
          source_record?: Json | null
          source_resource_id?: string | null
          source_sha256?: string | null
          source_title?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          closing_at?: string | null
          created_at?: string
          created_by?: string
          department?: string | null
          description?: string | null
          details?: Json
          eligibility?: string | null
          emd_amount?: number | null
          estimated_value?: number | null
          id?: string
          location?: string | null
          published_at?: string | null
          reference_no?: string
          source_fetched_at?: string | null
          source_org?: string | null
          source_record?: Json | null
          source_resource_id?: string | null
          source_sha256?: string | null
          source_title?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          gstin: string | null
          id: string
          legal_name: string
          mobile_number: string | null
          onboarding_status: string
          owner_id: string | null
          pan: string | null
          pincode: string | null
          state: string | null
          trade_name: string | null
          udyam_number: string | null
          updated_at: string
          verification_notes: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          legal_name: string
          mobile_number?: string | null
          onboarding_status?: string
          owner_id?: string | null
          pan?: string | null
          pincode?: string | null
          state?: string | null
          trade_name?: string | null
          udyam_number?: string | null
          updated_at?: string
          verification_notes?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          legal_name?: string
          mobile_number?: string | null
          onboarding_status?: string
          owner_id?: string | null
          pan?: string | null
          pincode?: string | null
          state?: string | null
          trade_name?: string | null
          udyam_number?: string | null
          updated_at?: string
          verification_notes?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_government_access: {
        Args: { _approve: boolean; _notes?: string; _request_id: string }
        Returns: undefined
      }
      finalize_bid_decision: {
        Args: {
          _bid_id: string
          _decision: string
          _justification: string
          _run_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_officer: { Args: { _user_id: string }; Returns: boolean }
      publish_compliance_rule_version: {
        Args: { _justification: string; _version_id: string }
        Returns: undefined
      }
      record_human_review_action: {
        Args: {
          _action: string
          _assignee?: string
          _case_id: string
          _justification?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "procurement_officer" | "reviewer" | "vendor"
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
      app_role: ["admin", "procurement_officer", "reviewer", "vendor"],
    },
  },
} as const
