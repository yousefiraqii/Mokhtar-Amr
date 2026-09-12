-- Add ATS-CV intelligence columns to certificates table.
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor).

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS issuer        text,
  ADD COLUMN IF NOT EXISTS issue_date    text,
  ADD COLUMN IF NOT EXISTS credential_id text,
  ADD COLUMN IF NOT EXISTS category      text,
  ADD COLUMN IF NOT EXISTS achievement   text,
  ADD COLUMN IF NOT EXISTS skills        text[];