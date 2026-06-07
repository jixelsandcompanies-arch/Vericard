# Database Schema

`database/supabase-schema.sql` is the canonical schema used by this repo. The root `supabase-schema.sql` is kept for older setup notes, and `supabase/migrations/20260607000000_initial_schema.sql` mirrors the same schema for Supabase CLI workflows.

When changing tables, update the canonical schema and add a new migration file so deployed databases can be advanced safely.
