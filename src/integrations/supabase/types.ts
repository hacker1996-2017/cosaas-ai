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
          id: string
          industry: string | null
          lifetime_value: number | null
          metadata: Json | null
          mrr: number | null
          name: string
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
          id?: string
          industry?: string | null
          lifetime_value?: number | null
          metadata?: Json | null
          mrr?: number | null
          name: string
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
          id?: string
          industry?: string | null
          lifetime_value?: number | null
          metadata?: Json | null
          mrr?: number | null
          name?: string
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
      organizations: {
        Row: {
          autonomy_level: Database["public"]["Enums"]["autonomy_level"] | null
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          market: string | null
          name: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          autonomy_level?: Database["public"]["Enums"]["autonomy_level"] | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          market?: string | null
          name: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          autonomy_level?: Database["public"]["Enums"]["autonomy_level"] | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          market?: string | null
          name?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
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
    }
    Enums: {
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
      integration_status: "connected" | "disconnected" | "error" | "pending"
      risk_level: "low" | "medium" | "high" | "critical"
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
      integration_status: ["connected", "disconnected", "error", "pending"],
      risk_level: ["low", "medium", "high", "critical"],
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
