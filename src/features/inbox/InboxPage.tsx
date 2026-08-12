import { Inbox, Send } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TextareaField } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRows } from '@/hooks/useRows'
import { supabase } from '@/lib/supabase'

type Conversation = {
  id: string
  person_id: string
  subject: string
  status: string
  reply_needed: boolean
  last_message_at: string
}
type Message = {
  id: string
  conversation_id: string
  direction: string
  sender_email: string
  body_text: string
  status: string
  created_at: string
}
type Person = { id: string; first_name: string; last_name: string | null; email: string | null }

export function InboxPage() {
  const { session } = useAuth()
  const { data: conversations, refresh } = useRows<Conversation>(
    'conversations',
    'last_message_at',
  )
  const { data: messages, refresh: refreshMessages } = useRows<Message>(
    'messages',
    'created_at',
    false,
  )
  const { data: people } = useRows<Person>('people')
  const [selected, setSelected] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const active = conversations.find((c) => c.id === (selected ?? conversations[0]?.id))
  const thread = useMemo(
    () =>
      messages
        .filter((m) => m.conversation_id === active?.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [active, messages],
  )

  const person = (id: string) => {
    const p = people.find((value) => value.id === id)
    return p ? `${p.first_name} ${p.last_name ?? ''}`.trim() : 'Client'
  }

  const send = async () => {
    if (!active || !body.trim()) return
    setSending(true)
    const { error } = await supabase.functions.invoke('send-email', {
      body: { conversationId: active.id, body: body.trim() },
      headers: { Authorization: `Bearer ${session!.access_token}` },
    })
    setSending(false)
    if (error) return alert(error.message)
    setBody('')
    await Promise.all([refresh(), refreshMessages()])
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="Communication"
        title="Inbox"
        description="Website enquiries and Resend email replies stay together as one client thread."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr] min-h-[calc(100vh-220px)]">
        {/* Conversation List */}
        <Panel className="flex flex-col" noPadding>
          <div className="border-b border-line p-4">
            <h3 className="text-sm font-bold">Conversations</h3>
          </div>
          <div className="flex flex-1 flex-col divide-y divide-line overflow-y-auto max-h-[600px]">
            {conversations.length ? (
              conversations.map((item) => {
                const isCurrent = active?.id === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    className={`flex flex-col gap-1 p-3.5 text-left transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-accent-soft text-ink'
                        : 'hover:bg-surface-muted/60 text-ink'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm font-semibold truncate">
                        {person(item.person_id)}
                      </strong>
                      {item.reply_needed ? <Badge variant="warning">Reply</Badge> : null}
                    </div>
                    <span className="text-xs text-muted truncate">{item.subject}</span>
                    <small className="text-[0.65rem] text-muted/70">
                      {new Date(item.last_message_at).toLocaleString('en-IN')}
                    </small>
                  </button>
                )
              })
            ) : (
              <div className="flex flex-col items-center py-12 text-center text-muted">
                <Inbox size={32} className="mb-2 opacity-40 text-accent" />
                <p className="text-sm">No conversations yet.</p>
              </div>
            )}
          </div>
        </Panel>

        {/* Message Thread */}
        <Panel
          title={active?.subject ?? 'Select a conversation'}
          className="flex flex-col"
        >
          {active ? (
            <div className="flex flex-1 flex-col justify-between gap-4">
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[440px] pr-2">
                {thread.map((message) => {
                  const isOutbound = message.direction === 'outbound'
                  return (
                    <article
                      key={message.id}
                      className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                        isOutbound
                          ? 'self-end bg-accent-soft text-ink rounded-br-none'
                          : 'self-start bg-surface-muted text-ink rounded-bl-none border border-line'
                      }`}
                    >
                      <small className="block text-xs font-bold text-muted mb-1">
                        {isOutbound ? 'You' : message.sender_email}
                      </small>
                      <p className="whitespace-pre-wrap">{message.body_text}</p>
                      <span className="mt-2 block text-[0.65rem] text-muted">
                        {new Date(message.created_at).toLocaleString('en-IN')} · {message.status}
                      </span>
                    </article>
                  )
                })}
              </div>

              <div className="border-t border-line pt-4 space-y-3">
                <TextareaField
                  label="Reply by email"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your reply…"
                />
                <Button
                  disabled={sending || !body.trim()}
                  onClick={() => void send()}
                  loading={sending}
                >
                  <Send size={15} />
                  <span>{sending ? 'Queueing…' : 'Queue reply'}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 text-center text-muted">
              <p className="text-sm">Choose a client thread to view messages.</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
