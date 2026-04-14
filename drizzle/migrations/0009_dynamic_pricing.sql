-- Add dynamic custom-amount column to applications.
-- Nullable: existing approvals keep their tier-based amount (backward compat).
ALTER TABLE applications ADD COLUMN approved_amount_cents INTEGER;
