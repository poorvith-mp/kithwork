import { Download, File, Trash2, Upload } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable } from '@/components/ui/DataTable'
import { Drawer } from '@/components/ui/Overlay'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRows } from '@/hooks/useRows'
import { insertRow, shortDate, trashRow } from '@/lib/data'
import { supabase } from '@/lib/supabase'

type FileRow = {
  id: string
  storage_path: string
  original_name: string
  extension: string
  mime_type: string
  size_bytes: number
  source: string
  created_at: string
}

const allowed = ['md', 'pdf', 'doc', 'docx', 'xlsx']

export function FilesPage() {
  const { user } = useAuth()
  const { data, loading, error, refresh } = useRows<FileRow>('files', 'created_at')
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<globalThis.File | null>(null)
  const [busy, setBusy] = useState(false)

  const upload = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!allowed.includes(extension) || file.size > 5 * 1024 * 1024) {
      return alert('Choose one .md, .pdf, .doc, .docx, or .xlsx file up to 5MB.')
    }
    setBusy(true)
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${user!.id}/owner/${crypto.randomUUID()}-${safe}`
    const result = await supabase.storage
      .from('client-files')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (result.error) {
      setBusy(false)
      return alert(result.error.message)
    }
    try {
      await insertRow('files', {
        owner_id: user!.id,
        storage_path: path,
        original_name: file.name,
        safe_name: safe,
        extension,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        source: 'owner_upload',
      })
      setFile(null)
      setOpen(false)
      await refresh()
    } catch (value) {
      await supabase.storage.from('client-files').remove([path])
      alert(value instanceof Error ? value.message : 'Unable to record file')
    } finally {
      setBusy(false)
    }
  }

  const download = async (item: FileRow) => {
    const { data: signed, error: signedError } = await supabase.storage
      .from('client-files')
      .createSignedUrl(item.storage_path, 60, { download: item.original_name })
    if (signedError) return alert(signedError.message)
    window.location.assign(signed.signedUrl)
  }

  const columns: Column<FileRow>[] = [
    {
      key: 'name',
      label: 'File',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-surface-muted text-muted">
            <File size={16} />
          </span>
          <strong className="font-semibold text-ink">{item.original_name}</strong>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (item) => <Badge>{item.extension.toUpperCase()}</Badge>,
    },
    {
      key: 'size',
      label: 'Size',
      render: (item) => (
        <span className="text-muted text-xs">{(item.size_bytes / 1024).toFixed(1)} KB</span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      render: (item) => (
        <span className="text-muted text-xs">{item.source.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Added',
      sortable: true,
      render: (item) => (
        <span className="text-muted text-xs">{shortDate(item.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-24 text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={() => void download(item)}
            aria-label="Download file"
          >
            <Download size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Move to Trash"
            onClick={async () => {
              if (confirm('Move this file record to Trash?')) {
                await trashRow('files', item.id)
                await refresh()
              }
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="Documents"
        title="Files"
        description="Private client context with signed, short-lived downloads. One file per public submission, maximum 5MB."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Upload size={16} />
            <span>Upload</span>
          </Button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-[#ffd5d0] bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          keyField="id"
          searchPlaceholder="Search files by name..."
          searchFields={['original_name', 'extension']}
          emptyTitle="No files yet"
          emptyDescription="Allowed: Markdown, PDF, Word, and Excel files up to 5MB."
        />
      )}

      <Drawer title="Upload private file" open={open} onClose={() => setOpen(false)}>
        <form className="flex flex-col gap-4" onSubmit={upload}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="owner-file" className="text-sm font-semibold">
              File
            </label>
            <input
              id="owner-file"
              className="w-full rounded-[10px] border border-line bg-surface p-3 text-sm text-ink focus:border-accent focus:outline-none"
              type="file"
              accept=".md,.pdf,.doc,.docx,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
            <small className="text-xs text-muted">
              The file is stored privately. Downloads expire after 60 seconds.
            </small>
          </div>
          <Button disabled={busy || !file} loading={busy}>
            {busy ? 'Uploading…' : 'Upload file'}
          </Button>
        </form>
      </Drawer>
    </div>
  )
}
