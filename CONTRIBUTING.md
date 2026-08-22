# Contributing to Kithwork

Thanks for taking the time to work on Kithwork. I want contributions to stay useful, reviewable, and easy to verify.

## Before you start

Check the open issues before doing a large change. If the idea changes how Kithwork works, open an issue and explain the problem first. A small bug fix, typo, test improvement, or documentation correction can go straight into a pull request.

Please don't include real customer records, personal credentials, generated `.env` files, or screenshots containing private data. Sample records must be obviously fictional.

## Set up your fork

```bash
git clone https://github.com/your-name/kithwork.git
cd kithwork
npm install
npm test
npm run typecheck
npm run build
```

Create a branch in your fork. The upstream Kithwork repository keeps `main` as its only long-lived branch.

For the complete Supabase and Cloudflare path, follow [docs/SETUP.md](docs/SETUP.md). Use projects and credentials that you own.

## Keep the change focused

- Explain the problem your pull request solves.
- Add or update tests when behavior changes.
- Keep unrelated formatting and refactors out of the same pull request.
- Update the setup guide when configuration changes.
- Run `npm test`, `npm run typecheck`, and `npm run build` before submitting.

Kithwork uses `AGPL-3.0-or-later`. By contributing, you agree that your contribution can be distributed under that licence.

## Pull requests

Write a clear title and a short description of what changed, why it changed, and how you checked it. Screenshots are useful for visible UI work, but remove private data first.

I may ask for a smaller change or a test before merging. That's about keeping the project maintainable, not making contribution harder than it needs to be.
