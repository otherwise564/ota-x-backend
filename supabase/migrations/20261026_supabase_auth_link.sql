-- OTA X: prepare existing profiles for Supabase Auth.
-- Draft only: review before applying to the database.
-- Existing integer user IDs and social relationships remain unchanged.

ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "supabaseAuthId" uuid;

CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseAuthId_key"
  ON public."User" ("supabaseAuthId");

ALTER TABLE public."User"
  ALTER COLUMN "password" DROP NOT NULL;
