-- Pay-what-you-can during application.
-- Applicant indicates what they can contribute + optional reasoning.
-- Admin sees this alongside the review and can approve at the requested amount
-- (or override via the existing approvedAmountCents path).
-- Both nullable for backward compat with existing applications.
ALTER TABLE applications ADD COLUMN requested_amount_cents INTEGER;
ALTER TABLE applications ADD COLUMN requested_amount_reason TEXT;
