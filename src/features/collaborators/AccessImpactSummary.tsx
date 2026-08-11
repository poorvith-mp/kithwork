import type { ModuleCapability } from '@/lib/permissions'

import type { PermissionDraft } from './types'

const moduleLabels: Record<keyof PermissionDraft, string> = {
  people: 'people',
  companies: 'companies',
  pipeline: 'pipeline opportunities',
  projects: 'projects',
  tasks: 'tasks',
  calendar: 'calendar records',
  inbox: 'conversations',
  files: 'files',
}

type Change = {
  key: string
  text: string
  tone: 'add' | 'remove'
}

export function permissionChanges(
  baseline: PermissionDraft,
  value: PermissionDraft,
) {
  const changes: Change[] = []
  const modules = Object.keys(moduleLabels) as (keyof PermissionDraft)[]
  for (const module of modules) {
    const before = new Set(baseline[module] ?? [])
    const after = new Set(value[module] ?? [])
    for (const capability of after) {
      if (!before.has(capability)) {
        changes.push({
          key: `add-${module}-${capability}`,
          tone: 'add',
          text: `Adds ${capability} access to assigned ${moduleLabels[module]}.`,
        })
      }
    }
    for (const capability of before) {
      if (!after.has(capability)) {
        changes.push({
          key: `remove-${module}-${capability}`,
          tone: 'remove',
          text: `Removes ${capability} access from assigned ${moduleLabels[module]}.`,
        })
      }
    }
  }
  return changes
}

export function AccessImpactSummary({
  baseline,
  value,
  assignmentDelta = 0,
}: {
  baseline: PermissionDraft
  value: PermissionDraft
  assignmentDelta?: number
}) {
  const changes = permissionChanges(baseline, value)

  return (
    <div className="impact-summary" aria-live="polite">
      <h3>Access impact</h3>
      {changes.length === 0 && assignmentDelta === 0 ? (
        <p className="muted">No access changes yet.</p>
      ) : (
        <ul>
          {changes.map((change) => (
            <li className={change.tone} key={change.key}>{change.text}</li>
          ))}
          {assignmentDelta !== 0 ? (
            <li className={assignmentDelta > 0 ? 'add' : 'remove'}>
              {assignmentDelta > 0 ? 'Adds' : 'Removes'} {Math.abs(assignmentDelta)} record {Math.abs(assignmentDelta) === 1 ? 'assignment' : 'assignments'}.
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}

export const allowedCapabilities: Record<
  keyof PermissionDraft,
  ModuleCapability[]
> = {
  people: ['view', 'create', 'edit'],
  companies: ['view', 'create', 'edit'],
  pipeline: ['view', 'create', 'edit', 'move'],
  projects: ['view', 'create', 'edit', 'move'],
  tasks: ['view', 'create', 'edit', 'move'],
  calendar: ['view', 'create', 'edit', 'move'],
  inbox: ['view', 'reply'],
  files: ['view', 'upload'],
}
