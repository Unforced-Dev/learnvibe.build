-- Prevent duplicate enrollments for the same user in the same cohort.
-- Without this, a race between the Stripe webhook and the /payment/success
-- handler could insert two enrollment rows.
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_user_cohort_unique
  ON enrollments (user_id, cohort_id);

-- Prevent duplicate memberships of the same type for the same user.
CREATE UNIQUE INDEX IF NOT EXISTS memberships_user_type_unique
  ON memberships (user_id, type);

-- Speed up payment lookups by applicationId (we query for existing
-- pending payments on every checkout click).
CREATE INDEX IF NOT EXISTS payments_application_id
  ON payments (application_id);
