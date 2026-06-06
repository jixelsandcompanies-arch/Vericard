# VeriCard Supabase and Vercel Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `database/supabase-schema.sql`.
3. Copy `.env.example` to `.env`.
4. Fill these values in `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
   - `ADMIN_USER`
   - `ADMIN_PASSWORD`
   - `ADMIN_EMAIL`
   - `EXPOSE_RESET_CODES` only set to `true` for local/demo testing
5. Install and start:

```bash
npm install
npm start
```

The app will run at `http://localhost:3000`.

Open:

- `http://localhost:3000/portal.html` for the organization portal.
- `http://localhost:3000/admin` for Super Admin.

Use the Supabase service-role key only on the server. Do not put it inside browser JavaScript.

## Vercel Hosting

This project is now Vercel-ready.

1. Push/import the project to Vercel.
2. In Vercel project settings, add these Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
   - `ADMIN_USER`
   - `ADMIN_PASSWORD`
   - `ADMIN_EMAIL`
3. Deploy.

Vercel uses:

- `api/index.js` as the serverless entry.
- `vercel.json` to route portal, admin, gate scanner, and API requests through the Express app.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in browser code. Keep it only in Vercel environment variables.

Password reset codes are not returned by the API unless `EXPOSE_RESET_CODES=true`. Keep that disabled in production and use your configured delivery channel or admin database access to retrieve reset codes.
