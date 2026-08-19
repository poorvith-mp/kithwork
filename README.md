# Kithwork

Kithwork is an open-source workspace for relationships, projects, and follow-through. I built it for the work that falls between a contacts list and a heavy business suite: people, opportunities, delivery, tasks, conversations, and the next action that shouldn't get lost.

[Frontend preview](https://crm-one-ebon-60.vercel.app/) · [Setup guide](docs/SETUP.md) · [Source](https://github.com/poorvith-mp/kithwork) · [Licence](LICENSE)

The public preview is deliberately read-only. Its companies, people, projects, and tasks are fictional frontend data. There is no hosted Kithwork database, account, or service behind it.

## What works now

- Password authentication with required TOTP authenticator verification.
- One workspace owner plus invited collaborators with module permissions and record assignments.
- People, companies, enquiries, opportunities, projects, milestones, tasks, dependencies, recurrence, time entries, and files.
- Scheduling, reminders, reports, notifications, audit history, profile controls, session controls, and 30-day trash recovery.
- Optional outbound email and campaigns through the operator's own Resend account.
- Supabase Row Level Security on the application tables, with AAL2 checks around protected access.

Payments are not implemented. Public website intake, inbound email webhooks, and website deployment controls are not bundled. The default Vercel cron runs once per day so it works on Hobby; Pro operators can change it to a shorter supported interval.

Without the three required `VITE_` variables, Kithwork shows the same read-only preview as the public deployment and never creates a Supabase client. Add your own Supabase and Vercel configuration to load the complete authenticated application.

## Your infrastructure, not mine

Each Kithwork installation uses its own Supabase and Vercel projects. No default value connects to my database, users, email account, or deployment.

One deployment represents one workspace. The first Auth user becomes its owner. Later users must be invited by that owner and receive explicit permissions. If you need separate customers or organisations, deploy separate projects or extend the tenancy model before using it in production.

Start with the [complete setup guide](docs/SETUP.md). It covers the database migrations, Auth settings, MFA, Edge Functions, environment variables, Vercel deployment, optional Resend setup, and the checks to run before storing real data.

## Local application checks

```bash
npm install
npm test
npm run typecheck
npm run build
```

Use Node.js 22 or newer. Copy `.env.example` to `.env.local` only after creating your own Supabase project. Never commit `.env.local`.

## Contributing

If you want to fix something or make Kithwork more useful, read [CONTRIBUTING.md](CONTRIBUTING.md) first. Keep discussions respectful and practical; the project rules are in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licence

Kithwork is licensed under the [GNU Affero General Public License v3 or later](LICENSE). You can self-host, modify, and use it commercially under that licence's conditions.

If you modify Kithwork and let people use that modified version over a network, you must offer those users the corresponding source as required by the AGPL. The Source links in the application are there for that reason too.

Set the optional `VITE_SOURCE_REPOSITORY_URL` variable in a modified deployment so those links point to your corresponding source. Unmodified installs default to this repository.

## Author

I'm Poorvith M P. You can find me on [GitHub](https://github.com/poorvith-mp), [LinkedIn](https://linkedin.com/in/poorvithmp), and [X](https://x.com/poorvith_mp).
