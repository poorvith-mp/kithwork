export type Person = { id:string; owner_id:string; first_name:string; last_name:string|null; email:string|null; phone:string|null; relationship_status:'lead'|'prospect'|'active_client'|'past_client'; source:string; notes:string|null; created_at:string; updated_at:string; deleted_at:string|null }
export type Company = { id:string; owner_id:string; name:string; website:string|null; email:string|null; phone:string|null; industry:string|null; status:'lead'|'prospect'|'active_client'|'past_client'; notes:string|null; created_at:string; updated_at:string; deleted_at:string|null }
export type Enquiry = { id:string; owner_id:string; person_id:string; company_id:string|null; category:'feedback'|'hire'|'request'|'support'|'manual'; subject:string|null; message:string; service_interest:string|null; status:'new'|'reviewing'|'conversation_requested'|'qualified'|'closed'; priority:'low'|'normal'|'high'|'urgent'; next_action:string|null; next_action_due_at:string|null; created_at:string; updated_at:string; deleted_at:string|null }
export type OpportunityStage = 'discovery'|'proposal'|'negotiation'|'won'|'lost'|'on_hold'
export type Opportunity = { id:string; owner_id:string; person_id:string; company_id:string|null; enquiry_id:string|null; title:string; service_interest:string|null; stage:OpportunityStage; expected_value:number|null; probability:number|null; expected_close_date:string|null; next_action:string|null; next_action_due_at:string|null; notes:string|null; stage_reason:string|null; created_at:string; updated_at:string; deleted_at:string|null }
export type Project = { id:string; owner_id:string; title:string; status:string; person_id:string|null; company_id:string|null; opportunity_id:string|null; start_date:string|null; target_date:string|null; progress:number; description:string|null; created_at:string; updated_at:string; deleted_at:string|null }
export type Task = { id:string; owner_id:string; project_id:string|null; parent_task_id:string|null; milestone_id:string|null; task_group_id:string|null; title:string; description:string|null; status:string; priority:string; start_at:string|null; due_at:string|null; estimate_minutes:number|null; position:number; created_at:string; updated_at:string; deleted_at:string|null }

export type CollaboratorState = 'invited' | 'active' | 'suspended' | 'revoked'

export type AppProfile = {
  user_id: string
  email: string
  full_name: string
  phone: string | null
  role_title: string | null
  timezone: string
  bio: string | null
  photo_path: string | null
  notification_preferences: Record<string, boolean>
  account_state: CollaboratorState
  is_owner: boolean
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export type EntityAssignment = {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  assigned_by: string
  created_at: string
}

export type AppSession = {
  id: string
  user_id: string
  session_id: string
  device_metadata: Record<string, unknown>
  ip_hash: string | null
  last_active_at: string
  revoked_at: string | null
  created_at: string
}
