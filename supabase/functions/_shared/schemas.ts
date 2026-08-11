import { z } from 'npm:zod@4'
export const intakeSchema=z.object({name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(254),category:z.enum(['feedback','hire','request','support']),subject:z.string().trim().max(160).optional().default(''),message:z.string().trim().min(10).max(10000),serviceInterest:z.string().trim().max(160).optional().default(''),marketingConsent:z.boolean().default(true),termsAccepted:z.literal(true),website:z.string().max(200).optional().default(''),slotStart:z.string().datetime().optional(),timezone:z.string().trim().max(80).optional().default('UTC')})
export const allowedFiles=new Map([['md',['text/markdown','text/plain','']],['pdf',['application/pdf','']],['doc',['application/msword','']],['docx',['application/vnd.openxmlformats-officedocument.wordprocessingml.document','']],['xlsx',['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','']]])

export const collaboratorModuleSchema = z.enum([
  'people',
  'companies',
  'pipeline',
  'projects',
  'tasks',
  'calendar',
  'inbox',
  'files',
])
export const collaboratorCapabilitySchema = z.enum([
  'view',
  'create',
  'edit',
  'reply',
  'upload',
  'move',
])
const allowedCapabilities = {
  people: ['view', 'create', 'edit'],
  companies: ['view', 'create', 'edit'],
  pipeline: ['view', 'create', 'edit', 'move'],
  projects: ['view', 'create', 'edit', 'move'],
  tasks: ['view', 'create', 'edit', 'move'],
  calendar: ['view', 'create', 'edit', 'move'],
  inbox: ['view', 'reply'],
  files: ['view', 'upload'],
} as const
export const assignmentSchema = z.object({
  entityType: z.enum([
    'person',
    'company',
    'enquiry',
    'opportunity',
    'project',
    'task',
    'blocked_period',
    'slot_request',
    'appointment',
    'conversation',
    'file',
  ]),
  entityId: z.string().uuid(),
}).strict()
export const collaboratorPermissionsSchema = z.partialRecord(
  collaboratorModuleSchema,
  z.array(collaboratorCapabilitySchema).min(1).max(6),
).superRefine((permissions, context) => {
  for (const [moduleKey, capabilities] of Object.entries(permissions)) {
    const allowed = allowedCapabilities[moduleKey as keyof typeof allowedCapabilities]
    if (!capabilities?.includes('view')) {
      context.addIssue({
        code: 'custom',
        message: `View access is required for ${moduleKey}.`,
        path: [moduleKey],
      })
    }
    if (capabilities?.some((capability) => !(allowed as readonly string[]).includes(capability))) {
      context.addIssue({
        code: 'custom',
        message: `Unsupported capability for ${moduleKey}.`,
        path: [moduleKey],
      })
    }
  }
})
export const collaboratorAdminRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('invite'),
    input: z.object({
      email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
      fullName: z.string().trim().min(2).max(120),
      roleTitle: z.string().trim().max(120).optional(),
      permissions: collaboratorPermissionsSchema,
      assignments: z.array(assignmentSchema).max(500).optional().default([]),
    }).strict(),
  }).strict(),
  z.object({
    action: z.literal('update-access'),
    input: z.object({
      userId: z.string().uuid(),
      permissions: collaboratorPermissionsSchema,
      assignments: z.array(assignmentSchema).max(500),
    }).strict(),
  }).strict(),
  z.object({
    action: z.literal('set-state'),
    input: z.object({
      userId: z.string().uuid(),
      state: z.enum(['active', 'suspended', 'revoked']),
    }).strict(),
  }).strict(),
])
export const accountSessionRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }).strict(),
  z.object({ action: z.literal('revoke'), sessionId: z.string().uuid() }).strict(),
  z.object({ action: z.literal('revoke-others') }).strict(),
])
