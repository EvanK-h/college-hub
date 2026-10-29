
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "announcements": {
                  Row: {
                    "author": string | null,"canvas_id": number,"course_id": string,"deleted_in_canvas": boolean,"html_url": string,"id": string,"important": boolean,"message": string | null,"owner_id": string,"posted_at": string | null,"read": boolean,"synced_at": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author"?: string | null,"canvas_id": number,"course_id": string,"deleted_in_canvas"?: boolean,"html_url": string,"id"?: string,"important"?: boolean,"message"?: string | null,"owner_id"?: string,"posted_at"?: string | null,"read"?: boolean,"synced_at"?: string,"title": string
                  }
                  Update: {
                    "author"?: string | null,"canvas_id"?: number,"course_id"?: string,"deleted_in_canvas"?: boolean,"html_url"?: string,"id"?: string,"important"?: boolean,"message"?: string | null,"owner_id"?: string,"posted_at"?: string | null,"read"?: boolean,"synced_at"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"assignment_groups": {
                  Row: {
                    "canvas_id": number,"course_id": string,"id": string,"name": string,"owner_id": string,"position": number | null,"synced_at": string,"weight": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "canvas_id": number,"course_id": string,"id"?: string,"name": string,"owner_id"?: string,"position"?: number | null,"synced_at"?: string,"weight"?: number | null
                  }
                  Update: {
                    "canvas_id"?: number,"course_id"?: string,"id"?: string,"name"?: string,"owner_id"?: string,"position"?: number | null,"synced_at"?: string,"weight"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignment_groups_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"assignments": {
                  Row: {
                    "assignment_group_id": number | null,"canvas_id": number,"course_id": string,"deleted_in_canvas": boolean,"due_at": string | null,"est_hours": number | null,"html_url": string,"id": string,"kind": Database["public"]['Enums']["assignment_kind"],"notes": string | null,"owner_id": string,"points_possible": number | null,"priority": Database["public"]['Enums']["assignment_priority"] | null,"progress": Database["public"]['Enums']["assignment_progress"],"score": number | null,"submitted_at": string | null,"synced_at": string,"title": string,"workflow_state": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_group_id"?: number | null,"canvas_id": number,"course_id": string,"deleted_in_canvas"?: boolean,"due_at"?: string | null,"est_hours"?: number | null,"html_url": string,"id"?: string,"kind": Database["public"]['Enums']["assignment_kind"],"notes"?: string | null,"owner_id"?: string,"points_possible"?: number | null,"priority"?: Database["public"]['Enums']["assignment_priority"] | null,"progress"?: Database["public"]['Enums']["assignment_progress"],"score"?: number | null,"submitted_at"?: string | null,"synced_at"?: string,"title": string,"workflow_state"?: string | null
                  }
                  Update: {
                    "assignment_group_id"?: number | null,"canvas_id"?: number,"course_id"?: string,"deleted_in_canvas"?: boolean,"due_at"?: string | null,"est_hours"?: number | null,"html_url"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["assignment_kind"],"notes"?: string | null,"owner_id"?: string,"points_possible"?: number | null,"priority"?: Database["public"]['Enums']["assignment_priority"] | null,"progress"?: Database["public"]['Enums']["assignment_progress"],"score"?: number | null,"submitted_at"?: string | null,"synced_at"?: string,"title"?: string,"workflow_state"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"attributes": {
                  Row: {
                    "code": string,"id": string,"name": string,"owner_id": string,"position": number,"required": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"id"?: string,"name": string,"owner_id"?: string,"position"?: number,"required"?: boolean
                  }
                  Update: {
                    "code"?: string,"id"?: string,"name"?: string,"owner_id"?: string,"position"?: number,"required"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"calendar_feeds": {
                  Row: {
                    "created_at": string,"id": string,"owner_id": string,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"owner_id"?: string,"token_hash": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"owner_id"?: string,"token_hash"?: string
                  }
                  Relationships: [
                    
                  ]
                },"class_sessions": {
                  Row: {
                    "cancelled": boolean,"course_id": string | null,"ends_at": string,"ics_uid": string,"id": string,"is_new": boolean,"kind": Database["public"]['Enums']["session_type"],"location": string | null,"owner_id": string,"recurrence_id": string | null,"starts_at": string,"synced_at": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelled"?: boolean,"course_id"?: string | null,"ends_at": string,"ics_uid": string,"id"?: string,"is_new"?: boolean,"kind": Database["public"]['Enums']["session_type"],"location"?: string | null,"owner_id"?: string,"recurrence_id"?: string | null,"starts_at": string,"synced_at"?: string,"title": string
                  }
                  Update: {
                    "cancelled"?: boolean,"course_id"?: string | null,"ends_at"?: string,"ics_uid"?: string,"id"?: string,"is_new"?: boolean,"kind"?: Database["public"]['Enums']["session_type"],"location"?: string | null,"owner_id"?: string,"recurrence_id"?: string | null,"starts_at"?: string,"synced_at"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "class_sessions_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"course_attributes": {
                  Row: {
                    "attribute_id": string,"course_id": string,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attribute_id": string,"course_id": string,"owner_id"?: string
                  }
                  Update: {
                    "attribute_id"?: string,"course_id"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "course_attributes_attribute_id_fkey"
      columns: ["attribute_id"]
isOneToOne: false
      referencedRelation: "attributes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "course_attributes_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"course_prereqs": {
                  Row: {
                    "course_id": string,"id": string,"kind": Database["public"]['Enums']["prereq_kind"],"option_group": number,"owner_id": string,"requires_code": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"id"?: string,"kind"?: Database["public"]['Enums']["prereq_kind"],"option_group"?: number,"owner_id"?: string,"requires_code": string
                  }
                  Update: {
                    "course_id"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["prereq_kind"],"option_group"?: number,"owner_id"?: string,"requires_code"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "course_prereqs_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"course_requirements": {
                  Row: {
                    "course_id": string,"owner_id": string,"requirement_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"owner_id"?: string,"requirement_id": string
                  }
                  Update: {
                    "course_id"?: string,"owner_id"?: string,"requirement_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "course_requirements_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "course_requirements_requirement_id_fkey"
      columns: ["requirement_id"]
isOneToOne: false
      referencedRelation: "requirement_progress"
      referencedColumns: ["requirement_id"]
    },{
      foreignKeyName: "course_requirements_requirement_id_fkey"
      columns: ["requirement_id"]
isOneToOne: false
      referencedRelation: "requirements"
      referencedColumns: ["id"]
    }
                  ]
                },"course_types": {
                  Row: {
                    "color": number,"coop": boolean,"id": string,"name": string,"owner_id": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "color": number,"coop"?: boolean,"id"?: string,"name": string,"owner_id"?: string,"position"?: number
                  }
                  Update: {
                    "color"?: number,"coop"?: boolean,"id"?: string,"name"?: string,"owner_id"?: string,"position"?: number
                  }
                  Relationships: [
                    
                  ]
                },"courses": {
                  Row: {
                    "canvas_course_id": number | null,"code": string,"course_type_id": string,"credits": number,"id": string,"notes": string | null,"owner_id": string,"status": Database["public"]['Enums']["course_status"],"term_id": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "canvas_course_id"?: number | null,"code": string,"course_type_id": string,"credits": number,"id"?: string,"notes"?: string | null,"owner_id"?: string,"status"?: Database["public"]['Enums']["course_status"],"term_id": number,"title": string
                  }
                  Update: {
                    "canvas_course_id"?: number | null,"code"?: string,"course_type_id"?: string,"credits"?: number,"id"?: string,"notes"?: string | null,"owner_id"?: string,"status"?: Database["public"]['Enums']["course_status"],"term_id"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "courses_course_type_id_fkey"
      columns: ["course_type_id"]
isOneToOne: false
      referencedRelation: "course_types"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "courses_term_id_fkey"
      columns: ["term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    }
                  ]
                },"focuses": {
                  Row: {
                    "goal_code": string | null,"id": string,"name": string,"owner_id": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "goal_code"?: string | null,"id"?: string,"name": string,"owner_id"?: string,"position"?: number
                  }
                  Update: {
                    "goal_code"?: string | null,"id"?: string,"name"?: string,"owner_id"?: string,"position"?: number
                  }
                  Relationships: [
                    
                  ]
                },"plan_courses": {
                  Row: {
                    "course_id": string | null,"id": string,"owner_id": string,"plan_id": string,"replaces_course_id": string | null,"swap_option_id": string | null,"term_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id"?: string | null,"id"?: string,"owner_id"?: string,"plan_id": string,"replaces_course_id"?: string | null,"swap_option_id"?: string | null,"term_id": number
                  }
                  Update: {
                    "course_id"?: string | null,"id"?: string,"owner_id"?: string,"plan_id"?: string,"replaces_course_id"?: string | null,"swap_option_id"?: string | null,"term_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_courses_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_courses_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_courses_replaces_course_id_fkey"
      columns: ["replaces_course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_courses_swap_option_id_fkey"
      columns: ["swap_option_id"]
isOneToOne: false
      referencedRelation: "swap_options"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_courses_term_id_fkey"
      columns: ["term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"owner_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "attribute_set_name": string | null,"credit_limits": NonNullable<Json>,"credit_unit": string,"grade_scale": NonNullable<Json>,"owner_id": string,"preset": string | null,"school": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attribute_set_name"?: string | null,"credit_limits"?: NonNullable<Json>,"credit_unit"?: string,"grade_scale"?: NonNullable<Json>,"owner_id"?: string,"preset"?: string | null,"school"?: string | null
                  }
                  Update: {
                    "attribute_set_name"?: string | null,"credit_limits"?: NonNullable<Json>,"credit_unit"?: string,"grade_scale"?: NonNullable<Json>,"owner_id"?: string,"preset"?: string | null,"school"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"requirement_areas": {
                  Row: {
                    "headline": boolean,"id": string,"name": string,"owner_id": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "headline"?: boolean,"id"?: string,"name": string,"owner_id"?: string,"position"?: number
                  }
                  Update: {
                    "headline"?: boolean,"id"?: string,"name"?: string,"owner_id"?: string,"position"?: number
                  }
                  Relationships: [
                    
                  ]
                },"requirements": {
                  Row: {
                    "area_id": string,"id": string,"name": string,"notes": string | null,"options": string | null,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": string,"id"?: string,"name": string,"notes"?: string | null,"options"?: string | null,"owner_id"?: string
                  }
                  Update: {
                    "area_id"?: string,"id"?: string,"name"?: string,"notes"?: string | null,"options"?: string | null,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "requirements_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "requirement_areas"
      referencedColumns: ["id"]
    }
                  ]
                },"swap_options": {
                  Row: {
                    "fits_in": string | null,"id": string,"owner_id": string,"prerequisites": string | null,"slot_id": string,"swap_in": string,"why_consider": string | null,"why_current_better": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "fits_in"?: string | null,"id"?: string,"owner_id"?: string,"prerequisites"?: string | null,"slot_id": string,"swap_in": string,"why_consider"?: string | null,"why_current_better"?: string | null
                  }
                  Update: {
                    "fits_in"?: string | null,"id"?: string,"owner_id"?: string,"prerequisites"?: string | null,"slot_id"?: string,"swap_in"?: string,"why_consider"?: string | null,"why_current_better"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "swap_options_slot_id_fkey"
      columns: ["slot_id"]
isOneToOne: false
      referencedRelation: "swap_slots"
      referencedColumns: ["id"]
    }
                  ]
                },"swap_relevance": {
                  Row: {
                    "focus_id": string,"owner_id": string,"relevance": Database["public"]['Enums']["relevance"],"swap_option_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "focus_id": string,"owner_id"?: string,"relevance": Database["public"]['Enums']["relevance"],"swap_option_id": string
                  }
                  Update: {
                    "focus_id"?: string,"owner_id"?: string,"relevance"?: Database["public"]['Enums']["relevance"],"swap_option_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "swap_relevance_focus_id_fkey"
      columns: ["focus_id"]
isOneToOne: false
      referencedRelation: "focuses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "swap_relevance_swap_option_id_fkey"
      columns: ["swap_option_id"]
isOneToOne: false
      referencedRelation: "swap_options"
      referencedColumns: ["id"]
    }
                  ]
                },"swap_replaces": {
                  Row: {
                    "course_id": string,"owner_id": string,"swap_option_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"owner_id"?: string,"swap_option_id": string
                  }
                  Update: {
                    "course_id"?: string,"owner_id"?: string,"swap_option_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "swap_replaces_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "swap_replaces_swap_option_id_fkey"
      columns: ["swap_option_id"]
isOneToOne: false
      referencedRelation: "swap_options"
      referencedColumns: ["id"]
    }
                  ]
                },"swap_slots": {
                  Row: {
                    "id": string,"name": string,"owner_id": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"owner_id"?: string,"position"?: number
                  }
                  Update: {
                    "id"?: string,"name"?: string,"owner_id"?: string,"position"?: number
                  }
                  Relationships: [
                    
                  ]
                },"sync_runs": {
                  Row: {
                    "error_message": string | null,"finished_at": string | null,"id": string,"inserted": number,"owner_id": string,"source": Database["public"]['Enums']["sync_source"],"started_at": string,"status": Database["public"]['Enums']["sync_status"],"unchanged": number,"updated": number
                  }
                  ComputedFields: never
                  Insert: {
                    "error_message"?: string | null,"finished_at"?: string | null,"id"?: string,"inserted"?: number,"owner_id"?: string,"source": Database["public"]['Enums']["sync_source"],"started_at"?: string,"status"?: Database["public"]['Enums']["sync_status"],"unchanged"?: number,"updated"?: number
                  }
                  Update: {
                    "error_message"?: string | null,"finished_at"?: string | null,"id"?: string,"inserted"?: number,"owner_id"?: string,"source"?: Database["public"]['Enums']["sync_source"],"started_at"?: string,"status"?: Database["public"]['Enums']["sync_status"],"unchanged"?: number,"updated"?: number
                  }
                  Relationships: [
                    
                  ]
                },"terms": {
                  Row: {
                    "campus": string | null,"ends_on": string | null,"id": number,"kind": Database["public"]['Enums']["term_kind"],"name": string,"owner_id": string,"starts_on": string | null,"time_zone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "campus"?: string | null,"ends_on"?: string | null,"id": number,"kind": Database["public"]['Enums']["term_kind"],"name": string,"owner_id"?: string,"starts_on"?: string | null,"time_zone"?: string
                  }
                  Update: {
                    "campus"?: string | null,"ends_on"?: string | null,"id"?: number,"kind"?: Database["public"]['Enums']["term_kind"],"name"?: string,"owner_id"?: string,"starts_on"?: string | null,"time_zone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"todos": {
                  Row: {
                    "course_id": string | null,"created_at": string,"done_at": string | null,"due_on": string | null,"id": string,"owner_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id"?: string | null,"created_at"?: string,"done_at"?: string | null,"due_on"?: string | null,"id"?: string,"owner_id"?: string,"title": string
                  }
                  Update: {
                    "course_id"?: string | null,"created_at"?: string,"done_at"?: string | null,"due_on"?: string | null,"id"?: string,"owner_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "todos_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "requirement_progress": {
                  Row: {
                    "area_id": string,"done_courses": number | null,"done_pct": number | null,"done_sh": number | null,"name": string,"requirement_id": string,"started_courses": number | null,"started_pct": number | null,"status": string | null,"total_courses": number | null,"total_sh": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "requirements_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "requirement_areas"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "apply_plan":
{ Args: { "p_plan": string }; Returns: undefined
                           },
"calendar_feed":
{ Args: { "p_token": string }; Returns: Json
                           },
"create_plan":
{ Args: { "p_from"?: string,"p_name": string }; Returns: string
                           },
"sync_announcements":
{ Args: { "p_course_id": string,"p_owner": string,"p_rows": Json }; Returns: {
              "inserted": number,"unchanged": number,"updated": number
            }[]
                           },
"sync_assignment_groups":
{ Args: { "p_course_id": string,"p_owner": string,"p_rows": Json }; Returns: {
              "inserted": number,"unchanged": number,"updated": number
            }[]
                           },
"sync_assignments":
{ Args: { "p_course_id": string,"p_owner": string,"p_rows": Json }; Returns: {
              "inserted": number,"unchanged": number,"updated": number
            }[]
                           },
"sync_class_sessions":
{ Args: { "p_cancel_from": string,"p_cancel_to": string,"p_owner": string,"p_rows": Json }; Returns: {
              "inserted": number,"unchanged": number,"updated": number
            }[]
                           },
"trigger_canvas_sync":
{ Args: Record<PropertyKey, never>; Returns: number
                           }
          }
          Enums: {
            "assignment_kind": "assignment"|"quiz"|"exam"|"discussion"|"lab"|"reading","assignment_priority": "low"|"medium"|"high","assignment_progress": "not_started"|"in_progress","course_status": "planned"|"in_progress"|"done","prereq_kind": "prereq"|"coreq"|"recommended","relevance": "none"|"lower"|"low"|"medium"|"high","session_type": "lecture"|"lab"|"seminar"|"tutorial"|"workshop"|"exam"|"other","sync_source": "canvas"|"timetable","sync_status": "running"|"success"|"error"|"token_expired","term_kind": "transfer"|"semester"|"summer"|"coop"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "assignment_kind": ["assignment", "quiz", "exam", "discussion", "lab", "reading"],"assignment_priority": ["low", "medium", "high"],"assignment_progress": ["not_started", "in_progress"],"course_status": ["planned", "in_progress", "done"],"prereq_kind": ["prereq", "coreq", "recommended"],"relevance": ["none", "lower", "low", "medium", "high"],"session_type": ["lecture", "lab", "seminar", "tutorial", "workshop", "exam", "other"],"sync_source": ["canvas", "timetable"],"sync_status": ["running", "success", "error", "token_expired"],"term_kind": ["transfer", "semester", "summer", "coop"]
          }
        }
} as const
