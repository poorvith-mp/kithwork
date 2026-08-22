# Kithwork Dashboard — Setup & Customization Guide

Kithwork is a modern, modular, and customizable dashboard workspace template built with **React 19**, **Vite**, **Tailwind CSS v4**, and **PaceUI** design aesthetics.

It is designed to be used both as an **instant, zero-config frontend template** and as a **full-stack operational workspace** backed by Supabase and Cloudflare Workers.

---

## 1. Quickstart (Zero-Config Demo Mode)

By default, Kithwork runs out-of-the-box with pre-populated, interactive demo data. No database or external services are required to start developing or customizing the frontend.

```bash
# 1. Clone the repository
git clone https://github.com/poorvith-mp/kithwork.git
cd kithwork

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit `http://localhost:5173/` in your browser. You will land straight into the full interactive dashboard.

---

## 2. Project Architecture & Directory Structure

```
kithwork/
├── src/
│   ├── app/
│   │   ├── App.tsx                     # Route definitions & layout wrapping
│   │   ├── ApplicationRoot.tsx         # Root container
│   │   └── ConfiguredApplication.tsx   # BrowserRouter & AuthProvider entry
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx            # Main shell with collapsible sidebar state
│   │   │   ├── Sidebar.tsx             # Collapsible dark sidebar with grouped sections & badges
│   │   │   ├── Topbar.tsx              # Glassmorphic topbar with ⌘K search & breadcrumbs
│   │   │   ├── MobileNav.tsx           # Mobile navigation bar
│   │   │   └── navigation.ts           # Navigation menu configuration
│   │   ├── ui/
│   │   │   ├── DataTable.tsx           # Type-safe table with search, filters, multi-select, export & row actions
│   │   │   ├── StatsCard.tsx           # Metric KPI cards with SVG sparklines & trend badges
│   │   │   ├── Chart.tsx               # Recharts wrappers (AreaChartCard, BarChartCard, DonutChartCard)
│   │   │   ├── Avatar.tsx              # Avatars, initials fallback & AvatarGroup
│   │   │   ├── Badge.tsx               # Status pill badges with pulsing animated dots
│   │   │   ├── CalendarWidget.tsx      # Interactive mini-calendar widget
│   │   │   ├── CommandPalette.tsx      # Global ⌘K search overlay with keyboard shortcuts
│   │   │   ├── ActivityFeed.tsx        # Vertical timeline feed
│   │   │   ├── KanbanBoard.tsx         # Drag-friendly Kanban columns & cards
│   │   │   ├── UserProfileCard.tsx     # Profile summary cards
│   │   │   ├── Toast.tsx               # Stacked notification toast provider & hook
│   │   │   ├── Skeleton.tsx            # Shimmer loading placeholders
│   │   │   ├── Overlay.tsx             # Slide-over Drawers & Modals
│   │   │   ├── Panel.tsx               # Content containers
│   │   │   ├── Button.tsx              # Styled buttons (primary, secondary, ghost, danger)
│   │   │   └── Field.tsx               # Accessible form controls (Input, Select, Textarea)
│   │   └── shared/
│   │       └── PageHeader.tsx          # Responsive page header with eyebrow & action buttons
│   ├── features/
│   │   ├── home/                       # Overview dashboard with sparklines, Recharts & activity feed
│   │   ├── people/                     # Customers & relationships table with tabbed PersonDetailDrawer
│   │   ├── companies/                  # Company directory & accounts
│   │   ├── pipeline/                   # Deal pipeline Kanban board
│   │   ├── projects/                   # Project tracking & progress bars
│   │   ├── tasks/                      # Task board, list view, and timer controls
│   │   ├── calendar/                   # Appointment delivery & scheduling
│   │   ├── inbox/                      # Inbound enquiries & split-view conversation threading
│   │   ├── files/                      # Asset & document manager with signed URL triggers
│   │   ├── marketing/                  # Campaigns & audience segments
│   │   ├── reports/                    # Visual report generators with JSON export
│   │   ├── analytics/                  # Full business analytics dashboard (/analytics)
│   │   ├── payments/                   # Invoices, billing, and payout dashboard (/payments)
│   │   ├── settings/                   # Operating rules & security configuration
│   │   ├── trash/                      # Soft-deleted records with 30-day purge restore
│   │   ├── collaborators/              # Access management & audit trail
│   │   └── profile/                    # Personal profile, authenticators & active sessions
│   ├── lib/
│   │   ├── data.ts                     # CRUD data layer with automatic demo fallback
│   │   ├── demoData.ts                 # Pre-populated domain mock data
│   │   ├── permissions.ts              # Role-based access control (RBAC) helpers
│   │   └── supabase.ts                 # Supabase client singleton
│   └── tailwind.css                    # Tailwind CSS v4 design tokens via @theme
```

---

## 3. Customization Guide

### 3.1 Customizing Navigation & Menus
To add, remove, or reorder sidebar and mobile menu items, edit `src/components/layout/navigation.ts`:

```ts
export const navigationGroups = [
  {
    label: 'Workspace',
    items: [
      { label: 'Home', href: '/', icon: Home },
      { label: 'Customers', href: '/people', icon: Users, badge: 'new' },
      { label: 'Pipeline', href: '/pipeline', icon: BriefcaseBusiness },
      { label: 'Analytics', href: '/analytics', icon: LineChart, badge: 'new' },
      // Add your custom menu item here:
      { label: 'My Custom Section', href: '/custom', icon: Star },
    ],
  },
]
```

### 3.2 Changing Color Palette & Design Tokens
All design tokens are configured in CSS-first syntax in `src/tailwind.css`:

```css
@theme {
  --color-canvas: #f7f6f2;          /* Page background */
  --color-surface: #ffffff;         /* Card / container surface */
  --color-ink: #17201b;             /* Primary text */
  --color-muted: #67736c;           /* Secondary text */
  
  --color-accent: #087f5b;          /* Brand primary (Emerald) */
  --color-accent-strong: #066246;   /* Brand hover state */
  --color-accent-soft: #e4f4ed;     /* Brand soft background */
  
  --color-sidebar: #111814;         /* Dark sidebar background */
  --color-sidebar-text: #aebbb3;    /* Sidebar item text */
}
```

### 3.3 Adding a New Page / Route
1. Create your component in `src/features/my-feature/MyPage.tsx`:
```tsx
import { PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/ui/Panel'

export function MyPage() {
  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 space-y-6">
      <PageHeader title="Custom Feature" description="My new page description." />
      <Panel title="Overview">
        <p>Custom content goes here.</p>
      </Panel>
    </div>
  )
}
```
2. Register the route in `src/app/App.tsx`:
```tsx
<Route path="/custom" element={<MyPage />} />
```

---

## 4. Optional: Connecting Supabase Backend & Database

If you wish to connect your own hosted Supabase project:

### 4.1 Environment Variables
Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
VITE_APP_ORIGIN=http://localhost:5173
```

### 4.2 Applying Database Migrations
Kithwork includes SQL migrations with Row Level Security (RLS) policies in `supabase/migrations/`:

```bash
# Link your project
npx supabase link --project-ref your-project-ref

# Apply migrations
npx supabase db push
```

---

## 5. Verification & Testing

Kithwork includes a full test suite with TypeScript typechecking and Vitest:

```bash
# Run TypeScript compilation check
npm run typecheck

# Run unit tests
npm test

# Build production bundle
npm run build
```

---

## 6. License

This project is licensed under the [AGPL-3.0-or-later](LICENSE) license.
