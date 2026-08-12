import { type ReactNode, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  MoreHorizontal,
  Search,
  Trash2,
} from 'lucide-react'

export type Column<T> = {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => ReactNode
  className?: string
}

export type RowAction<T> = {
  label: string
  icon?: ReactNode
  onClick: (row: T) => void
  danger?: boolean
}

export type DataTableProps<T> = {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  searchPlaceholder?: string
  searchFields?: (keyof T)[]
  filters?: ReactNode
  toolbarActions?: ReactNode
  pageSize?: number
  selectable?: boolean
  rowActions?: RowAction<T>[]
  onRowClick?: (row: T) => void
  onBulkDelete?: (selectedItems: T[]) => void
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  searchPlaceholder = 'Search…',
  searchFields = [],
  filters,
  toolbarActions,
  pageSize = 10,
  selectable = false,
  rowActions,
  onRowClick,
  onBulkDelete,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filters.',
  className = '',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      searchFields.some((field) => {
        const val = row[field]
        return typeof val === 'string' && val.toLowerCase().includes(q)
      }),
    )
  }, [data, search, searchFields])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paged = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize)

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const allSelectedOnPage =
    paged.length > 0 && paged.every((row) => selectedIds.has(String(row[keyField])))

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelectedOnPage) {
        paged.forEach((row) => next.delete(String(row[keyField])))
      } else {
        paged.forEach((row) => next.add(String(row[keyField])))
      }
      return next
    })
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exportSelectedCsv = () => {
    const selectedRows = data.filter((row) => selectedIds.has(String(row[keyField])))
    const rowsToExport = selectedRows.length > 0 ? selectedRows : data
    const headers = columns.map((c) => c.label).filter(Boolean)
    const csvContent = [
      headers.join(','),
      ...rowsToExport.map((row) =>
        columns
          .map((c) => {
            const val = String(row[c.key] ?? '').replace(/"/g, '""')
            return `"${val}"`
          })
          .join(','),
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={`rounded-xl border border-line bg-surface shadow-card ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-line bg-surface-muted/70 py-1.5 pl-9 pr-3 text-xs placeholder:text-muted/60 focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all"
              aria-label="Search table"
            />
          </div>
          {filters}
        </div>

        {/* Action buttons on toolbar */}
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-1 text-xs font-bold text-accent-strong animate-fade-in">
              <span>{selectedIds.size} selected</span>
              {onBulkDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    const items = data.filter((row) => selectedIds.has(String(row[keyField])))
                    onBulkDelete(items)
                    setSelectedIds(new Set())
                  }}
                  className="flex items-center gap-1 text-danger hover:underline ml-2"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={exportSelectedCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer"
            title="Export to CSV"
          >
            <Download size={13} />
            <span>Export</span>
          </button>

          {toolbarActions}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-line bg-surface-muted/30">
              {selectable ? (
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-line-strong accent-accent cursor-pointer"
                    aria-label="Select all rows"
                  />
                </th>
              ) : null}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-[0.68rem] font-bold uppercase tracking-wider text-muted ${col.className ?? ''}`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-ink transition-colors"
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )
                      ) : (
                        <ChevronDown size={12} className="opacity-30" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              {rowActions && rowActions.length > 0 ? (
                <th className="w-10 px-4 py-3 text-right" />
              ) : null}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="px-4 py-16 text-center"
                >
                  <p className="font-semibold text-ink text-sm">{emptyTitle}</p>
                  <p className="mt-1 text-xs text-muted">{emptyDescription}</p>
                </td>
              </tr>
            ) : (
              paged.map((row) => {
                const rowId = String(row[keyField])
                const isSelected = selectedIds.has(rowId)
                return (
                  <tr
                    key={rowId}
                    onClick={() => onRowClick?.(row)}
                    className={`border-b border-line last:border-b-0 transition-colors ${
                      isSelected
                        ? 'bg-accent-soft/40'
                        : onRowClick
                          ? 'cursor-pointer hover:bg-surface-muted/60'
                          : ''
                    }`}
                  >
                    {selectable ? (
                      <td
                        className="px-4 py-3.5"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelectRow(rowId)
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="size-4 rounded border-line-strong accent-accent cursor-pointer"
                          aria-label={`Select row ${rowId}`}
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3.5 text-xs ${col.className ?? ''}`}>
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                    {rowActions && rowActions.length > 0 ? (
                      <td
                        className="px-4 py-3.5 text-right relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === rowId ? null : rowId)}
                          className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer ml-auto"
                          aria-label="Row actions"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        {activeMenuId === rowId ? (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div className="absolute right-4 top-10 z-40 w-36 rounded-lg border border-line bg-surface py-1 shadow-lg animate-slide-up text-left">
                              {rowActions.map((action, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null)
                                    action.onClick(row)
                                  }}
                                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                                    action.danger
                                      ? 'text-danger hover:bg-danger-soft'
                                      : 'text-ink hover:bg-surface-muted'
                                  }`}
                                >
                                  {action.icon}
                                  <span>{action.label}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sorted.length > pageSize ? (
        <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3 text-xs text-muted">
          <span>
            Showing <strong className="text-ink">{safePage * pageSize + 1}</strong> to{' '}
            <strong className="text-ink">
              {Math.min((safePage + 1) * pageSize, sorted.length)}
            </strong>{' '}
            of <strong className="text-ink">{sorted.length}</strong> results
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => p - 1)}
              className="grid size-7 place-items-center rounded-md hover:bg-surface-muted disabled:opacity-30 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                className={`grid size-7 place-items-center rounded-md text-xs font-bold transition-colors ${
                  i === safePage
                    ? 'bg-accent text-white'
                    : 'hover:bg-surface-muted'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="grid size-7 place-items-center rounded-md hover:bg-surface-muted disabled:opacity-30 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
