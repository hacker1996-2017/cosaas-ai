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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      action_pipeline: {
        Row: {
          action_description: string
          action_params: Json
          action_type: string
          agent_id: string | null
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["action_category"]
          command_id: string | null
          created_at: string
          created_by: string
          dispatched_at: string | null
          error_message: string | null
          evidence: Json | null
          execution_completed_at: string | null
          execution_result: Json | null
          execution_started_at: string | null
          id: string
          idempotency_key: string | null
          max_retries: number
          organization_id: string
          policy_evaluated_at: string | null
          policy_result: Json | null
          requires_approval: boolean
          retry_count: number
          risk_level: Database["public"]["Enums"]["risk_level"]
          status: Database["public"]["Enums"]["action_status"]
          updated_at: string
        }
        Insert: {
          action_description: string
          action_params?: Json
          action_type: string
          agent_id?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["action_category"]
          command_id?: string | null
          created_at?: string
          created_by: string
          dispatched_at?: string | null
          error_message?: string | null
          evidence?: Json | null
          execution_completed_at?: string | null
          execution_result?: Json | null
          execution_started_at?: string | null
          id?: string
          idempotency_key?: string | null
          max_retries?: number
          organization_id: string
          policy_evaluated_at?: string | null
          policy_result?: Json | null
          requires_approval?: boolean
          retry_count?: number
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["action_status"]
          updated_at?: string
        }
        Update: {
          action_description?: string
          action_params?: Json
          action_type?: string
          agent_id?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["action_category"]
          command_id?: string | null
          created_at?: string
          created_by?: string
          dispatched_at?: string | null
          error_message?: string | null
          evidence?: Json | null
          execution_completed_at?: string | null
          execution_result?: Json | null
          execution_started_at?: string | null
          id?: string
          idempotency_key?: string | null
          max_retries?: number
          organization_id?: string
          policy_evaluated_at?: string | null
          policy_result?: Json | null
          requires_approval?: boolean
          retry_count?: number
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["action_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_pipeline_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_pipeline_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "commands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_pipeline_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_instructions: {
        Row: {
          agent_id: string
          constraints: Json | null
          created_at: string
          deliverables: string[] | null
          id: string
          instructions: string
          is_active: boolean | null
          organization_id: string
          priority: number | null
          triggers: Json | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          constraints?: Json | null
          created_at?: string
          deliverables?: string[] | null
          id?: string
          instructions: string
          is_active?: boolean | null
          organization_id: string
          priority?: number | null
          triggers?: Json | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          constraints?: Json | null
          created_at?: string
          deliverables?: string[] | null
          id?: string
          instructions?: string
          is_active?: boolean | null
          organization_id?: string
          priority?: number | null
          triggers?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_instructions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_instructions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          active_tasks: number | null
          config: Json | null
          created_at: string
          description: string | null
          emoji: string
          id: string
          is_system_agent: boolean | null
          max_capacity: number | null
          name: string
          organization_id: string
          quota_max: number | null
          quota_used: number | null
          role: string
          status: Database["public"]["Enums"]["agent_status"] | null
          updated_at: string
        }
        Insert: {
          active_tasks?: number | null
          config?: Json | null
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          is_system_agent?: boolean | null
          max_capacity?: number | null
          name: string
          organization_id: string
          quota_max?: number | null
          quota_used?: number | null
          role: string
          status?: Database["public"]["Enums"]["agent_status"] | null
          updated_at?: string
        }
        Update: {
          active_tasks?: number | null
          config?: Json | null
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          is_system_agent?: boolean | null
          max_capacity?: number | null
          name?: string
          organization_id?: string
          quota_max?: number | null
          quota_used?: number | null
          role?: string
          status?: Database["public"]["Enums"]["agent_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          details: Json
          event_hash: string
          event_type: string
          id: string
          ip_address: unknown
          organization_id: string
          previous_hash: string | null
          resource_id: string | null
          resource_type: string
          sequence_number: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          details?: Json
          event_hash: string
          event_type: string
          id?: string
          ip_address?: unknown
          organization_id: string
          previous_hash?: string | null
          resource_id?: string | null
          resource_type: string
          sequence_number: number
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          details?: Json
          event_hash?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          organization_id?: string
          previous_hash?: string | null
          resource_id?: string | null
          resource_type?: string
          sequence_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          action_items: Json | null
          agent_id: string | null
          callee_number: string
          caller_number: string | null
          client_id: string | null
          command_id: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          organization_id: string
          recording_url: string | null
          scheduled_at: string | null
          sentiment_score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["call_status"] | null
          summary: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          agent_id?: string | null
          callee_number: string
          caller_number?: string | null
          client_id?: string | null
          command_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          recording_url?: string | null
          scheduled_at?: string | null
          sentiment_score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["call_status"] | null
          summary?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          agent_id?: string | null
          callee_number?: string
          caller_number?: string | null
          client_id?: string | null
          command_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          recording_url?: string | null
          scheduled_at?: string | null
          sentiment_score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["call_status"] | null
          summary?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "commands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_memory_log: {
        Row: {
          agent_id: string | null
          client_id: string
          content: string
          context: Json | null
          created_at: string
          id: string
          importance_score: number | null
          memory_type: string
          organization_id: string
          sentiment_score: number | null
        }
        Insert: {
          agent_id?: string | null
          client_id: string
          content: string
          context?: Json | null
          created_at?: string
          id?: string
          importance_score?: number | null
          memory_type?: string
          organization_id: string
          sentiment_score?: number | null
        }
        Update: {
          agent_id?: string | null
          client_id?: string
          content?: string
          context?: Json | null
          created_at?: string
          id?: string
          importance_score?: number | null
          memory_type?: string
          organization_id?: string
          sentiment_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_memory_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_memory_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_memory_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean
          note_type: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          note_type?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          note_type?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          assigned_to: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assigned_agent_id: string | null
          client_type: Database["public"]["Enums"]["client_type"] | null
          company: string | null
          created_at: string
          email: string | null
          expansion_opportunity:
            | Database["public"]["Enums"]["risk_level"]
            | null
          health_score: number | null
          id: string
          industry: string | null
          last_contact_at: string | null
          lifetime_value: number | null
          metadata: Json | null
          mrr: number | null
          name: string
          next_follow_up: string | null
          organization_id: string
          phone: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          risk_of_churn: Database["public"]["Enums"]["risk_level"] | null
          status: Database["public"]["Enums"]["client_status"] | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company?: string | null
          created_at?: string
          email?: string | null
          expansion_opportunity?:
            | Database["public"]["Enums"]["risk_level"]
            | null
          health_score?: number | null
          id?: string
          industry?: string | null
          last_contact_at?: string | null
          lifetime_value?: number | null
          metadata?: Json | null
          mrr?: number | null
          name: string
          next_follow_up?: string | null
          organization_id: string
          phone?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          risk_of_churn?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["client_status"] | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company?: string | null
          created_at?: string
          email?: string | null
          expansion_opportunity?:
            | Database["public"]["Enums"]["risk_level"]
            | null
          health_score?: number | null
          id?: string
          industry?: string | null
          last_contact_at?: string | null
          lifetime_value?: number | null
          metadata?: Json | null
          mrr?: number | null
          name?: string
          next_follow_up?: string | null
          organization_id?: string
          phone?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          risk_of_churn?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["client_status"] | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      command_executions: {
        Row: {
          action_description: string | null
          action_type: string
          agent_id: string | null
          command_id: string
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["command_status"] | null
          step_number: number
        }
        Insert: {
          action_description?: string | null
          action_type: string
          agent_id?: string | null
          command_id: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["command_status"] | null
          step_number: number
        }
        Update: {
          action_description?: string | null
          action_type?: string
          agent_id?: string | null
          command_id?: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["command_status"] | null
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "command_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "command_executions_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "commands"
            referencedColumns: ["id"]
          },
        ]
      }
      commands: {
        Row: {
          actual_duration_ms: number | null
          agent_id: string | null
          command_text: string
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          error_message: string | null
          estimated_duration_ms: number | null
          id: string
          organization_id: string
          parent_command_id: string | null
          parsed_intent: Json | null
          priority: number | null
          result: Json | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          started_at: string | null
          status: Database["public"]["Enums"]["command_status"] | null
          user_id: string
        }
        Insert: {
          actual_duration_ms?: number | null
          agent_id?: string | null
          command_text: string
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          estimated_duration_ms?: number | null
          id?: string
          organization_id: string
          parent_command_id?: string | null
          parsed_intent?: Json | null
          priority?: number | null
          result?: Json | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["command_status"] | null
          user_id: string
        }
        Update: {
          actual_duration_ms?: number | null
          agent_id?: string | null
          command_text?: string
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          estimated_duration_ms?: number | null
          id?: string
          organization_id?: string
          parent_command_id?: string | null
          parsed_intent?: Json | null
          priority?: number | null
          result?: Json | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["command_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commands_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commands_parent_command_id_fkey"
            columns: ["parent_command_id"]
            isOneToOne: false
            referencedRelation: "commands"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          created_at: string
          expected_amount: number
          id: string
          insurance_policy_id: string
          insurer_id: string
          metadata: Json
          organization_id: string
          rate: number
          received_amount: number | null
          received_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_amount?: number
          id?: string
          insurance_policy_id: string
          insurer_id: string
          metadata?: Json
          organization_id: string
          rate: number
          received_amount?: number | null
          received_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_amount?: number
          id?: string
          insurance_policy_id?: string
          insurer_id?: string
          metadata?: Json
          organization_id?: string
          rate?: number
          received_amount?: number | null
          received_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          agent_id: string | null
          auto_approved: boolean | null
          command_id: string | null
          confidence_score: number | null
          created_at: string
          deadline: string | null
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          description: string | null
          financial_impact: string | null
          id: string
          impact_if_approved: string | null
          impact_if_rejected: string | null
          organization_id: string
          reasoning: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          status: Database["public"]["Enums"]["decision_status"] | null
          title: string
        }
        Insert: {
          agent_id?: string | null
          auto_approved?: boolean | null
          command_id?: string | null
          confidence_score?: number | null
          created_at?: string
          deadline?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          description?: string | null
          financial_impact?: string | null
          id?: string
          impact_if_approved?: string | null
          impact_if_rejected?: string | null
          organization_id: string
          reasoning?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["decision_status"] | null
          title: string
        }
        Update: {
          agent_id?: string | null
          auto_approved?: boolean | null
          command_id?: string | null
          confidence_score?: number | null
          created_at?: string
          deadline?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          description?: string | null
          financial_impact?: string | null
          id?: string
          impact_if_approved?: string | null
          impact_if_rejected?: string | null
          organization_id?: string
          reasoning?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["decision_status"] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "commands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          agent_id: string | null
          created_at: string
          extracted_text: string | null
          file_size: number | null
          file_type: Database["public"]["Enums"]["document_type"] | null
          id: string
          metadata: Json | null
          mime_type: string | null
          name: string
          organization_id: string
          processed_at: string | null
          storage_path: string
          summary: string | null
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          extracted_text?: string | null
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["document_type"] | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name: string
          organization_id: string
          processed_at?: string | null
          storage_path: string
          summary?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          extracted_text?: string | null
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["document_type"] | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          organization_id?: string
          processed_at?: string | null
          storage_path?: string
          summary?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          agent_id: string | null
          bcc_addresses: string[] | null
          body_html: string | null
          body_text: string | null
          cc_addresses: string[] | null
          clicked_at: string | null
          client_id: string | null
          command_id: string | null
          created_at: string
          external_id: string | null
          from_address: string
          id: string
          metadata: Json | null
          opened_at: string | null
          organization_id: string
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"] | null
          subject: string
          thread_id: string | null
          to_addresses: string[]
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          bcc_addresses?: string[] | null
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: string[] | null
          clicked_at?: string | null
          client_id?: string | null
          command_id?: string | null
          created_at?: string
          external_id?: string | null
          from_address: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          organization_id: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"] | null
          subject: string
          thread_id?: string | null
          to_addresses: string[]
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          bcc_addresses?: string[] | null
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: string[] | null
          clicked_at?: string | null
          client_id?: string | null
          command_id?: string | null
          created_at?: string
          external_id?: string | null
          from_address?: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          organization_id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"] | null
          subject?: string
          thread_id?: string | null
          to_addresses?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "commands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_kits: {
        Row: {
          created_at: string
          id: string
          industry_key: string
          installed_at: string
          installed_by: string | null
          kit_config: Json
          name: string
          organization_id: string
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry_key: string
          installed_at?: string
          installed_by?: string | null
          kit_config?: Json
          name: string
          organization_id: string
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          id?: string
          industry_key?: string
          installed_at?: string
          installed_by?: string | null
          kit_config?: Json
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_kits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          client_id: string
          commission_amount: number | null
          commission_rate: number | null
          coverage_details: Json
          created_at: string
          effective_date: string | null
          expiry_date: string | null
          id: string
          insurer_id: string | null
          metadata: Json
          organization_id: string
          policy_number: string
          policy_type: string
          premium_amount: number
          status: Database["public"]["Enums"]["insurance_policy_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          commission_amount?: number | null
          commission_rate?: number | null
          coverage_details?: Json
          created_at?: string
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          insurer_id?: string | null
          metadata?: Json
          organization_id: string
          policy_number: string
          policy_type: string
          premium_amount?: number
          status?: Database["public"]["Enums"]["insurance_policy_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          commission_amount?: number | null
          commission_rate?: number | null
          coverage_details?: Json
          created_at?: string
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          insurer_id?: string | null
          metadata?: Json
          organization_id?: string
          policy_number?: string
          policy_type?: string
          premium_amount?: number
          status?: Database["public"]["Enums"]["insurance_policy_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      insurers: {
        Row: {
          code: string | null
          commission_rate_default: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          commission_rate_default?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          commission_rate_default?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json | null
          created_at: string
          credentials_encrypted: string | null
          error_message: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          organization_id: string
          service_name: string
          service_type: string
          status: Database["public"]["Enums"]["integration_status"] | null
          sync_errors: number | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          credentials_encrypted?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          organization_id: string
          service_name: string
          service_type: string
          status?: Database["public"]["Enums"]["integration_status"] | null
          sync_errors?: number | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          credentials_encrypted?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          organization_id?: string
          service_name?: string
          service_type?: string
          status?: Database["public"]["Enums"]["integration_status"] | null
          sync_errors?: number | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          action_pipeline_id: string | null
          agent_id: string | null
          ai_auto_responded: boolean | null
          ai_classification: string | null
          ai_confidence: number | null
          channel: string
          client_id: string | null
          content: string
          created_at: string
          id: string
          is_internal: boolean
          is_read: boolean
          metadata: Json | null
          organization_id: string
          risk_level: string | null
          sender_email: string | null
          sender_name: string | null
          sender_type: string
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          action_pipeline_id?: string | null
          agent_id?: string | null
          ai_auto_responded?: boolean | null
          ai_classification?: string | null
          ai_confidence?: number | null
          channel?: string
          client_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          is_read?: boolean
          metadata?: Json | null
          organization_id: string
          risk_level?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sender_type?: string
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          action_pipeline_id?: string | null
          agent_id?: string | null
          ai_auto_responded?: boolean | null
          ai_classification?: string | null
          ai_confidence?: number | null
          channel?: string
          client_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          is_read?: boolean
          metadata?: Json | null
          organization_id?: string
          risk_level?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sender_type?: string
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_action_pipeline_id_fkey"
            columns: ["action_pipeline_id"]
            isOneToOne: false
            referencedRelation: "action_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          agent_id: string | null
          body: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string
          dismissed_at: string | null
          expires_at: string | null
          icon: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          metadata: Json | null
          organization_id: string
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          source_id: string | null
          source_type: string
          title: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          agent_id?: string | null
          body?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          dismissed_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          metadata?: Json | null
          organization_id: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          source_id?: string | null
          source_type?: string
          title: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          agent_id?: string | null
          body?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          dismissed_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          metadata?: Json | null
          organization_id?: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          source_id?: string | null
          source_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          actions_this_hour: number
          autonomy_level: Database["public"]["Enums"]["autonomy_level"] | null
          created_at: string
          hour_reset_at: string
          id: string
          industry: string | null
          kill_switch_active: boolean
          logo_url: string | null
          market: string | null
          max_actions_per_hour: number
          max_concurrent_actions: number
          name: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          actions_this_hour?: number
          autonomy_level?: Database["public"]["Enums"]["autonomy_level"] | null
          created_at?: string
          hour_reset_at?: string
          id?: string
          industry?: string | null
          kill_switch_active?: boolean
          logo_url?: string | null
          market?: string | null
          max_actions_per_hour?: number
          max_concurrent_actions?: number
          name: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          actions_this_hour?: number
          autonomy_level?: Database["public"]["Enums"]["autonomy_level"] | null
          created_at?: string
          hour_reset_at?: string
          id?: string
          industry?: string | null
          kill_switch_active?: boolean
          logo_url?: string | null
          market?: string | null
          max_actions_per_hour?: number
          max_concurrent_actions?: number
          name?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      policy_rules: {
        Row: {
          action: string
          category: Database["public"]["Enums"]["action_category"]
          condition: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          priority: number
          risk_level: Database["public"]["Enums"]["risk_level"]
          scope: string
          updated_at: string
        }
        Insert: {
          action?: string
          category: Database["public"]["Enums"]["action_category"]
          condition: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          priority?: number
          risk_level?: Database["public"]["Enums"]["risk_level"]
          scope?: string
          updated_at?: string
        }
        Update: {
          action?: string
          category?: Database["public"]["Enums"]["action_category"]
          condition?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          priority?: number
          risk_level?: Database["public"]["Enums"]["risk_level"]
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      premiums: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          due_date: string
          id: string
          insurance_policy_id: string
          metadata: Json
          organization_id: string
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["premium_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          due_date: string
          id?: string
          insurance_policy_id: string
          metadata?: Json
          organization_id: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["premium_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          due_date?: string
          id?: string
          insurance_policy_id?: string
          metadata?: Json
          organization_id?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["premium_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "premiums_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premiums_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premiums_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_active_at: string | null
          organization_id: string | null
          phone: string | null
          preferences: Json | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_active_at?: string | null
          organization_id?: string | null
          phone?: string | null
          preferences?: Json | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          organization_id?: string | null
          phone?: string | null
          preferences?: Json | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_batches: {
        Row: {
          batch_type: string
          completed_at: string | null
          created_at: string
          discrepancy_amount: number | null
          exception_count: number
          id: string
          initiated_by: string | null
          insurer_id: string | null
          matched_amount: number | null
          matched_count: number
          metadata: Json
          organization_id: string
          started_at: string | null
          status: string
          total_amount: number | null
          total_records: number
          updated_at: string
        }
        Insert: {
          batch_type?: string
          completed_at?: string | null
          created_at?: string
          discrepancy_amount?: number | null
          exception_count?: number
          id?: string
          initiated_by?: string | null
          insurer_id?: string | null
          matched_amount?: number | null
          matched_count?: number
          metadata?: Json
          organization_id: string
          started_at?: string | null
          status?: string
          total_amount?: number | null
          total_records?: number
          updated_at?: string
        }
        Update: {
          batch_type?: string
          completed_at?: string | null
          created_at?: string
          discrepancy_amount?: number | null
          exception_count?: number
          id?: string
          initiated_by?: string | null
          insurer_id?: string | null
          matched_amount?: number | null
          matched_count?: number
          metadata?: Json
          organization_id?: string
          started_at?: string | null
          status?: string
          total_amount?: number | null
          total_records?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_batches_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_exceptions: {
        Row: {
          actual_amount: number | null
          batch_id: string
          created_at: string
          discrepancy: number | null
          exception_type: string
          expected_amount: number | null
          id: string
          insurance_policy_id: string | null
          metadata: Json
          organization_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["reconciliation_status"]
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          batch_id: string
          created_at?: string
          discrepancy?: number | null
          exception_type: string
          expected_amount?: number | null
          id?: string
          insurance_policy_id?: string | null
          metadata?: Json
          organization_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["reconciliation_status"]
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          batch_id?: string
          created_at?: string
          discrepancy?: number | null
          exception_type?: string
          expected_amount?: number | null
          id?: string
          insurance_policy_id?: string | null
          metadata?: Json
          organization_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["reconciliation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_exceptions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_exceptions_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_executions: {
        Row: {
          action_pipeline_id: string | null
          agent_id: string | null
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          organization_id: string
          output_data: Json | null
          scheduled_task_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          action_pipeline_id?: string | null
          agent_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          organization_id: string
          output_data?: Json | null
          scheduled_task_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          action_pipeline_id?: string | null
          agent_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          organization_id?: string
          output_data?: Json | null
          scheduled_task_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_executions_action_pipeline_id_fkey"
            columns: ["action_pipeline_id"]
            isOneToOne: false
            referencedRelation: "action_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_executions_scheduled_task_id_fkey"
            columns: ["scheduled_task_id"]
            isOneToOne: false
            referencedRelation: "scheduled_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_tasks: {
        Row: {
          agent_id: string | null
          command_id: string | null
          created_at: string
          created_by: string
          cron_expression: string | null
          description: string | null
          execution_count: number
          expires_at: string | null
          frequency: Database["public"]["Enums"]["schedule_frequency"]
          id: string
          last_error: string | null
          last_execution_result: Json | null
          last_run_at: string | null
          max_retries: number
          metadata: Json | null
          name: string
          next_run_at: string | null
          organization_id: string
          priority: number
          retry_count: number
          scheduled_at: string
          status: Database["public"]["Enums"]["scheduled_task_status"]
          tags: string[] | null
          task_config: Json
          task_type: string
          timezone: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          command_id?: string | null
          created_at?: string
          created_by: string
          cron_expression?: string | null
          description?: string | null
          execution_count?: number
          expires_at?: string | null
          frequency?: Database["public"]["Enums"]["schedule_frequency"]
          id?: string
          last_error?: string | null
          last_execution_result?: Json | null
          last_run_at?: string | null
          max_retries?: number
          metadata?: Json | null
          name: string
          next_run_at?: string | null
          organization_id: string
          priority?: number
          retry_count?: number
          scheduled_at: string
          status?: Database["public"]["Enums"]["scheduled_task_status"]
          tags?: string[] | null
          task_config?: Json
          task_type?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          command_id?: string | null
          created_at?: string
          created_by?: string
          cron_expression?: string | null
          description?: string | null
          execution_count?: number
          expires_at?: string | null
          frequency?: Database["public"]["Enums"]["schedule_frequency"]
          id?: string
          last_error?: string | null
          last_execution_result?: Json | null
          last_run_at?: string | null
          max_retries?: number
          metadata?: Json | null
          name?: string
          next_run_at?: string | null
          organization_id?: string
          priority?: number
          retry_count?: number
          scheduled_at?: string
          status?: Database["public"]["Enums"]["scheduled_task_status"]
          tags?: string[] | null
          task_config?: Json
          task_type?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_tasks_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "commands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          agent_id: string | null
          color: string | null
          command_id: string | null
          confidence_score: number | null
          created_at: string
          decision_id: string | null
          description: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          icon: string | null
          id: string
          metadata: Json | null
          organization_id: string
          title: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          color?: string | null
          command_id?: string | null
          confidence_score?: number | null
          created_at?: string
          decision_id?: string | null
          description?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          icon?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          title: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          color?: string | null
          command_id?: string | null
          confidence_score?: number | null
          created_at?: string
          decision_id?: string | null
          description?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          icon?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "commands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          action_config: Json | null
          action_type: string
          agent_id: string | null
          ai_assist_available: boolean | null
          created_at: string
          description: string | null
          id: string
          max_retries: number | null
          name: string
          retry_count: number | null
          status: Database["public"]["Enums"]["workflow_step_status"] | null
          step_number: number
          timeout_seconds: number | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          agent_id?: string | null
          ai_assist_available?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          max_retries?: number | null
          name: string
          retry_count?: number | null
          status?: Database["public"]["Enums"]["workflow_step_status"] | null
          step_number: number
          timeout_seconds?: number | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          agent_id?: string | null
          ai_assist_available?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          max_retries?: number | null
          name?: string
          retry_count?: number | null
          status?: Database["public"]["Enums"]["workflow_step_status"] | null
          step_number?: number
          timeout_seconds?: number | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          is_template: boolean | null
          last_executed_at: string | null
          name: string
          organization_id: string
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          last_executed_at?: string | null
          name: string
          organization_id: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          last_executed_at?: string | null
          name?: string
          organization_id?: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_audit_hash: {
        Args: {
          p_action: string
          p_details: Json
          p_event_type: string
          p_org_id: string
          p_previous_hash: string
          p_timestamp: string
        }
        Returns: string
      }
      get_user_organization_id: { Args: { user_uuid: string }; Returns: string }
      has_org_role: {
        Args: {
          check_role: Database["public"]["Enums"]["app_role"]
          org_uuid: string
          user_uuid: string
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_org_ceo: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_org_ceo_or_admin: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      latest_audit_hash: { Args: { p_org_id: string }; Returns: string }
      next_audit_sequence: { Args: { p_org_id: string }; Returns: number }
    }
    Enums: {
      action_category:
        | "financial"
        | "communication"
        | "data_mutation"
        | "integration"
        | "scheduling"
        | "reporting"
        | "system"
      action_status:
        | "created"
        | "policy_evaluating"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "dispatched"
        | "executing"
        | "completed"
        | "failed"
        | "cancelled"
      agent_status: "available" | "busy" | "error" | "maintenance"
      app_role: "ceo" | "admin" | "user"
      autonomy_level:
        | "observe_only"
        | "recommend"
        | "draft_actions"
        | "execute_with_approval"
        | "execute_autonomous"
      call_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "missed"
        | "cancelled"
      client_status: "prospect" | "onboarding" | "active" | "paused" | "churned"
      client_type: "startup" | "smb" | "enterprise"
      command_status:
        | "queued"
        | "in_progress"
        | "completed"
        | "failed"
        | "escalated"
        | "cancelled"
      decision_status:
        | "pending"
        | "approved"
        | "rejected"
        | "modified"
        | "expired"
      document_type:
        | "pdf"
        | "docx"
        | "txt"
        | "xlsx"
        | "pptx"
        | "image"
        | "other"
      email_status: "draft" | "scheduled" | "sent" | "failed" | "bounced"
      event_type:
        | "ai_action"
        | "human_decision"
        | "kpi_milestone"
        | "external_event"
        | "escalation"
        | "integration"
        | "system"
      insurance_policy_status:
        | "draft"
        | "quoted"
        | "bound"
        | "active"
        | "expired"
        | "cancelled"
        | "lapsed"
        | "renewed"
      integration_status: "connected" | "disconnected" | "error" | "pending"
      notification_category:
        | "action_required"
        | "decision_pending"
        | "execution_complete"
        | "execution_failed"
        | "agent_alert"
        | "system"
        | "workflow"
        | "communication"
        | "security"
        | "compliance"
      notification_priority: "low" | "normal" | "high" | "critical"
      premium_status:
        | "due"
        | "paid"
        | "partial"
        | "overdue"
        | "waived"
        | "refunded"
      reconciliation_status:
        | "pending"
        | "matched"
        | "exception"
        | "resolved"
        | "escalated"
      risk_level: "low" | "medium" | "high" | "critical"
      schedule_frequency:
        | "once"
        | "hourly"
        | "daily"
        | "weekly"
        | "monthly"
        | "cron"
      scheduled_task_status:
        | "active"
        | "paused"
        | "completed"
        | "failed"
        | "expired"
      workflow_step_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "failed"
        | "skipped"
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
      action_category: [
        "financial",
        "communication",
        "data_mutation",
        "integration",
        "scheduling",
        "reporting",
        "system",
      ],
      action_status: [
        "created",
        "policy_evaluating",
        "pending_approval",
        "approved",
        "rejected",
        "dispatched",
        "executing",
        "completed",
        "failed",
        "cancelled",
      ],
      agent_status: ["available", "busy", "error", "maintenance"],
      app_role: ["ceo", "admin", "user"],
      autonomy_level: [
        "observe_only",
        "recommend",
        "draft_actions",
        "execute_with_approval",
        "execute_autonomous",
      ],
      call_status: [
        "scheduled",
        "in_progress",
        "completed",
        "missed",
        "cancelled",
      ],
      client_status: ["prospect", "onboarding", "active", "paused", "churned"],
      client_type: ["startup", "smb", "enterprise"],
      command_status: [
        "queued",
        "in_progress",
        "completed",
        "failed",
        "escalated",
        "cancelled",
      ],
      decision_status: [
        "pending",
        "approved",
        "rejected",
        "modified",
        "expired",
      ],
      document_type: ["pdf", "docx", "txt", "xlsx", "pptx", "image", "other"],
      email_status: ["draft", "scheduled", "sent", "failed", "bounced"],
      event_type: [
        "ai_action",
        "human_decision",
        "kpi_milestone",
        "external_event",
        "escalation",
        "integration",
        "system",
      ],
      insurance_policy_status: [
        "draft",
        "quoted",
        "bound",
        "active",
        "expired",
        "cancelled",
        "lapsed",
        "renewed",
      ],
      integration_status: ["connected", "disconnected", "error", "pending"],
      notification_category: [
        "action_required",
        "decision_pending",
        "execution_complete",
        "execution_failed",
        "agent_alert",
        "system",
        "workflow",
        "communication",
        "security",
        "compliance",
      ],
      notification_priority: ["low", "normal", "high", "critical"],
      premium_status: [
        "due",
        "paid",
        "partial",
        "overdue",
        "waived",
        "refunded",
      ],
      reconciliation_status: [
        "pending",
        "matched",
        "exception",
        "resolved",
        "escalated",
      ],
      risk_level: ["low", "medium", "high", "critical"],
      schedule_frequency: [
        "once",
        "hourly",
        "daily",
        "weekly",
        "monthly",
        "cron",
      ],
      scheduled_task_status: [
        "active",
        "paused",
        "completed",
        "failed",
        "expired",
      ],
      workflow_step_status: [
        "not_started",
        "in_progress",
        "completed",
        "failed",
        "skipped",
      ],
    },
  },
} as const
