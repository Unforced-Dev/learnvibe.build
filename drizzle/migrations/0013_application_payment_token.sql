-- Random token stored per application, included as ?t= in the approval
-- email's payment link. Required on /payment/checkout/:id so strangers
-- can't initiate a Stripe session by guessing a sequential application id.
ALTER TABLE applications ADD COLUMN payment_token TEXT;

-- Generate tokens for existing approved/enrolled applications so their
-- links keep working. SQLite doesn't have a random-bytes function; the
-- admin can regenerate these on demand if needed, but this keeps a
-- placeholder so NOT NULL migrations aren't required.
UPDATE applications
  SET payment_token = lower(hex(randomblob(16)))
  WHERE payment_token IS NULL AND status IN ('approved', 'enrolled');
