import { Button } from '@/components/ui/Button'
import type { ModuleCapability } from '@/lib/permissions'

import { AccessImpactSummary, allowedCapabilities, permissionChanges } from './AccessImpactSummary'
import type { CollaboratorModule, PermissionDraft } from './types'

const moduleCopy: Record<CollaboratorModule, { label: string; description: string }> = {
  people: { label: 'People', description: 'Assigned contacts and their details.' },
  companies: { label: 'Companies', description: 'Assigned organizations and relationships.' },
  pipeline: { label: 'Pipeline', description: 'Assigned opportunities and stage movement.' },
  projects: { label: 'Projects', description: 'Assigned delivery work and status updates.' },
  tasks: { label: 'Tasks', description: 'Assigned tasks, progress, and movement.' },
  calendar: { label: 'Calendar', description: 'Assigned scheduling records and updates.' },
  inbox: { label: 'Inbox', description: 'Assigned conversations and replies.' },
  files: { label: 'Files', description: 'Assigned private files and uploads.' },
}

const capabilityLabels: Record<ModuleCapability, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  reply: 'Reply',
  upload: 'Upload',
  move: 'Move',
}

function toggleCapability(
  draft: PermissionDraft,
  module: CollaboratorModule,
  capability: ModuleCapability,
) {
  const current = new Set(draft[module] ?? [])
  if (current.has(capability)) {
    if (capability === 'view') current.clear()
    else current.delete(capability)
  } else {
    current.add(capability)
    current.add('view')
  }

  const next = { ...draft }
  if (current.size === 0) delete next[module]
  else next[module] = allowedCapabilities[module].filter((item) => current.has(item))
  return next
}

type Props = {
  baseline: PermissionDraft
  value: PermissionDraft
  onChange: (value: PermissionDraft) => void
  onConfirm?: (value: PermissionDraft) => void
  confirmBusy?: boolean
}

export function PermissionEditor({
  baseline,
  value,
  onChange,
  onConfirm,
  confirmBusy = false,
}: Props) {
  const change = (module: CollaboratorModule, capability: ModuleCapability) => {
    const next = toggleCapability(value, module, capability)
    onChange(next)
  }
  const changed = permissionChanges(baseline, value).length > 0

  return (
    <div className="permission-editor stack">
      <div className="permission-list">
        {(Object.keys(moduleCopy) as CollaboratorModule[]).map((module) => (
          <fieldset className="permission-module" key={module}>
            <legend>{moduleCopy[module].label}</legend>
            <p>{moduleCopy[module].description}</p>
            <div className="capability-list">
              {allowedCapabilities[module].map((capability) => (
                <label key={capability}>
                  <input
                    type="checkbox"
                    checked={value[module]?.includes(capability) ?? false}
                    onChange={() => change(module, capability)}
                    aria-label={`${capabilityLabels[capability]} ${module}`}
                  />
                  <span>{capabilityLabels[capability]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <AccessImpactSummary baseline={baseline} value={value}/>
      {onConfirm ? (
        <Button type="button" onClick={() => onConfirm(value)} disabled={!changed || confirmBusy}>
          {confirmBusy ? 'Saving…' : 'Confirm access change'}
        </Button>
      ) : null}
    </div>
  )
}
