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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      academic_year: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_current: boolean
          name: string
          school_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_current?: boolean
          name: string
          school_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_current?: boolean
          name?: string
          school_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_year_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_auth_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          school_id: string | null
        }
        Insert: {
          action: string
          actor_auth_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          school_id?: string | null
        }
        Update: {
          action?: string
          actor_auth_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      campus: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campus_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      class: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      class_subject: {
        Row: {
          class_id: string
          subject_id: string
        }
        Insert: {
          class_id: string
          subject_id: string
        }
        Update: {
          class_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_subject_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subject_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject"
            referencedColumns: ["id"]
          },
        ]
      }
      department: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      designation: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "designation_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      document: {
        Row: {
          category: string
          created_at: string
          id: string
          mime_type: string
          owner_id: string
          owner_type: string
          school_id: string
          size_bytes: number
          storage_path: string
          uploaded_by_auth_user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          mime_type: string
          owner_id: string
          owner_type: string
          school_id: string
          size_bytes: number
          storage_path: string
          uploaded_by_auth_user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          mime_type?: string
          owner_id?: string
          owner_type?: string
          school_id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by_auth_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment: {
        Row: {
          academic_year_id: string
          class_id: string
          created_at: string
          id: string
          roll_number: string | null
          school_id: string
          section_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          class_id: string
          created_at?: string
          id?: string
          roll_number?: string | null
          school_id: string
          section_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          class_id?: string
          created_at?: string
          id?: string
          roll_number?: string | null
          school_id?: string
          section_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "section"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian: {
        Row: {
          created_at: string
          created_by_import_batch_id: string | null
          first_name: string
          id: string
          last_name: string | null
          occupation: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_import_batch_id?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          occupation?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_import_batch_id?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          occupation?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_created_by_import_batch_id_fkey"
            columns: ["created_by_import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      house: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batch: {
        Row: {
          committed_at: string | null
          created_at: string
          created_count: number
          entity_type: string
          file_name: string
          id: string
          is_dry_run: boolean
          match_mode: string
          rejected_count: number
          reverted_at: string | null
          reverted_by_auth_user_id: string | null
          school_id: string
          status: string
          total_rows: number
          updated_count: number
          uploaded_by_auth_user_id: string
        }
        Insert: {
          committed_at?: string | null
          created_at?: string
          created_count?: number
          entity_type: string
          file_name: string
          id?: string
          is_dry_run?: boolean
          match_mode: string
          rejected_count?: number
          reverted_at?: string | null
          reverted_by_auth_user_id?: string | null
          school_id: string
          status?: string
          total_rows?: number
          updated_count?: number
          uploaded_by_auth_user_id: string
        }
        Update: {
          committed_at?: string | null
          created_at?: string
          created_count?: number
          entity_type?: string
          file_name?: string
          id?: string
          is_dry_run?: boolean
          match_mode?: string
          rejected_count?: number
          reverted_at?: string | null
          reverted_by_auth_user_id?: string | null
          school_id?: string
          status?: string
          total_rows?: number
          updated_count?: number
          uploaded_by_auth_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batch_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      import_revert_dependent_registry: {
        Row: {
          blocks_revert: boolean | null
          dependent_table: string
          entity_table: string
          fk_column: string
          has_real_fk: boolean
          note: string
          special_cased: boolean
        }
        Insert: {
          blocks_revert?: boolean | null
          dependent_table: string
          entity_table: string
          fk_column: string
          has_real_fk: boolean
          note: string
          special_cased?: boolean
        }
        Update: {
          blocks_revert?: boolean | null
          dependent_table?: string
          entity_table?: string
          fk_column?: string
          has_real_fk?: boolean
          note?: string
          special_cased?: boolean
        }
        Relationships: []
      }
      import_row: {
        Row: {
          action: string | null
          batch_id: string
          created_at: string
          entity_id: string | null
          id: string
          mapped_data: Json
          previous_data: Json | null
          raw_data: Json
          rejection_reason: string | null
          row_number: number
          validation_status: string
        }
        Insert: {
          action?: string | null
          batch_id: string
          created_at?: string
          entity_id?: string | null
          id?: string
          mapped_data: Json
          previous_data?: Json | null
          raw_data: Json
          rejection_reason?: string | null
          row_number: number
          validation_status?: string
        }
        Update: {
          action?: string | null
          batch_id?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          mapped_data?: Json
          previous_data?: Json | null
          raw_data?: Json
          rejection_reason?: string | null
          row_number?: number
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_row_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
        ]
      }
      permission: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      platform_admin: {
        Row: {
          auth_user_id: string
          granted_at: string
        }
        Insert: {
          auth_user_id: string
          granted_at?: string
        }
        Update: {
          auth_user_id?: string
          granted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admin_auth_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: true
            referencedRelation: "user_profile"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      role: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
          phase: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
          phase: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
          phase?: string
        }
        Relationships: []
      }
      role_permission: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permission_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permission_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
        ]
      }
      school: {
        Row: {
          address: string | null
          board: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          legal_name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          board?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          legal_name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          board?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          legal_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_branding: {
        Row: {
          brand_color_hex: string
          brand_ramp: Json | null
          created_at: string
          display_name: string
          logo_url: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          brand_color_hex: string
          brand_ramp?: Json | null
          created_at?: string
          display_name: string
          logo_url?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          brand_color_hex?: string
          brand_ramp?: Json | null
          created_at?: string
          display_name?: string
          logo_url?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_branding_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      school_member: {
        Row: {
          auth_user_id: string
          campus_id: string | null
          created_at: string
          id: string
          is_active: boolean
          school_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          campus_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          school_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          campus_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_member_auth_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "school_member_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_member_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      school_member_role: {
        Row: {
          granted_at: string
          role_id: string
          school_member_id: string
        }
        Insert: {
          granted_at?: string
          role_id: string
          school_member_id: string
        }
        Update: {
          granted_at?: string
          role_id?: string
          school_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_member_role_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_member_role_school_member_id_fkey"
            columns: ["school_member_id"]
            isOneToOne: false
            referencedRelation: "school_member"
            referencedColumns: ["id"]
          },
        ]
      }
      school_module_flag: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module_key: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_key: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_key?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_module_flag_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      school_number_sequence: {
        Row: {
          next_value: number
          padding: number
          prefix: string
          school_id: string
          sequence_key: string
        }
        Insert: {
          next_value?: number
          padding?: number
          prefix?: string
          school_id: string
          sequence_key: string
        }
        Update: {
          next_value?: number
          padding?: number
          prefix?: string
          school_id?: string
          sequence_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_number_sequence_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      section: {
        Row: {
          class_id: string
          class_teacher_staff_id: string | null
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          class_teacher_staff_id?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          class_teacher_staff_id?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_class_teacher_staff_id_fkey"
            columns: ["class_teacher_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          created_by_import_batch_id: string | null
          department_id: string | null
          designation_id: string | null
          dob: string | null
          email: string | null
          employee_code: string
          employment_status: string
          first_name: string
          gender: string | null
          id: string
          joining_date: string
          last_name: string
          phone: string | null
          school_id: string
          school_member_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_import_batch_id?: string | null
          department_id?: string | null
          designation_id?: string | null
          dob?: string | null
          email?: string | null
          employee_code: string
          employment_status?: string
          first_name: string
          gender?: string | null
          id?: string
          joining_date: string
          last_name: string
          phone?: string | null
          school_id: string
          school_member_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_import_batch_id?: string | null
          department_id?: string | null
          designation_id?: string | null
          dob?: string | null
          email?: string | null
          employee_code?: string
          employment_status?: string
          first_name?: string
          gender?: string | null
          id?: string
          joining_date?: string
          last_name?: string
          phone?: string | null
          school_id?: string
          school_member_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_created_by_import_batch_id_fkey"
            columns: ["created_by_import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_school_member_id_fkey"
            columns: ["school_member_id"]
            isOneToOne: false
            referencedRelation: "school_member"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_class_subject: {
        Row: {
          academic_year_id: string
          class_id: string
          created_at: string
          id: string
          school_id: string
          section_id: string
          staff_id: string
          subject_id: string
        }
        Insert: {
          academic_year_id: string
          class_id: string
          created_at?: string
          id?: string
          school_id: string
          section_id: string
          staff_id: string
          subject_id: string
        }
        Update: {
          academic_year_id?: string
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string
          section_id?: string
          staff_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_class_subject_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_class_subject_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_class_subject_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_class_subject_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "section"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_class_subject_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_class_subject_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_qualification: {
        Row: {
          created_at: string
          degree: string
          id: string
          institution: string | null
          school_id: string
          staff_id: string
          year_completed: number | null
        }
        Insert: {
          created_at?: string
          degree: string
          id?: string
          institution?: string | null
          school_id: string
          staff_id: string
          year_completed?: number | null
        }
        Update: {
          created_at?: string
          degree?: string
          id?: string
          institution?: string | null
          school_id?: string
          staff_id?: string
          year_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_qualification_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_qualification_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      student: {
        Row: {
          admission_number: string
          blood_group: string | null
          category_id: string | null
          created_at: string
          created_by_import_batch_id: string | null
          dob: string | null
          first_name: string
          gender: string | null
          house_id: string | null
          id: string
          last_name: string
          previous_school_details: Json | null
          previous_school_name: string | null
          school_id: string
          status: string
          status_since: string
          updated_at: string
        }
        Insert: {
          admission_number: string
          blood_group?: string | null
          category_id?: string | null
          created_at?: string
          created_by_import_batch_id?: string | null
          dob?: string | null
          first_name: string
          gender?: string | null
          house_id?: string | null
          id?: string
          last_name: string
          previous_school_details?: Json | null
          previous_school_name?: string | null
          school_id: string
          status?: string
          status_since?: string
          updated_at?: string
        }
        Update: {
          admission_number?: string
          blood_group?: string | null
          category_id?: string | null
          created_at?: string
          created_by_import_batch_id?: string | null
          dob?: string | null
          first_name?: string
          gender?: string | null
          house_id?: string | null
          id?: string
          last_name?: string
          previous_school_details?: Json | null
          previous_school_name?: string | null
          school_id?: string
          status?: string
          status_since?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "student_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_created_by_import_batch_id_fkey"
            columns: ["created_by_import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "house"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      student_category: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_category_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      student_directory_saved_view: {
        Row: {
          created_at: string
          created_by_auth_user_id: string
          filters: Json
          id: string
          is_shared: boolean
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          created_by_auth_user_id: string
          filters?: Json
          id?: string
          is_shared?: boolean
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          created_by_auth_user_id?: string
          filters?: Json
          id?: string
          is_shared?: boolean
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_directory_saved_view_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardian: {
        Row: {
          created_at: string
          email: string | null
          guardian_id: string
          is_primary_contact: boolean
          phone: string | null
          relationship_type: string
          school_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          guardian_id: string
          is_primary_contact?: boolean
          phone?: string | null
          relationship_type: string
          school_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          guardian_id?: string
          is_primary_contact?: boolean
          phone?: string | null
          relationship_type?: string
          school_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardian_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardian"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardian_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardian_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      subject: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile: {
        Row: {
          auth_user_id: string
          created_at: string
          display_name: string
          email: string | null
          phone: string
          theme_preference: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          display_name: string
          email?: string | null
          phone: string
          theme_preference?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          display_name?: string
          email?: string | null
          phone?: string
          theme_preference?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_roles: { Args: never; Returns: string[] }
      current_school_id: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      fn_commit_import_batch: {
        Args: {
          p_actor_auth_user_id: string
          p_batch_id: string
          p_limit?: number
        }
        Returns: Json
      }
      fn_commit_staff_import_rows: {
        Args: {
          p_actor_auth_user_id: string
          p_batch_id: string
          p_limit: number
          p_school_id: string
        }
        Returns: undefined
      }
      fn_commit_student_import_rows: {
        Args: {
          p_actor_auth_user_id: string
          p_batch_id: string
          p_limit: number
          p_school_id: string
        }
        Returns: undefined
      }
      fn_has_permission: {
        Args: { perm_key: string; role_keys: string[] }
        Returns: boolean
      }
      fn_list_fk_dependents: {
        Args: { p_target_tables: string[] }
        Returns: {
          dependent_table: string
          entity_table: string
          fk_column: string
        }[]
      }
      fn_next_school_number: {
        Args: { p_school_id: string; p_sequence_key: string }
        Returns: string
      }
      fn_purge_expired_import_snapshots: { Args: never; Returns: undefined }
      fn_reserve_school_numbers: {
        Args: { p_count: number; p_school_id: string; p_sequence_key: string }
        Returns: {
          padding: number
          prefix: string
          start_value: number
        }[]
      }
      fn_revert_import_batch: {
        Args: { p_actor_auth_user_id: string; p_batch_id: string }
        Returns: Json
      }
      fn_role_permissions: {
        Args: { role_keys: string[] }
        Returns: {
          permission_key: string
        }[]
      }
      fn_validate_import_batch: {
        Args: { p_batch_id: string }
        Returns: undefined
      }
      fn_validate_staff_import_rows: {
        Args: { p_batch_id: string; p_match_mode: string; p_school_id: string }
        Returns: undefined
      }
      fn_validate_student_import_rows: {
        Args: { p_batch_id: string; p_match_mode: string; p_school_id: string }
        Returns: undefined
      }
      is_super_admin: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
