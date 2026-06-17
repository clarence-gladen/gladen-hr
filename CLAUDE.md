@AGENTS.md

# Gladen HR — Project Guide for Claude

## Deployment
- **Live on Vercel** — pushing to `main` on GitHub auto-deploys to production.
- Always `git add`, `git commit`, and `git push origin main` after code changes.
- Local dev server (`npm run dev`) is for testing only; users see the Vercel build.
- If the dev server is stale, kill it with `pkill -f "next dev"` and restart.

## Stack
- Next.js 16 App Router, TypeScript, Tailwind CSS
- Supabase (Postgres + Auth + RPC) hosted at `pbdtmillgkkdotqugfqq.supabase.co`
- Auth: OTP via SMS (Twilio). Phone stored in `auth.users.phone` **without** `+` prefix (e.g. `6593833523`)
- Deployed via Vercel; GitHub repo: `clarence-gladen/gladen-hr`

## Phone Number Format Rules
All phone numbers in this system are Singapore (+65) numbers. Format conventions:

| Location | Format | Example |
|---|---|---|
| `employees.mobile_number` | no `+`, with `65` prefix | `6587685091` |
| `auth.users.phone` | no `+`, with `65` prefix | `6587685091` |
| `pending_manager_phones.phone` | no `+`, with `65` prefix | `6581219398` |
| Login `normalizePhone()` sends | with `+` prefix | `+6587685091` |
| `setUserRoleAction` sends | no `+`, with `65` prefix | `6587685091` |

All SQL RPCs must use `ltrim(p_phone, '+')` to strip the `+` before comparing.

## Database — Key Patterns

### Server Actions
- All server actions called via `useTransition` must return `{ error?: string }`, never throw.
- **Never call `revalidatePath` in actions invoked programmatically** (causes Next.js render error). Use `router.refresh()` on the client instead.
- Form-based `useActionState` actions can use `revalidatePath` safely.
- For programmatic calls from buttons/handlers, call the server action directly inside `startTransition(async () => { ... })` and call `router.refresh()` on success.

### Supabase SQL Editor Limits
- The SQL editor has a character limit. For long functions, **run each `CREATE OR REPLACE FUNCTION` as a separate query**.
- Use `$$` as the dollar-quote delimiter (not `$func$`).
- Cannot change return type of existing function — must `DROP FUNCTION` first.

### Enums
- `profiles.role` is type `user_role` (enum). Always cast: `p_role::user_role`.
- `approval_status` includes: `pending`, `approved`, `rejected`, `cancelled`.

### Manager Access Flow
- `set_user_role(p_phone, p_role)` — grants/revokes manager role. If user not in `auth.users`, adds to `pending_manager_phones` whitelist and returns `'pending'`.
- `remove_manager_access(p_user_id uuid, p_phone text)` — uses UUID directly (avoids phone format issues). For pending entries (null UUID), deletes from `pending_manager_phones`.
- `get_manager_phones()` returns `(phone, user_id, status)` — status is `'active'` or `'pending'`.
- `check_employee_phone(p_phone)` — called at login to validate number. Checks employees, auth.users, and pending_manager_phones.
- `handle_new_user()` trigger — fires on new auth.users INSERT, checks whitelist and sets role to `manager` if found.

### Leave System
- `countWorkingDays(start, end, workDays: 5|6)` — 6-day workers skip only Sunday; 5-day workers skip Sat+Sun.
- `work_days_per_week` column on `employees` table (5 or 6, default 5).
- Leave balance RPCs: `approve_leave_request`, `reject_leave_request`, `cancel_leave_request`, `edit_approved_leave_request`.

## iOS PWA Status Bar (Critical)

The app uses `statusBarStyle: "black-translucent"` + `viewportFit: "cover"`. This makes the status bar transparent — the page content shows through it.

**Rule: every page's topmost element must be `sticky top-0 z-10 bg-brand` (or `fixed`).** iOS determines status bar color from the topmost **z-indexed positioned** element. A plain `static` div at y=0 loses to the body background (`#f7f8fb`) and the status bar appears white.

- Inner pages use `<Header>` which is `sticky top-0 z-10 bg-brand` ✓
- Home page dashboard uses a custom blue div — it must also be `sticky top-0 z-10 bg-brand` ✓
- Setting `bg-brand` on `<html>` does NOT help — iOS uses the body background, not html, for the safe-area zone
- A `position:fixed height:env(safe-area-inset-top)` overlay is unreliable; sticky is the proven pattern

## Assets
- Logo files in `public/images/`: `logo-full.png` (full logo with subtitle), `logo-blue.png` (icon only), `logo-white.png`, `logo-on-blue.png`
- Full logo source: `/Users/Clarence/Desktop/Gladen/Website Stuff and Logo/Gladen-Full Logo Blue words no background.png`

## Pre-Go-Live Checklist
- Remove Supabase test number `+6597867966` (pin `123456`) before real employees use the app
- Upgrade Twilio from trial to paid account
