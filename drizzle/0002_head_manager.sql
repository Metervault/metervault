ALTER TYPE org_role ADD VALUE IF NOT EXISTS 'head';

ALTER TABLE users ADD COLUMN IF NOT EXISTS removed_at timestamptz;
