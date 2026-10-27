
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
                },"courses": {
                  Row: {
                    "canvas_course_id": number | null,"code": string,"credits": number,"id": string,"notes": string | null,"nupath": (Database["public"]['Enums']["nupath"])[],"owner_id": string,"status": Database["public"]['Enums']["course_status"],"term_id": number,"title": string,"type": Database["public"]['Enums']["course_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "canvas_course_id"?: number | null,"code": string,"credits": number,"id"?: string,"notes"?: string | null,"nupath"?: (Database["public"]['Enums']["nupath"])[],"owner_id"?: string,"status"?: Database["public"]['Enums']["course_status"],"term_id": number,"title": string,"type": Database["public"]['Enums']["course_type"]
                  }
                  Update: {
                    "canvas_course_id"?: number | null,"code"?: string,"credits"?: number,"id"?: string,"notes"?: string | null,"nupath"?: (Database["public"]['Enums']["nupath"])[],"owner_id"?: string,"status"?: Database["public"]['Enums']["course_status"],"term_id"?: number,"title"?: string,"type"?: Database["public"]['Enums']["course_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "courses_term_id_fkey"
      columns: ["term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    }
                  ]
                },"requirements": {
                  Row: {
                    "area": Database["public"]['Enums']["req_area"],"id": string,"name": string,"notes": string | null,"options": string | null,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area": Database["public"]['Enums']["req_area"],"id"?: string,"name": string,"notes"?: string | null,"options"?: string | null,"owner_id"?: string
                  }
                  Update: {
                    "area"?: Database["public"]['Enums']["req_area"],"id"?: string,"name"?: string,"notes"?: string | null,"options"?: string | null,"owner_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"swap_options": {
                  Row: {
                    "fits_in": string | null,"id": string,"owner_id": string,"prerequisites": string | null,"quantum_relevance": Database["public"]['Enums']["quantum_relevance"],"slot": Database["public"]['Enums']["swap_slot"],"swap_in": string,"why_consider": string | null,"why_current_better": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "fits_in"?: string | null,"id"?: string,"owner_id"?: string,"prerequisites"?: string | null,"quantum_relevance": Database["public"]['Enums']["quantum_relevance"],"slot": Database["public"]['Enums']["swap_slot"],"swap_in": string,"why_consider"?: string | null,"why_current_better"?: string | null
                  }
                  Update: {
                    "fits_in"?: string | null,"id"?: string,"owner_id"?: string,"prerequisites"?: string | null,"quantum_relevance"?: Database["public"]['Enums']["quantum_relevance"],"slot"?: Database["public"]['Enums']["swap_slot"],"swap_in"?: string,"why_consider"?: string | null,"why_current_better"?: string | null
                  }
                  Relationships: [
                    
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
                    "area": Database["public"]['Enums']["req_area"],"done_courses": number | null,"done_pct": number | null,"done_sh": number | null,"name": string,"requirement_id": string,"started_courses": number | null,"started_pct": number | null,"status": string | null,"total_courses": number | null,"total_sh": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "calendar_feed":
{ Args: { "p_token": string }; Returns: Json
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
            "assignment_kind": "assignment"|"quiz"|"exam"|"discussion"|"lab"|"reading","assignment_priority": "low"|"medium"|"high","assignment_progress": "not_started"|"in_progress","course_status": "planned"|"in_progress"|"done","course_type": "cs_core"|"ai_concentration"|"physics_minor"|"major_support"|"general_elective"|"coop_program","nupath": "ND"|"EI"|"IC"|"FQ"|"SI"|"AD"|"DD"|"ER"|"WF"|"WD"|"WI"|"EX"|"CE","prereq_kind": "prereq"|"coreq"|"recommended","quantum_relevance": "none"|"lower"|"low"|"medium"|"high","req_area": "cs_overview"|"cs_fundamentals"|"cs_required"|"security_presentation"|"khoury_electives"|"supporting"|"writing"|"ai_concentration"|"physics_minor"|"universitywide","session_type": "lecture"|"lab"|"seminar"|"tutorial"|"workshop"|"exam"|"other","swap_slot": "london_elective"|"khoury_elective"|"ai_elective"|"software_engineering"|"placement_substitute"|"physics_minor_elective"|"advanced_writing","sync_source": "canvas"|"timetable","sync_status": "running"|"success"|"error"|"token_expired","term_kind": "transfer"|"semester"|"summer"|"coop"
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
            "assignment_kind": ["assignment", "quiz", "exam", "discussion", "lab", "reading"],"assignment_priority": ["low", "medium", "high"],"assignment_progress": ["not_started", "in_progress"],"course_status": ["planned", "in_progress", "done"],"course_type": ["cs_core", "ai_concentration", "physics_minor", "major_support", "general_elective", "coop_program"],"nupath": ["ND", "EI", "IC", "FQ", "SI", "AD", "DD", "ER", "WF", "WD", "WI", "EX", "CE"],"prereq_kind": ["prereq", "coreq", "recommended"],"quantum_relevance": ["none", "lower", "low", "medium", "high"],"req_area": ["cs_overview", "cs_fundamentals", "cs_required", "security_presentation", "khoury_electives", "supporting", "writing", "ai_concentration", "physics_minor", "universitywide"],"session_type": ["lecture", "lab", "seminar", "tutorial", "workshop", "exam", "other"],"swap_slot": ["london_elective", "khoury_elective", "ai_elective", "software_engineering", "placement_substitute", "physics_minor_elective", "advanced_writing"],"sync_source": ["canvas", "timetable"],"sync_status": ["running", "success", "error", "token_expired"],"term_kind": ["transfer", "semester", "summer", "coop"]
          }
        }
} as const
