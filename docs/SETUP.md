# Set up Kithwork with your own Supabase and Vercel projects

This guide creates a new Kithwork installation. Do not point it at an existing database or reuse another application's credentials.

Kithwork uses one Supabase project per workspace. The first Auth user created after the migrations becomes the owner. Every later account must be invited by that owner.

The public Kithwork deployment is a read-only frontend preview, not a hosted service. When the required `VITE_` variables are absent, Kithwork shows fictional compiled data and makes no Supabase request. Following this guide replaces that preview with your own complete installation.

## Before you start

You need:

- Node.js 22 or newer.
- A new Supabase project you control.
- A Vercel account and project you control.
- Git.
- An authenticator app that supports TOTP.
- Optional: a Resend account with a verified sender domain.

The repository pins the Supabase CLI as a development dependency. Run its commands with `npx supabase` from the repository root.

## 1. Fork or clone the repository

Fork the repository if you plan to keep your changes in GitHub. Otherwise clone it directly:

```bash
git clone https://github.com/prvthmpcypher/kithwork.git
cd kithwork
npm install
```

Run the application checks before adding credentials:

```bash
npm test
npm run typecheck
npm run build
```

## 2. Create a clean Supabase project

Create a project from the [Supabase dashboard](https://database.new). Keep its database password in a password manager.

Do not create an Auth user yet. The migrations install the owner bootstrap trigger, RLS policies, and protected functions first.

From the repository root:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

Read the dry-run output. It should target the new project and apply only the migrations in `supabase/migrations/`. Do not use `db reset --linked` on a project containing data; that command is destructive.

Supabase documents this migration workflow in its [database migration guide](https://supabase.com/docs/guides/deployment/database-migrations).

## 3. Verify the database boundary

In the Supabase SQL editor, check that every public table has RLS enabled:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Every returned application table must show `rowsecurity = true`.

Review the policies too:

```sql
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Kithwork's protected paths combine an authenticated role, record or module permission checks, and an AAL2 session requirement. RLS is still required even though the frontend hides inaccessible modules.

If your Supabase project's Data API settings do not expose new tables automatically, grant only the table operations already expected by the migrations. Do not solve a Data API error by disabling RLS or exposing the service-role key.

## 4. Configure Supabase Auth

In Supabase Auth settings:

1. Keep email and password authentication enabled.
2. Disable public signups.
3. Enable TOTP authenticator enrollment and verification.
4. Set the Site URL to your final Kithwork production URL.
5. Add `https://your-kithwork-domain.example/reset-password` to the allowed redirect URLs.
6. Add preview redirect URLs only when those previews use a separate non-production Supabase project.
7. Keep email-change confirmation enabled.

Kithwork requires AAL2 before it loads workspace data. The first login sends the owner through authenticator enrollment. Later logins challenge an enrolled authenticator.

### Create the first owner

After the migrations finish, open Supabase Auth → Users and create one confirmed email/password user. This first user becomes the workspace owner.

Do not create two users at the same time during bootstrap. The schema permits only one owner. Add everyone else through Kithwork's Collaborators page after the owner has completed MFA.

## 5. Deploy the Supabase Edge Functions

Set the required Edge Function secrets. Generate different random values for `CRON_SECRET` and `SESSION_HASH_SECRET`, each at least 32 characters.

```bash
npx supabase secrets set APP_ORIGIN=https://your-kithwork-domain.example
npx supabase secrets set ALLOWED_ORIGINS=https://your-kithwork-domain.example
npx supabase secrets set CRON_SECRET=replace_with_your_random_value
npx supabase secrets set SESSION_HASH_SECRET=replace_with_a_different_random_value
npx supabase functions deploy
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are supplied to deployed Edge Functions by Supabase. Never copy the service-role value into Vite, browser code, documentation, or a public repository.

The deployed functions are:

- `account-sessions`: records and revokes the current user's application sessions.
- `collaborator-admin`: creates invitations and applies owner-approved access.
- `send-email`: queues an authenticated outbound message.
- `process-jobs`: processes queued email jobs after checking `x-cron-secret`.

The function configuration lives in `supabase/config.toml`. Supabase's current deployment steps are in the [Edge Function deployment guide](https://supabase.com/docs/guides/functions/deploy).

## 6. Optional Resend email

Skip this section if you do not need outbound email. Kithwork still works for relationships, projects, tasks, collaboration, files, and reports, but Inbox sends, scheduled reminders, and campaigns will not deliver.

Verify a sender domain in your own Resend account, then set:

```bash
npx supabase secrets set RESEND_API_KEY=re_replace_me
npx supabase secrets set "RESEND_FROM_EMAIL=Kithwork <kithwork@your-verified-domain.example>"
```

Never reuse another installation's Resend API key or sender identity. This release supports outbound delivery only. It does not include an inbound webhook or reply-address parser.

## 7. Configure the application locally

Copy `.env.example` to `.env.local` and replace the placeholders with values from your own Supabase project:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
VITE_APP_ORIGIN=https://your-kithwork-domain.example
VITE_SOURCE_REPOSITORY_URL=https://github.com/your-account/your-kithwork
```

The publishable key is designed for browser use. RLS remains the data boundary. Never use a Supabase secret key or service-role key in a `VITE_` variable.

`.env.local` is ignored by Git. Check that before committing:

```bash
git status --short
```

## 8. Import the project into Vercel

Create a new Vercel project from your Kithwork repository.

Use these build settings:

- Framework preset: Vite.
- Install command: `npm install`.
- Build command: `npm run build`.
- Output directory: `dist`.
- Node.js: 22.

Add these variables to the Vercel Production environment:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_APP_ORIGIN
VITE_SOURCE_REPOSITORY_URL
SUPABASE_URL
CRON_SECRET
```

`VITE_SOURCE_REPOSITORY_URL` is optional but important for a modified public deployment: point it to the corresponding source you make available under the AGPL. Unmodified installs default to the original Kithwork repository. `SUPABASE_URL` is server-only and contains the same project URL as `VITE_SUPABASE_URL`. `CRON_SECRET` must exactly match the secret stored in Supabase so the Vercel function can call `process-jobs`.

Do not give Preview deployments access to your production Supabase project. Either use a separate preview project or leave the preview variables unset.

After the first deployment, update the Supabase Site URL, redirect URL, `APP_ORIGIN`, and `ALLOWED_ORIGINS` if Vercel assigned a different final domain. Redeploy after changing Vite variables because they are compiled into the browser bundle.

## 9. Configure the Vercel cron

`vercel.json` calls `/api/process-jobs` once per day at `00:00 UTC`. That schedule works on Vercel Hobby.

After moving the project to Vercel Pro, you can change the schedule to every 15 minutes:

```json
{
  "path": "/api/process-jobs",
  "schedule": "*/15 * * * *"
}
```

Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically. The Vercel Function verifies it, then forwards the same secret in `x-cron-secret` to Supabase. It does not hold the Supabase service-role key.

Vercel Cron runs on production deployments. Review its invocation logs after release. Current schedule and authentication behavior are documented in [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## 10. Smoke checks

Run these against the deployed application:

1. Sign in as the owner.
2. Enroll a TOTP authenticator and reach an AAL2 session.
3. Create a fictional person, project, and task.
4. Invite a test collaborator, grant one module, and confirm an ungranted direct URL redirects away.
5. Confirm the collaborator sees only assigned records.
6. Open Profile and verify session controls.
7. Upload and remove a small test file if Storage is enabled.
8. Open the Source link and confirm it points to your corresponding source.
9. If Resend is enabled, send only to a test address you control and inspect Supabase plus Vercel logs.

Do not load real customer data until these checks pass.

### Optional fictional starter records

`supabase/demo-data.sql` contains one fictional company, relationship, opportunity, project, and three tasks. It refuses to run when the workspace already contains people, companies, or projects. These records are separate from the compiled read-only frontend preview.

Use it only with a disposable installation you control, after creating the owner:

```bash
npx supabase db query --linked --file supabase/demo-data.sql
```

Never run this file against a personal or customer workspace.

## Rotate credentials or remove starter data

When a key or secret may have leaked:

1. Rotate it in Supabase, Resend, or Vercel first.
2. Replace the corresponding environment value in every intended scope.
3. Redeploy affected Supabase Functions and the Vercel project.
4. Revoke active application sessions when the incident affects authentication.
5. Confirm the old value no longer works.

Remove starter records through the application where possible so audit and trash behavior remains testable. For a disposable project, export anything you need before deleting it. Never run a linked database reset against production.
