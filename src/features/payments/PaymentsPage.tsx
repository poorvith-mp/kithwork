import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  Filter,
  Landmark,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable, type RowAction } from '@/components/ui/DataTable'
import { Drawer } from '@/components/ui/Overlay'
import { Panel } from '@/components/ui/Panel'
import { StatsCard } from '@/components/ui/StatsCard'
import { money, shortDate } from '@/lib/data'

type Invoice = {
  id: string
  invoice_number: string
  customer_name: string
  customer_email: string
  amount: number
  status: 'paid' | 'pending' | 'refunded' | 'overdue'
  payment_method: string
  issued_at: string
  due_at: string
}

const demoInvoices: Invoice[] = [
  {
    id: 'inv-1',
    invoice_number: 'INV-2026-001',
    customer_name: 'Sarah Jenkins',
    customer_email: 'sarah.jenkins@acmecorp.com',
    amount: 24000,
    status: 'paid',
    payment_method: 'Stripe · Visa **** 4242',
    issued_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25).toISOString(),
  },
  {
    id: 'inv-2',
    invoice_number: 'INV-2026-002',
    customer_name: 'David Miller',
    customer_email: 'david.m@apexlogistics.io',
    amount: 11250,
    status: 'pending',
    payment_method: 'ACH Wire Transfer',
    issued_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
  },
  {
    id: 'inv-3',
    invoice_number: 'INV-2026-003',
    customer_name: 'Elena Rostova',
    customer_email: 'elena@novadesign.co',
    amount: 32500,
    status: 'paid',
    payment_method: 'Stripe · Mastercard **** 8821',
    issued_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 16).toISOString(),
  },
  {
    id: 'inv-4',
    invoice_number: 'INV-2026-004',
    customer_name: 'Marcus Chen',
    customer_email: 'marcus.chen@quantumsoft.com',
    amount: 8500,
    status: 'pending',
    payment_method: 'Stripe · Amex **** 1004',
    issued_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: 'inv-5',
    invoice_number: 'INV-2026-005',
    customer_name: 'Amara Okonkwo',
    customer_email: 'amara@solargreen.org',
    amount: 18000,
    status: 'paid',
    payment_method: 'Direct Bank Wire',
    issued_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
    due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 'inv-6',
    invoice_number: 'INV-2026-006',
    customer_name: 'TechFlow Systems',
    customer_email: 'billing@techflow.dev',
    amount: 4200,
    status: 'refunded',
    payment_method: 'Stripe · Visa **** 9012',
    issued_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    due_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
]

export function PaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(demoInvoices)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return invoices
    return invoices.filter((inv) => inv.status === statusFilter)
  }, [invoices, statusFilter])

  const totalCollected = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0)
  const pendingTotal = invoices
    .filter((i) => i.status === 'pending')
    .reduce((sum, i) => sum + i.amount, 0)

  const columns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      label: 'Invoice',
      sortable: true,
      render: (inv) => (
        <div>
          <strong className="font-semibold text-ink block">{inv.invoice_number}</strong>
          <small className="text-muted text-[0.68rem]">{shortDate(inv.issued_at)}</small>
        </div>
      ),
    },
    {
      key: 'customer_name',
      label: 'Customer',
      sortable: true,
      render: (inv) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={inv.customer_name} size="sm" />
          <div className="min-w-0">
            <strong className="font-semibold text-ink block truncate">{inv.customer_name}</strong>
            <small className="text-muted text-xs block truncate">{inv.customer_email}</small>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (inv) => (
        <strong className="font-bold text-ink text-xs">{money(inv.amount)}</strong>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (inv) => {
        const variant =
          inv.status === 'paid'
            ? 'success'
            : inv.status === 'pending'
              ? 'warning'
              : inv.status === 'refunded'
                ? 'default'
                : 'danger'
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold">
            <Badge dot variant={variant} />
            <span className="capitalize">{inv.status}</span>
          </span>
        )
      },
    },
    {
      key: 'payment_method',
      label: 'Payment Method',
      render: (inv) => (
        <span className="text-muted text-xs truncate max-w-[180px] block">
          {inv.payment_method}
        </span>
      ),
    },
    {
      key: 'due_at',
      label: 'Due Date',
      render: (inv) => (
        <span className="text-muted text-xs">{shortDate(inv.due_at)}</span>
      ),
    },
  ]

  const rowActions: RowAction<Invoice>[] = [
    {
      label: 'View details',
      icon: <Eye size={13} />,
      onClick: (inv) => setViewingInvoice(inv),
    },
    {
      label: 'Download PDF',
      icon: <Download size={13} />,
      onClick: (inv) => alert(`Downloading PDF for ${inv.invoice_number}`),
    },
    {
      label: 'Resend receipt',
      icon: <Send size={13} />,
      onClick: (inv) => alert(`Receipt sent to ${inv.customer_email}`),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 space-y-6">
      <PageHeader
        eyebrow="Billing & Revenue"
        title="Payments & Invoices"
        description="Track client retainers, outbound invoices, payment methods, and revenue payouts."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="success">Demo Mode</Badge>
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} />
              <span>Create invoice</span>
            </Button>
          </div>
        }
      />

      {/* 4 Stats Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Collected"
          value={money(totalCollected)}
          icon={<DollarSign size={18} />}
          trend={14.8}
          trendLabel="vs last month"
          sparklineData={[30, 42, 38, 55, 60, 75, 70, 94]}
        />
        <StatsCard
          label="Pending Invoices"
          value={money(pendingTotal)}
          icon={<Clock size={18} />}
          trend={-2.4}
          trendLabel="2 awaiting wire"
          sparklineData={[25, 20, 22, 18, 15, 12, 14, 11]}
        />
        <StatsCard
          label="Collection Rate"
          value="98.2%"
          icon={<ShieldCheck size={18} />}
          trend={1.2}
          trendLabel="on-time payments"
          sparklineData={[94, 95, 96, 95, 97, 97, 98, 98]}
        />
        <StatsCard
          label="Avg Invoice Value"
          value={money(18400)}
          icon={<TrendingUp size={18} />}
          trend={6.5}
          trendLabel="retainer growth"
          sparklineData={[12, 14, 15, 16, 16, 17, 18, 18]}
        />
      </section>

      {/* Main Content Grid: Invoices Table & Payment Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Invoices DataTable (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            searchPlaceholder="Search invoices by number, client, email..."
            searchFields={['invoice_number', 'customer_name', 'customer_email']}
            selectable
            rowActions={rowActions}
            onRowClick={(inv) => setViewingInvoice(inv)}
            filters={
              <div className="flex items-center gap-1.5">
                <Filter size={13} className="text-muted" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            }
          />
        </div>

        {/* Payment Methods & Payouts (1 col) */}
        <div className="space-y-6">
          {/* Payout Schedule */}
          <Panel title="Payout Schedule">
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-line bg-surface-muted/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted font-medium">Next Bank Transfer</span>
                  <Badge variant="success">Auto-daily</Badge>
                </div>
                <strong className="text-xl font-extrabold text-ink block">{money(19750)}</strong>
                <span className="text-muted text-[0.7rem] block">Scheduled for tomorrow to Chase Business (...4012)</span>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-line text-muted">
                <span>Last Payout</span>
                <strong className="text-ink">{money(32500)} (Jul 28)</strong>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-line text-muted">
                <span>Payout Account</span>
                <strong className="text-ink flex items-center gap-1">
                  <Landmark size={13} />
                  Chase Bank **** 4012
                </strong>
              </div>
            </div>
          </Panel>

          {/* Payment Gateways */}
          <Panel title="Configured Gateways">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-surface">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">
                    S
                  </div>
                  <div>
                    <strong className="font-semibold text-ink block">Stripe Payments</strong>
                    <span className="text-muted text-[0.68rem]">Credit Cards, Apple Pay, Google Pay</span>
                  </div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-surface">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs">
                    ACH
                  </div>
                  <div>
                    <strong className="font-semibold text-ink block">Bank Wire / ACH</strong>
                    <span className="text-muted text-[0.68rem]">Direct bank transfers for retainers</span>
                  </div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Invoice Detail Drawer */}
      <Drawer
        title="Invoice Details"
        open={Boolean(viewingInvoice)}
        onClose={() => setViewingInvoice(null)}
      >
        {viewingInvoice ? (
          <div className="space-y-6 text-xs">
            <div className="rounded-xl border border-line bg-surface-muted/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">{viewingInvoice.invoice_number}</h2>
                <Badge variant={viewingInvoice.status === 'paid' ? 'success' : 'warning'}>
                  {viewingInvoice.status}
                </Badge>
              </div>
              <strong className="text-2xl font-extrabold text-accent block">
                {money(viewingInvoice.amount)}
              </strong>
              <p className="text-muted text-xs">
                Issued {shortDate(viewingInvoice.issued_at)} · Due {shortDate(viewingInvoice.due_at)}
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Customer</h3>
              <div className="flex items-center gap-3">
                <Avatar name={viewingInvoice.customer_name} size="md" />
                <div>
                  <strong className="text-sm font-semibold text-ink block">
                    {viewingInvoice.customer_name}
                  </strong>
                  <small className="text-muted">{viewingInvoice.customer_email}</small>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Payment Method</h3>
              <p className="font-semibold text-ink">{viewingInvoice.payment_method}</p>
            </div>

            <div className="flex gap-2 pt-4 border-t border-line">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => alert(`Downloading PDF for ${viewingInvoice.invoice_number}`)}
              >
                <Download size={14} />
                <span>Download PDF</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => alert(`Sent invoice to ${viewingInvoice.customer_email}`)}
              >
                <Send size={14} />
                <span>Resend</span>
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Create Invoice Drawer */}
      <Drawer
        title="Create New Invoice"
        open={creating}
        onClose={() => setCreating(false)}
      >
        <form
          className="space-y-4 text-xs"
          onSubmit={(e) => {
            e.preventDefault()
            alert('Invoice generated in demo mode!')
            setCreating(false)
          }}
        >
          <div>
            <label className="block font-semibold text-ink mb-1">Customer Name</label>
            <input
              required
              placeholder="e.g. Acme Corp / Sarah Jenkins"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-ink mb-1">Customer Email</label>
            <input
              type="email"
              required
              placeholder="billing@company.com"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-ink mb-1">Amount ($ USD)</label>
            <input
              type="number"
              required
              placeholder="5000"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-ink mb-1">Due Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs focus:border-accent focus:outline-none"
            />
          </div>
          <Button type="submit" className="w-full mt-4">
            Issue Invoice
          </Button>
        </form>
      </Drawer>
    </div>
  )
}
