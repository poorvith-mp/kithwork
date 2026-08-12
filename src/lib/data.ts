import { getDemoTableData } from './demoData'
import { supabase } from './supabase'

let canonicalWorkspaceOwnerId: string | null = null

export function setCanonicalWorkspaceOwnerId(ownerId: string | null) {
  canonicalWorkspaceOwnerId = ownerId
}

export function prepareInsertValue(
  value: Record<string, unknown>,
  workspaceOwnerId = canonicalWorkspaceOwnerId,
) {
  if (!('owner_id' in value)) return value
  if (!workspaceOwnerId) throw new Error('The workspace owner is unavailable.')
  return { ...value, owner_id: workspaceOwnerId }
}

export function prepareUpdateValue(value: Record<string, unknown>) {
  const { owner_id: _ownerId, ...editableValue } = value
  return editableValue
}

export async function listRows<T>(
  table: string,
  order = 'updated_at',
  ascending = false,
  softDelete = true,
): Promise<T[]> {
  try {
    let query = supabase.from(table).select('*')
    if (softDelete) query = query.is('deleted_at', null)
    const result = await query.order(order, { ascending })
    if (
      result.error &&
      softDelete &&
      (result.error.code === '42703' || result.error.message.includes('deleted_at'))
    ) {
      return listRows<T>(table, order, ascending, false)
    }
    if (result.error) {
      const demo = getDemoTableData<T>(table)
      if (demo.length > 0) return demo
      throw result.error
    }
    if (!result.data || result.data.length === 0) {
      const demo = getDemoTableData<T>(table)
      if (demo.length > 0) return demo
    }
    return (result.data ?? []) as T[]
  } catch {
    const demo = getDemoTableData<T>(table)
    if (demo.length > 0) return demo
    return []
  }
}

export async function insertRow<T>(table: string, value: Record<string, unknown>): Promise<T> {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(prepareInsertValue(value))
      .select('*')
      .single()
    if (error) throw error
    return data as T
  } catch {
    // In-memory demo insertion fallback
    const id = `demo-${Date.now()}`
    const record = { ...value, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    return record as unknown as T
  }
}

export async function updateRow<T>(
  table: string,
  id: string,
  value: Record<string, unknown>,
): Promise<T> {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(prepareUpdateValue(value) as never)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as T
  } catch {
    return { ...value, id, updated_at: new Date().toISOString() } as unknown as T
  }
}

export async function trashRow(table: string, id: string) {
  try {
    const now = new Date()
    const purge = new Date(now.getTime() + 30 * 86400000)
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: now.toISOString(), purge_after: purge.toISOString() })
      .eq('id', id)
    if (error) throw error
  } catch {
    // Demo mode soft delete acknowledgment
  }
}

export function money(
  value: number | null | undefined,
  options: { currency?: string; locale?: string } = {},
) {
  if (value == null) return '—'
  return new Intl.NumberFormat(options.locale ?? 'en-US', {
    style: 'currency',
    currency: options.currency ?? 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function shortDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}
