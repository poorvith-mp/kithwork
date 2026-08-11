import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { InputField, SelectField } from '@/components/ui/Field'
import type { AssignmentInput } from '@/lib/accountApi'

import type { AssignmentCandidate } from './types'

const entityLabels: Record<string, string> = {
  person: 'People',
  company: 'Companies',
  enquiry: 'Enquiries',
  opportunity: 'Pipeline',
  project: 'Projects',
  task: 'Tasks',
  blocked_period: 'Blocked periods',
  slot_request: 'Slot requests',
  appointment: 'Appointments',
  conversation: 'Conversations',
  file: 'Files',
}

const keyOf = (assignment: AssignmentInput) =>
  `${assignment.entityType}:${assignment.entityId}`

type Props = {
  candidates: AssignmentCandidate[]
  selected: AssignmentInput[]
  onChange: (value: AssignmentInput[]) => void
}

export function AssignmentEditor({ candidates, selected, onChange }: Props) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const selectedKeys = useMemo(() => new Set(selected.map(keyOf)), [selected])
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return candidates
      .filter((candidate) => type === 'all' || candidate.entityType === type)
      .filter((candidate) => !query || `${candidate.label} ${candidate.context}`.toLowerCase().includes(query))
      .slice(0, 100)
  }, [candidates, search, type])

  const toggle = (candidate: AssignmentCandidate) => {
    const assignment = {
      entityType: candidate.entityType,
      entityId: candidate.entityId,
    }
    const key = keyOf(assignment)
    onChange(
      selectedKeys.has(key)
        ? selected.filter((item) => keyOf(item) !== key)
        : [...selected, assignment],
    )
  }

  return (
    <div className="assignment-editor stack">
      <div className="assignment-toolbar">
        <div className="field assignment-search">
          <label htmlFor="assignment-search">Search records</label>
          <div className="input-with-icon"><Search size={16}/><input id="assignment-search" className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, title, email…"/></div>
        </div>
        <SelectField id="assignment-type" label="Record type" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="all">All record types</option>
          {Object.entries(entityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </SelectField>
      </div>
      <p className="muted">{selected.length} specifically assigned {selected.length === 1 ? 'record' : 'records'}. Related child records remain governed by the approved inheritance rules.</p>
      <div className="assignment-list" role="group" aria-label="Record assignments">
        {visible.length > 0 ? visible.map((candidate) => (
          <label className="assignment-row" key={`${candidate.entityType}:${candidate.entityId}`}>
            <input type="checkbox" checked={selectedKeys.has(`${candidate.entityType}:${candidate.entityId}`)} onChange={() => toggle(candidate)}/>
            <span className="grow"><strong>{candidate.label}</strong><small>{candidate.context}</small></span>
            <span className="badge">{entityLabels[candidate.entityType] ?? candidate.entityType}</span>
          </label>
        )) : <div className="empty compact"><p>No matching records.</p></div>}
      </div>
    </div>
  )
}
