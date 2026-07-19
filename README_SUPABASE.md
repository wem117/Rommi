# Roomi Supabase Setup

## Environment

Create or update `.env.local` with placeholders like these:

```env
NEXT_PUBLIC_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=roommate-assets
NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO=http://localhost:3000/api/auth/callback
NEXT_PUBLIC_SUPPORT_EMAIL=support@example.com
```

## Auth: redirect URLs, Google sign-in & password reset

Google sign-in and password reset both round-trip through
`/api/auth/callback` (which exchanges the `code` for a session) and, for
recovery, then forwards to `/reset-password`. For these to work you MUST
configure the Supabase dashboard — these are **not** code settings:

**Auth → URL Configuration**
- **Site URL**: your deployed origin (e.g. `https://roomi.kz`), or
  `http://localhost:3000` for local dev.
- **Redirect URLs** (add every environment you use):
  - `http://localhost:3000/api/auth/callback`
  - `http://localhost:3000/reset-password`
  - `https://YOUR-DOMAIN/api/auth/callback`
  - `https://YOUR-DOMAIN/reset-password`

If the redirect URL isn't allow-listed, `resetPasswordForEmail` /
`signInWithOAuth` fail — the app now surfaces this as
"This link's redirect URL isn't allowed."

**Auth → Providers → Google**: enable Google, paste the OAuth client
ID/secret from Google Cloud Console, and add
`https://YOUR-PROJECT.supabase.co/auth/v1/callback` as an authorized
redirect URI in Google Cloud Console.

**Password-reset email delivery (common root cause of "couldn't send"):**
Supabase's built-in email is heavily rate-limited and, on the free tier,
only delivers to project members. For real users you MUST configure custom
SMTP under **Auth → Emails → SMTP Settings** (SendGrid, Resend, Mailgun,
Amazon SES, …). Without it, `resetPasswordForEmail` returns
"Error sending recovery email", which the app now surfaces as
"We couldn't send the email. Email delivery may not be configured yet."
Also verify the **Reset Password** email template's action URL uses
`{{ .ConfirmationURL }}`.

```env
# Optional: point address autocomplete at a paid/self-hosted geocoder for
# production scale (defaults to the rate-limited public Nominatim endpoint).
NEXT_PUBLIC_GEOCODER_URL=https://nominatim.openstreetmap.org