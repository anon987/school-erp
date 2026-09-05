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
      admission_document_type: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          name: string
          school_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          name: string
          school_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          name?: string
          school_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_document_type_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_stage: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
          sort_order: number
          stage_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
          sort_order?: number
          stage_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          sort_order?: number
          stage_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_stage_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      admit_card_hold: {
        Row: {
          exam_id: string
          held_at: string
          held_by_auth_user_id: string | null
          reason: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          exam_id: string
          held_at?: string
          held_by_auth_user_id?: string | null
          reason?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          exam_id?: string
          held_at?: string
          held_by_auth_user_id?: string | null
          reason?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admit_card_hold_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exam"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admit_card_hold_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admit_card_hold_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      admit_card_settings: {
        Row: {
          created_at: string
          school_id: string
          template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          school_id: string
          template?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          school_id?: string
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admit_card_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      application: {
        Row: {
          academic_year_id: string
          applicant_first_name: string
          applicant_last_name: string
          category_id: string | null
          class_applying_for_id: string
          confirmed_student_id: string | null
          created_at: string
          current_stage_id: string
          dob: string | null
          enquiry_id: string | null
          gender: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          school_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          applicant_first_name: string
          applicant_last_name: string
          category_id?: string | null
          class_applying_for_id: string
          confirmed_student_id?: string | null
          created_at?: string
          current_stage_id: string
          dob?: string | null
          enquiry_id?: string | null
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          school_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          applicant_first_name?: string
          applicant_last_name?: string
          category_id?: string | null
          class_applying_for_id?: string
          confirmed_student_id?: string | null
          created_at?: string
          current_stage_id?: string
          dob?: string | null
          enquiry_id?: string | null
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "student_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_class_applying_for_id_fkey"
            columns: ["class_applying_for_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_confirmed_student_id_fkey"
            columns: ["confirmed_student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "admission_stage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      application_document: {
        Row: {
          application_id: string
          created_at: string
          document_id: string | null
          document_type_id: string
          id: string
          school_id: string
          status: string
          updated_at: string
          verified_at: string | null
          verified_by_auth_user_id: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          document_id?: string | null
          document_type_id: string
          id?: string
          school_id: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_auth_user_id?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          document_id?: string | null
          document_type_id?: string
          id?: string
          school_id?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_auth_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_document_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "application"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_document_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_document_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "admission_document_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_document_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      application_stage_event: {
        Row: {
          application_id: string
          id: string
          notes: string | null
          occurred_at: string
          recorded_by_auth_user_id: string | null
          school_id: string
          score: number | null
          stage_id: string
        }
        Insert: {
          application_id: string
          id?: string
          notes?: string | null
          occurred_at?: string
          recorded_by_auth_user_id?: string | null
          school_id: string
          score?: number | null
          stage_id: string
        }
        Update: {
          application_id?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          recorded_by_auth_user_id?: string | null
          school_id?: string
          score?: number | null
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_stage_event_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "application"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_stage_event_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_stage_event_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "admission_stage"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_record: {
        Row: {
          academic_year_id: string
          attendance_date: string
          class_id: string
          id: string
          marked_at: string
          marked_by_auth_user_id: string
          remarks: string | null
          school_id: string
          section_id: string
          status: string
          student_id: string
          updated_at: string
          updated_by_auth_user_id: string | null
        }
        Insert: {
          academic_year_id: string
          attendance_date: string
          class_id: string
          id?: string
          marked_at?: string
          marked_by_auth_user_id: string
          remarks?: string | null
          school_id: string
          section_id: string
          status: string
          student_id: string
          updated_at?: string
          updated_by_auth_user_id?: string | null
        }
        Update: {
          academic_year_id?: string
          attendance_date?: string
          class_id?: string
          id?: string
          marked_at?: string
          marked_by_auth_user_id?: string
          remarks?: string | null
          school_id?: string
          section_id?: string
          status?: string
          student_id?: string
          updated_at?: string
          updated_by_auth_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_record_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_record_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_record_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_record_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "section"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_record_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_threshold_setting: {
        Row: {
          school_id: string
          threshold_percent: number
          updated_at: string
        }
        Insert: {
          school_id: string
          threshold_percent?: number
          updated_at?: string
        }
        Update: {
          school_id?: string
          threshold_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_threshold_setting_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
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
      concession_rule: {
        Row: {
          academic_year_id: string
          category_id: string
          created_at: string
          fee_head_id: string | null
          fixed_value_paise: number | null
          id: string
          label: string
          percentage_value: number | null
          school_id: string
          type: string
        }
        Insert: {
          academic_year_id: string
          category_id: string
          created_at?: string
          fee_head_id?: string | null
          fixed_value_paise?: number | null
          id?: string
          label: string
          percentage_value?: number | null
          school_id: string
          type: string
        }
        Update: {
          academic_year_id?: string
          category_id?: string
          created_at?: string
          fee_head_id?: string | null
          fixed_value_paise?: number | null
          id?: string
          label?: string
          percentage_value?: number | null
          school_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "concession_rule_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concession_rule_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "student_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concession_rule_fee_head_id_fkey"
            columns: ["fee_head_id"]
            isOneToOne: false
            referencedRelation: "fee_head"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concession_rule_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definition: {
        Row: {
          created_at: string
          entity_type: string
          field_key: string
          field_type: string
          id: string
          is_required: boolean
          label: string
          school_id: string
          select_options: Json | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          field_key: string
          field_type: string
          id?: string
          is_required?: boolean
          label: string
          school_id: string
          select_options?: Json | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          field_key?: string
          field_type?: string
          id?: string
          is_required?: boolean
          label?: string
          school_id?: string
          select_options?: Json | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definition_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_value: {
        Row: {
          created_at: string
          definition_id: string
          entity_id: string
          entity_type: string
          id: string
          school_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          definition_id: string
          entity_id: string
          entity_type: string
          id?: string
          school_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          definition_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          school_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_value_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definition"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_value_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
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
      enquiry: {
        Row: {
          assigned_to_staff_id: string | null
          class_interested_id: string | null
          created_at: string
          dob: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          school_id: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to_staff_id?: string | null
          class_interested_id?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          school_id: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to_staff_id?: string | null
          class_interested_id?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          school_id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_assigned_to_staff_id_fkey"
            columns: ["assigned_to_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_class_interested_id_fkey"
            columns: ["class_interested_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_school_id_fkey"
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
      exam: {
        Row: {
          academic_year_id: string
          compute_ranks: boolean
          created_at: string
          end_date: string | null
          id: string
          name: string
          school_id: string
          start_date: string | null
          status: string
          term: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          compute_ranks?: boolean
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          school_id: string
          start_date?: string | null
          status?: string
          term?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          compute_ranks?: boolean
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          school_id?: string
          start_date?: string | null
          status?: string
          term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_admit_card_settings: {
        Row: {
          available_from: string | null
          available_until: string | null
          controller_of_exams: string | null
          created_at: string
          exam_centre: string | null
          exam_id: string
          fee_lock_max_due_paise: number
          fee_lock_mode: string
          hall_ticket_prefix: string | null
          instructions: string | null
          principal_name: string | null
          release_enabled: boolean
          reporting_time: string | null
          school_id: string
          show_signature_lines: boolean
          show_student_photo: boolean
          template: string | null
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          controller_of_exams?: string | null
          created_at?: string
          exam_centre?: string | null
          exam_id: string
          fee_lock_max_due_paise?: number
          fee_lock_mode?: string
          hall_ticket_prefix?: string | null
          instructions?: string | null
          principal_name?: string | null
          release_enabled?: boolean
          reporting_time?: string | null
          school_id: string
          show_signature_lines?: boolean
          show_student_photo?: boolean
          template?: string | null
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          controller_of_exams?: string | null
          created_at?: string
          exam_centre?: string | null
          exam_id?: string
          fee_lock_max_due_paise?: number
          fee_lock_mode?: string
          hall_ticket_prefix?: string | null
          instructions?: string | null
          principal_name?: string | null
          release_enabled?: boolean
          reporting_time?: string | null
          school_id?: string
          show_signature_lines?: boolean
          show_student_photo?: boolean
          template?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_admit_card_settings_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: true
            referencedRelation: "exam"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_admit_card_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_class: {
        Row: {
          class_id: string
          exam_id: string
        }
        Insert: {
          class_id: string
          exam_id: string
        }
        Update: {
          class_id?: string
          exam_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_class_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_class_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exam"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_subject: {
        Row: {
          class_id: string
          created_at: string
          end_time: string | null
          exam_date: string | null
          exam_id: string
          has_internal: boolean
          id: string
          internal_max_marks: number | null
          max_marks: number
          pass_marks: number
          room_no: string | null
          start_time: string | null
          subject_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          end_time?: string | null
          exam_date?: string | null
          exam_id: string
          has_internal?: boolean
          id?: string
          internal_max_marks?: number | null
          max_marks: number
          pass_marks: number
          room_no?: string | null
          start_time?: string | null
          subject_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          end_time?: string | null
          exam_date?: string | null
          exam_id?: string
          has_internal?: boolean
          id?: string
          internal_max_marks?: number | null
          max_marks?: number
          pass_marks?: number
          room_no?: string | null
          start_time?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_subject_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_subject_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exam"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_subject_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_head: {
        Row: {
          created_at: string
          id: string
          is_recurring: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_recurring?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_recurring?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_head_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structure: {
        Row: {
          academic_year_id: string
          category_id: string | null
          class_id: string
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          category_id?: string | null
          class_id: string
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          category_id?: string | null
          class_id?: string
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structure_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structure_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "student_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structure_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structure_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structure_item: {
        Row: {
          amount_paise: number
          fee_head_id: string
          fee_structure_id: string
          id: string
          one_time_installment_number: number | null
        }
        Insert: {
          amount_paise: number
          fee_head_id: string
          fee_structure_id: string
          id?: string
          one_time_installment_number?: number | null
        }
        Update: {
          amount_paise?: number
          fee_head_id?: string
          fee_structure_id?: string
          id?: string
          one_time_installment_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_structure_item_fee_head_id_fkey"
            columns: ["fee_head_id"]
            isOneToOne: false
            referencedRelation: "fee_head"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structure_item_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structure"
            referencedColumns: ["id"]
          },
        ]
      }
      fine: {
        Row: {
          amount_paise: number
          applied_by_auth_user_id: string
          created_at: string
          id: string
          invoice_id: string
          reason: string
          school_id: string
        }
        Insert: {
          amount_paise: number
          applied_by_auth_user_id: string
          created_at?: string
          id?: string
          invoice_id: string
          reason: string
          school_id: string
        }
        Update: {
          amount_paise?: number
          applied_by_auth_user_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          reason?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fine_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fine_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_band: {
        Row: {
          created_at: string
          grade_label: string
          grade_point: number | null
          id: string
          max_percentage: number
          min_percentage: number
          remark: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade_label: string
          grade_point?: number | null
          id?: string
          max_percentage: number
          min_percentage: number
          remark?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade_label?: string
          grade_point?: number | null
          id?: string
          max_percentage?: number
          min_percentage?: number
          remark?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_band_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
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
      guardian_portal_account: {
        Row: {
          auth_user_id: string | null
          created_at: string
          guardian_id: string
          id: string
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          guardian_id: string
          id?: string
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          guardian_id?: string
          id?: string
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_portal_account_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardian"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_portal_account_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          academic_year_id: string
          class_id: string
          created_at: string
          created_by_auth_user_id: string
          description: string
          due_date: string
          id: string
          published_at: string | null
          school_id: string
          section_id: string
          staff_class_subject_id: string
          staff_id: string
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          class_id: string
          created_at?: string
          created_by_auth_user_id: string
          description: string
          due_date: string
          id?: string
          published_at?: string | null
          school_id: string
          section_id: string
          staff_class_subject_id: string
          staff_id: string
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          class_id?: string
          created_at?: string
          created_by_auth_user_id?: string
          description?: string
          due_date?: string
          id?: string
          published_at?: string | null
          school_id?: string
          section_id?: string
          staff_class_subject_id?: string
          staff_id?: string
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "section"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_staff_class_subject_id_fkey"
            columns: ["staff_class_subject_id"]
            isOneToOne: false
            referencedRelation: "staff_class_subject"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submission: {
        Row: {
          content: string | null
          created_at: string
          document_id: string | null
          homework_id: string
          id: string
          reviewed_at: string | null
          reviewed_by_auth_user_id: string | null
          school_id: string
          status: string
          student_id: string
          submitted_at: string | null
          teacher_remarks: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          document_id?: string | null
          homework_id: string
          id?: string
          reviewed_at?: string | null
          reviewed_by_auth_user_id?: string | null
          school_id: string
          status?: string
          student_id: string
          submitted_at?: string | null
          teacher_remarks?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          document_id?: string | null
          homework_id?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by_auth_user_id?: string | null
          school_id?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          teacher_remarks?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submission_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submission_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submission_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submission_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
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
      hpc_assessment: {
        Row: {
          created_at: string
          criterion_id: string
          entered_by_auth_user_id: string | null
          id: string
          rating_scale_id: string
          remarks: string | null
          report_card_setup_id: string
          school_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criterion_id: string
          entered_by_auth_user_id?: string | null
          id?: string
          rating_scale_id: string
          remarks?: string | null
          report_card_setup_id: string
          school_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criterion_id?: string
          entered_by_auth_user_id?: string | null
          id?: string
          rating_scale_id?: string
          remarks?: string | null
          report_card_setup_id?: string
          school_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpc_assessment_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "hpc_criterion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpc_assessment_rating_scale_id_fkey"
            columns: ["rating_scale_id"]
            isOneToOne: false
            referencedRelation: "hpc_rating_scale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpc_assessment_report_card_setup_id_fkey"
            columns: ["report_card_setup_id"]
            isOneToOne: false
            referencedRelation: "report_card_setup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpc_assessment_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpc_assessment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      hpc_criterion: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          school_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          school_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpc_criterion_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      hpc_rating_scale: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          school_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          school_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          school_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpc_rating_scale_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      id_card_settings: {
        Row: {
          created_at: string
          orientation: string
          school_id: string
          show_address: boolean
          show_blood_group: boolean
          show_contact: boolean
          show_dob: boolean
          show_father_name: boolean
          show_mother_name: boolean
          staff_template: string
          student_template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          orientation?: string
          school_id: string
          show_address?: boolean
          show_blood_group?: boolean
          show_contact?: boolean
          show_dob?: boolean
          show_father_name?: boolean
          show_mother_name?: boolean
          staff_template?: string
          student_template?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          orientation?: string
          school_id?: string
          show_address?: boolean
          show_blood_group?: boolean
          show_contact?: boolean
          show_dob?: boolean
          show_father_name?: boolean
          show_mother_name?: boolean
          staff_template?: string
          student_template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "id_card_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
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
          raw_headers: string[] | null
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
          raw_headers?: string[] | null
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
          raw_headers?: string[] | null
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
      installment: {
        Row: {
          academic_year_id: string
          created_at: string
          due_date: string
          id: string
          label: string
          school_id: string
          sequence_number: number
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          due_date: string
          id?: string
          label: string
          school_id: string
          sequence_number: number
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          due_date?: string
          id?: string
          label?: string
          school_id?: string
          sequence_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "installment_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice: {
        Row: {
          academic_year_id: string
          created_at: string
          due_date: string
          id: string
          installment_id: string
          invoice_number: string
          school_id: string
          status: string
          student_id: string
          total_amount_paise: number
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          due_date: string
          id?: string
          installment_id: string
          invoice_number: string
          school_id: string
          status?: string
          student_id: string
          total_amount_paise: number
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          due_date?: string
          id?: string
          installment_id?: string
          invoice_number?: string
          school_id?: string
          status?: string
          student_id?: string
          total_amount_paise?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "installment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line: {
        Row: {
          amount_paise: number
          concession_amount_paise: number
          fee_head_id: string
          fine_amount_paise: number
          id: string
          invoice_id: string
        }
        Insert: {
          amount_paise: number
          concession_amount_paise?: number
          fee_head_id: string
          fine_amount_paise?: number
          id?: string
          invoice_id: string
        }
        Update: {
          amount_paise?: number
          concession_amount_paise?: number
          fee_head_id?: string
          fine_amount_paise?: number
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_fee_head_id_fkey"
            columns: ["fee_head_id"]
            isOneToOne: false
            referencedRelation: "fee_head"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_request: {
        Row: {
          applied_by_auth_user_id: string | null
          created_at: string
          decided_at: string | null
          decided_by_auth_user_id: string | null
          end_date: string
          id: string
          leave_type_id: string
          reason: string | null
          school_id: string
          staff_id: string
          start_date: string
          status: string
        }
        Insert: {
          applied_by_auth_user_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by_auth_user_id?: string | null
          end_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          school_id: string
          staff_id: string
          start_date: string
          status?: string
        }
        Update: {
          applied_by_auth_user_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by_auth_user_id?: string | null
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          school_id?: string
          staff_id?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_request_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_request_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_request_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_type: {
        Row: {
          created_at: string
          id: string
          is_paid: boolean
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_paid?: boolean
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_paid?: boolean
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_type_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          auth_user_id: string
          created_at: string
          id: string
          school_id: string | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          id?: string
          school_id?: string | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          id?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      mark: {
        Row: {
          created_at: string
          entered_by_auth_user_id: string | null
          exam_subject_id: string
          id: string
          internal_marks_obtained: number | null
          is_absent: boolean
          marks_obtained: number | null
          remarks: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entered_by_auth_user_id?: string | null
          exam_subject_id: string
          id?: string
          internal_marks_obtained?: number | null
          is_absent?: boolean
          marks_obtained?: number | null
          remarks?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entered_by_auth_user_id?: string | null
          exam_subject_id?: string
          id?: string
          internal_marks_obtained?: number | null
          is_absent?: boolean
          marks_obtained?: number | null
          remarks?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mark_exam_subject_id_fkey"
            columns: ["exam_subject_id"]
            isOneToOne: false
            referencedRelation: "exam_subject"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mark_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      notice: {
        Row: {
          audience_kind: string
          body: string
          channels: string[]
          created_at: string
          created_by_auth_user_id: string
          id: string
          scheduled_at: string | null
          school_id: string
          sent_at: string | null
          title: string
        }
        Insert: {
          audience_kind: string
          body: string
          channels?: string[]
          created_at?: string
          created_by_auth_user_id: string
          id?: string
          scheduled_at?: string | null
          school_id: string
          sent_at?: string | null
          title: string
        }
        Update: {
          audience_kind?: string
          body?: string
          channels?: string[]
          created_at?: string
          created_by_auth_user_id?: string
          id?: string
          scheduled_at?: string | null
          school_id?: string
          sent_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_audience: {
        Row: {
          created_at: string
          id: string
          notice_id: string
          school_id: string
          scope_id: string | null
          scope_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          notice_id: string
          school_id: string
          scope_id?: string | null
          scope_type: string
        }
        Update: {
          created_at?: string
          id?: string
          notice_id?: string
          school_id?: string
          scope_id?: string | null
          scope_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_audience_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_audience_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      notification: {
        Row: {
          channel: string
          created_at: string
          id: string
          notice_id: string
          recipient_auth_user_id: string | null
          recipient_guardian_id: string | null
          recipient_type: string
          school_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          notice_id: string
          recipient_auth_user_id?: string | null
          recipient_guardian_id?: string | null
          recipient_type: string
          school_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          notice_id?: string
          recipient_auth_user_id?: string | null
          recipient_guardian_id?: string | null
          recipient_type?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipient_guardian_id_fkey"
            columns: ["recipient_guardian_id"]
            isOneToOne: false
            referencedRelation: "guardian"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery: {
        Row: {
          cost_paise: number | null
          created_at: string
          error_message: string | null
          id: string
          notification_id: string
          provider: string
          provider_message_id: string | null
          school_id: string
          status: string
        }
        Insert: {
          cost_paise?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id: string
          provider: string
          provider_message_id?: string | null
          school_id: string
          status: string
        }
        Update: {
          cost_paise?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id?: string
          provider?: string
          provider_message_id?: string | null
          school_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: true
            referencedRelation: "notification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      payment: {
        Row: {
          amount_paise: number
          created_at: string
          id: string
          invoice_id: string
          method: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          receipt_number: string | null
          received_by_auth_user_id: string
          reference_number: string | null
          school_id: string
          status: string
          student_id: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          id?: string
          invoice_id: string
          method: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          receipt_number?: string | null
          received_by_auth_user_id: string
          reference_number?: string | null
          school_id: string
          status?: string
          student_id: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          receipt_number?: string | null
          received_by_auth_user_id?: string
          reference_number?: string | null
          school_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_adjustment: {
        Row: {
          amount_paise: number
          created_at: string
          created_by_auth_user_id: string
          id: string
          invoice_id: string
          payment_id: string | null
          reason: string
          school_id: string
          type: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          created_by_auth_user_id: string
          id?: string
          invoice_id: string
          payment_id?: string | null
          reason: string
          school_id: string
          type: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          created_by_auth_user_id?: string
          id?: string
          invoice_id?: string
          payment_id?: string | null
          reason?: string
          school_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_adjustment_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_adjustment_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_adjustment_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      period: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_break: boolean
          label: string
          period_number: number
          school_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_break?: boolean
          label: string
          period_number: number
          school_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_break?: boolean
          label?: string
          period_number?: number
          school_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
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
      report_card_settings: {
        Row: {
          created_at: string
          footer_note: string | null
          school_id: string
          show_attendance: boolean
          show_rank: boolean
          show_remarks: boolean
          template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          footer_note?: string | null
          school_id: string
          show_attendance?: boolean
          show_rank?: boolean
          show_remarks?: boolean
          template?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          footer_note?: string | null
          school_id?: string
          show_attendance?: boolean
          show_rank?: boolean
          show_remarks?: boolean
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_card_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      report_card_setup: {
        Row: {
          academic_year_id: string
          compute_ranks: boolean
          created_at: string
          id: string
          include_hpc: boolean
          is_published: boolean
          name: string
          school_id: string
          template: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          compute_ranks?: boolean
          created_at?: string
          id?: string
          include_hpc?: boolean
          is_published?: boolean
          name: string
          school_id: string
          template?: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          compute_ranks?: boolean
          created_at?: string
          id?: string
          include_hpc?: boolean
          is_published?: boolean
          name?: string
          school_id?: string
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_card_setup_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_setup_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      report_card_setup_exam: {
        Row: {
          exam_id: string
          setup_id: string
          weight_percent: number
        }
        Insert: {
          exam_id: string
          setup_id: string
          weight_percent: number
        }
        Update: {
          exam_id?: string
          setup_id?: string
          weight_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_card_setup_exam_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exam"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_setup_exam_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "report_card_setup"
            referencedColumns: ["id"]
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
          gstin: string | null
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
          gstin?: string | null
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
          gstin?: string | null
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
          receipt_template: string
          receipt_watermark_enabled: boolean
          school_id: string
          updated_at: string
        }
        Insert: {
          brand_color_hex: string
          brand_ramp?: Json | null
          created_at?: string
          display_name: string
          logo_url?: string | null
          receipt_template?: string
          receipt_watermark_enabled?: boolean
          school_id: string
          updated_at?: string
        }
        Update: {
          brand_color_hex?: string
          brand_ramp?: Json | null
          created_at?: string
          display_name?: string
          logo_url?: string | null
          receipt_template?: string
          receipt_watermark_enabled?: boolean
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
      school_security_policy: {
        Row: {
          created_at: string
          min_password_length: number
          school_id: string
          session_expiry_minutes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          min_password_length?: number
          school_id: string
          session_expiry_minutes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          min_password_length?: number
          school_id?: string
          session_expiry_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_security_policy_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
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
          blood_group: string | null
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
          blood_group?: string | null
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
          blood_group?: string | null
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
      staff_attendance_record: {
        Row: {
          attendance_date: string
          id: string
          marked_at: string
          marked_by_auth_user_id: string
          remarks: string | null
          school_id: string
          staff_id: string
          status: string
        }
        Insert: {
          attendance_date: string
          id?: string
          marked_at?: string
          marked_by_auth_user_id: string
          remarks?: string | null
          school_id: string
          staff_id: string
          status: string
        }
        Update: {
          attendance_date?: string
          id?: string
          marked_at?: string
          marked_by_auth_user_id?: string
          remarks?: string | null
          school_id?: string
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_record_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_record_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
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
          address: string | null
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
          address?: string | null
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
          address?: string | null
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
      student_fee_assignment: {
        Row: {
          academic_year_id: string
          created_at: string
          fee_structure_id: string
          id: string
          school_id: string
          student_id: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          fee_structure_id: string
          id?: string
          school_id: string
          student_id: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          fee_structure_id?: string
          id?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_assignment_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_assignment_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_assignment_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_assignment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
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
      student_leave_application: {
        Row: {
          created_at: string
          from_date: string
          guardian_id: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by_auth_user_id: string | null
          school_id: string
          status: string
          student_id: string
          to_date: string
        }
        Insert: {
          created_at?: string
          from_date: string
          guardian_id: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by_auth_user_id?: string | null
          school_id: string
          status?: string
          student_id: string
          to_date: string
        }
        Update: {
          created_at?: string
          from_date?: string
          guardian_id?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by_auth_user_id?: string | null
          school_id?: string
          status?: string
          student_id?: string
          to_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_leave_application_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardian"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_leave_application_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_leave_application_student_id_fkey"
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
      substitution: {
        Row: {
          created_at: string
          created_by_auth_user_id: string
          id: string
          original_staff_id: string
          reason: string | null
          school_id: string
          substitute_staff_id: string
          substitution_date: string
          timetable_slot_id: string
        }
        Insert: {
          created_at?: string
          created_by_auth_user_id: string
          id?: string
          original_staff_id: string
          reason?: string | null
          school_id: string
          substitute_staff_id: string
          substitution_date: string
          timetable_slot_id: string
        }
        Update: {
          created_at?: string
          created_by_auth_user_id?: string
          id?: string
          original_staff_id?: string
          reason?: string | null
          school_id?: string
          substitute_staff_id?: string
          substitution_date?: string
          timetable_slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "substitution_original_staff_id_fkey"
            columns: ["original_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitution_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitution_substitute_staff_id_fkey"
            columns: ["substitute_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitution_timetable_slot_id_fkey"
            columns: ["timetable_slot_id"]
            isOneToOne: false
            referencedRelation: "timetable_slot"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slot: {
        Row: {
          academic_year_id: string
          class_id: string
          created_at: string
          day_of_week: number
          id: string
          period_id: string
          room: string | null
          school_id: string
          section_id: string
          staff_class_subject_id: string
          staff_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          class_id: string
          created_at?: string
          day_of_week: number
          id?: string
          period_id: string
          room?: string | null
          school_id: string
          section_id: string
          staff_class_subject_id: string
          staff_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          class_id?: string
          created_at?: string
          day_of_week?: number
          id?: string
          period_id?: string
          room?: string | null
          school_id?: string
          section_id?: string
          staff_class_subject_id?: string
          staff_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slot_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slot_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slot_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slot_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slot_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "section"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slot_staff_class_subject_id_fkey"
            columns: ["staff_class_subject_id"]
            isOneToOne: false
            referencedRelation: "staff_class_subject"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slot_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slot_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject"
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
      fn_admissions_trend: {
        Args: { p_days?: number; p_school_id: string }
        Returns: {
          admission_date: string
          new_students: number
        }[]
      }
      fn_apply_import_column_mapping: {
        Args: { p_batch_id: string; p_limit?: number; p_mapping: Json }
        Returns: Json
      }
      fn_attendance_percentages: {
        Args: { p_academic_year_id: string; p_school_id: string }
        Returns: {
          days_marked: number
          effective_present: number
          percent: number
          student_id: string
        }[]
      }
      fn_attendance_trend: {
        Args: {
          p_academic_year_id: string
          p_days?: number
          p_school_id: string
        }
        Returns: {
          attendance_date: string
          percent: number
        }[]
      }
      fn_collection_kpis: {
        Args: { p_school_id: string }
        Returns: {
          month_to_date_paise: number
          today_paise: number
        }[]
      }
      fn_collection_trend: {
        Args: { p_days?: number; p_school_id: string }
        Returns: {
          collection_date: string
          total_paise: number
        }[]
      }
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
      fn_confirm_admission: {
        Args: {
          p_actor_auth_user_id: string
          p_application_id: string
          p_school_id: string
          p_section_id: string
        }
        Returns: string
      }
      fn_count_uninvoiced_students: {
        Args: {
          p_academic_year_id: string
          p_class_id?: string
          p_school_id: string
        }
        Returns: number
      }
      fn_exam_class_results: {
        Args: { p_class_id: string; p_exam_id: string }
        Returns: {
          percentage: number
          rank: number
          student_id: string
          total_max: number
          total_obtained: number
        }[]
      }
      fn_exam_dashboard_stats: {
        Args: { p_academic_year_id: string; p_school_id: string }
        Returns: {
          marks_absent: number
          marks_present: number
          subjects_with_marks: number
          total_subjects: number
        }[]
      }
      fn_generate_monthly_installments: {
        Args: { p_academic_year_id: string; p_school_id: string }
        Returns: undefined
      }
      fn_generate_yearly_invoices: {
        Args: {
          p_academic_year_id: string
          p_after_student_id?: string
          p_class_id?: string
          p_limit?: number
          p_school_id: string
        }
        Returns: Json
      }
      fn_get_audit_log: {
        Args: {
          p_action_filter?: string
          p_from_date?: string
          p_limit?: number
          p_offset?: number
          p_school_id: string
          p_to_date?: string
        }
        Returns: {
          action: string
          actor_display_name: string
          actor_email: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          total_count: number
        }[]
      }
      fn_get_fee_defaulters: {
        Args: { p_academic_year_id: string; p_school_id: string }
        Returns: {
          admission_number: string
          class_name: string
          due_amount_paise: number
          first_name: string
          last_name: string
          overdue_invoice_count: number
          section_name: string
          student_id: string
        }[]
      }
      fn_get_login_history: {
        Args: { p_limit?: number; p_offset?: number; p_school_id: string }
        Returns: {
          auth_user_id: string
          created_at: string
          display_name: string
          email: string
          id: string
          total_count: number
        }[]
      }
      fn_has_permission: {
        Args: { perm_key: string; role_keys: string[] }
        Returns: boolean
      }
      fn_is_guardian_of: { Args: { p_student_id: string }; Returns: boolean }
      fn_is_guardian_of_section: {
        Args: {
          p_academic_year_id: string
          p_class_id: string
          p_section_id: string
        }
        Returns: boolean
      }
      fn_is_portal_member_of_school: {
        Args: { p_school_id: string }
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
      fn_list_students: {
        Args: {
          p_academic_year_id: string
          p_class_id?: string
          p_dir?: string
          p_fee_status?: string
          p_limit?: number
          p_offset?: number
          p_school_id: string
          p_search?: string
          p_section_id?: string
          p_sort?: string
        }
        Returns: {
          admission_number: string
          class_name: string
          due_amount_paise: number
          first_name: string
          gender: string
          has_invoices: boolean
          id: string
          last_name: string
          roll_number: string
          section_name: string
          status: string
          total_count: number
        }[]
      }
      fn_mark_section_attendance: {
        Args: {
          p_academic_year_id: string
          p_attendance_date: string
          p_class_id: string
          p_marked_by_auth_user_id: string
          p_marks: Json
          p_school_id: string
          p_section_id: string
        }
        Returns: Json
      }
      fn_next_school_number: {
        Args: { p_school_id: string; p_sequence_key: string }
        Returns: string
      }
      fn_notify_absence: {
        Args: {
          p_attendance_date: string
          p_marked_by_auth_user_id: string
          p_school_id: string
          p_student_id: string
        }
        Returns: undefined
      }
      fn_owns_staff_class_subject: {
        Args: { p_staff_class_subject_id: string }
        Returns: boolean
      }
      fn_publish_homework: {
        Args: { p_homework_id: string; p_school_id: string }
        Returns: undefined
      }
      fn_publish_notice: {
        Args: { p_notice_id: string; p_school_id: string }
        Returns: undefined
      }
      fn_publish_notice_internal: {
        Args: { p_notice_id: string; p_school_id: string }
        Returns: undefined
      }
      fn_purge_expired_import_snapshots: { Args: never; Returns: undefined }
      fn_recompute_invoice_status: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      fn_report_card_setup_results: {
        Args: { p_class_id: string; p_setup_id: string }
        Returns: {
          exams_counted: number
          rank: number
          student_id: string
          weighted_percentage: number
        }[]
      }
      fn_reserve_school_numbers: {
        Args: { p_count: number; p_school_id: string; p_sequence_key: string }
        Returns: {
          padding: number
          prefix: string
          start_value: number
        }[]
      }
      fn_resolve_grade: {
        Args: { p_percentage: number; p_school_id: string }
        Returns: {
          grade_label: string
          grade_point: number
          remark: string
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
      fn_save_marks: {
        Args: {
          p_entered_by_auth_user_id: string
          p_exam_subject_id: string
          p_marks: Json
        }
        Returns: Json
      }
      fn_today_ist: { Args: never; Returns: string }
      fn_validate_import_batch: {
        Args: { p_batch_id: string; p_limit?: number }
        Returns: Json
      }
      fn_validate_staff_phase1: {
        Args: { p_batch_id: string; p_match_mode: string }
        Returns: undefined
      }
      fn_validate_staff_phase2: {
        Args: {
          p_batch_id: string
          p_limit: number
          p_match_mode: string
          p_school_id: string
        }
        Returns: undefined
      }
      fn_validate_student_phase1: {
        Args: { p_batch_id: string; p_match_mode: string }
        Returns: undefined
      }
      fn_validate_student_phase2: {
        Args: {
          p_batch_id: string
          p_limit: number
          p_match_mode: string
          p_school_id: string
        }
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
